import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processInvoiceSupplier } from '../../../src/tasks/suppliers/process-invoice-supplier';
import { setupTestDatabase, createTestFixtures } from '@figgy/shared-db/test-helpers';
import { documentExtractions, files as filesTable, suppliers, eq } from '@figgy/shared-db';

// Mock the trigger.dev SDK
vi.mock('@trigger.dev/sdk/v3', () => ({
  task: (config: any) => config.run,
}));

// Mock the supplier ingestion service
vi.mock('@figgy/supplier', () => ({
  SupplierIngestionService: vi.fn().mockImplementation(() => ({
    ingest: vi.fn(),
  })),
  transformInvoiceToSupplier: vi.fn(),
  extractVendorDataWithConfidence: vi.fn(),
  CONFIDENCE_SCORES: {
    SUPPLIER_CREATED: 1.0,
    SUPPLIER_MATCHED: 0.9,
    LOW_MATCH: 0.5,
    NO_MATCH: 0.1,
    INSUFFICIENT_DATA: 0.0,
  },
  PROCESSING_NOTES: {
    SUPPLIER_CREATED: 'New supplier created',
    SUPPLIER_MATCHED: 'Matched to existing supplier',
    INSUFFICIENT_DATA: 'Insufficient data to process supplier',
    VALIDATION_FAILED: 'Supplier validation failed',
  },
}));

describe('process-invoice-supplier task', () => {
  let db: any;
  let testFixtures: any;

  beforeEach(async () => {
    const testDb = await setupTestDatabase();
    db = testDb.db;
    testFixtures = await createTestFixtures(db);
  });

  afterEach(async () => {
    await db.cleanup();
    vi.clearAllMocks();
  });

  describe('supplier matching scenarios', () => {
    it('should handle supplier creation failure gracefully', async () => {
      // Create document extraction
      const [extraction] = await db.insert(documentExtractions).values({
        fileId: 'test-file-id',
        documentType: 'invoice',
        documentTypeConfidence: '0.95',
        extractedFields: {
          vendorName: { value: 'New Vendor Ltd', confidence: 0.9 },
          vendorAddress: { value: '123 Main St', confidence: 0.8 },
        },
        overallConfidence: '0.9',
        validationStatus: 'valid',
      }).returning();

      // Mock supplier service to fail
      const { SupplierIngestionService, transformInvoiceToSupplier } = await import('@figgy/supplier');
      transformInvoiceToSupplier.mockReturnValue({
        name: 'New Vendor Ltd',
        tenantId: testFixtures.tenantId,
      });
      
      const mockService = new SupplierIngestionService();
      mockService.ingest = vi.fn().mockResolvedValue({
        success: false,
        error: 'Validation failed: Invalid tax number',
      });

      await expect(
        processInvoiceSupplier({
          documentExtractionId: extraction.id,
          tenantId: testFixtures.tenantId,
          userId: testFixtures.userId,
        })
      ).rejects.toThrow('Supplier processing failed: Validation failed');

      // Verify extraction updated with failure
      const [updatedExtraction] = await db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.id, extraction.id));

      expect(updatedExtraction.matchedSupplierId).toBeNull();
      expect(updatedExtraction.processingNotes).toContain('Validation failed');
    });

    it('should handle low confidence matches by skipping creation', async () => {
      const [extraction] = await db.insert(documentExtractions).values({
        fileId: 'test-file-id',
        documentType: 'invoice',
        documentTypeConfidence: '0.95',
        extractedFields: {
          vendorName: { value: 'Ambiguous Vendor', confidence: 0.4 },
        },
        overallConfidence: '0.6',
        validationStatus: 'valid',
      }).returning();

      const { SupplierIngestionService, transformInvoiceToSupplier } = await import('@figgy/supplier');
      transformInvoiceToSupplier.mockReturnValue({
        name: 'Ambiguous Vendor',
        tenantId: testFixtures.tenantId,
      });
      
      const mockService = new SupplierIngestionService();
      mockService.ingest = vi.fn().mockResolvedValue({
        success: true,
        action: 'skipped',
        reason: 'Low confidence match',
      });

      const result = await processInvoiceSupplier({
        documentExtractionId: extraction.id,
        tenantId: testFixtures.tenantId,
        userId: testFixtures.userId,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');

      // Verify extraction marked for review
      const [updatedExtraction] = await db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.id, extraction.id));

      expect(updatedExtraction.matchedSupplierId).toBeNull();
      expect(updatedExtraction.processingNotes).toContain('manual review');
    });

    it('should update file display name after successful supplier match', async () => {
      // Create a file
      const [file] = await db.insert(filesTable).values({
        tenantId: testFixtures.tenantId,
        uploadedBy: testFixtures.userId,
        fileName: 'invoice.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        bucket: 'vault',
        pathTokens: ['invoices', 'invoice.pdf'],
        processingStatus: 'completed',
        source: 'user_upload',
      }).returning();

      // Create extraction
      const [extraction] = await db.insert(documentExtractions).values({
        fileId: file.id,
        documentType: 'invoice',
        documentTypeConfidence: '0.95',
        extractedFields: {
          vendorName: { value: 'Acme Corp', confidence: 0.9 },
          invoiceNumber: { value: 'INV-2024-001', confidence: 0.95 },
          documentDate: { value: '2024-01-15', confidence: 0.9 },
        },
        overallConfidence: '0.92',
        validationStatus: 'valid',
      }).returning();

      // Create existing supplier
      const [supplier] = await db.insert(suppliers).values({
        tenantId: testFixtures.tenantId,
        normalizedName: 'acme-corp',
        displayName: 'Acme Corporation',
        metadata: {},
        createdBy: testFixtures.userId,
      }).returning();

      const { SupplierIngestionService, transformInvoiceToSupplier } = await import('@figgy/supplier');
      transformInvoiceToSupplier.mockReturnValue({
        name: 'Acme Corp',
        tenantId: testFixtures.tenantId,
      });
      
      const mockService = new SupplierIngestionService();
      mockService.ingest = vi.fn().mockResolvedValue({
        success: true,
        action: 'matched',
        supplierId: supplier.id,
      });

      const result = await processInvoiceSupplier({
        documentExtractionId: extraction.id,
        tenantId: testFixtures.tenantId,
        userId: testFixtures.userId,
      });

      expect(result.success).toBe(true);
      expect(result.supplierId).toBe(supplier.id);

      // Verify file display name updated
      const [updatedFile] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, file.id));

      expect(updatedFile.metadata.displayName).toContain('Acme Corporation');
      expect(updatedFile.metadata.displayName).toContain('2024-01-15');
      expect(updatedFile.metadata.displayName).toContain('INV-2024-001');
      expect(updatedFile.metadata.supplierName).toBe('Acme Corporation');
    });
  });

  describe('transaction safety', () => {
    it('should rollback all changes on transaction failure', async () => {
      const [extraction] = await db.insert(documentExtractions).values({
        fileId: 'test-file-id',
        documentType: 'invoice',
        documentTypeConfidence: '0.95',
        extractedFields: {
          vendorName: { value: 'Test Vendor', confidence: 0.9 },
        },
        overallConfidence: '0.9',
        validationStatus: 'valid',
      }).returning();

      // Mock a database error during transaction
      const originalUpdate = db.update;
      let updateCallCount = 0;
      db.update = vi.fn().mockImplementation((...args) => {
        updateCallCount++;
        if (updateCallCount === 2) {
          // Fail on second update (file update)
          throw new Error('Database connection lost');
        }
        return originalUpdate.apply(db, args);
      });

      await expect(
        processInvoiceSupplier({
          documentExtractionId: extraction.id,
          tenantId: testFixtures.tenantId,
          userId: testFixtures.userId,
        })
      ).rejects.toThrow();

      // Verify extraction not updated (transaction rolled back)
      const [unchangedExtraction] = await db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.id, extraction.id));

      expect(unchangedExtraction.matchedSupplierId).toBeNull();
      expect(unchangedExtraction.matchConfidence).toBeNull();
    });
  });
});