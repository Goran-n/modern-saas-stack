import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { categorizeFile } from '../../../src/tasks/files/categorize-file';
import { setupTestDatabase, createTestFixtures } from '@figgy/shared-db/test-helpers';
import { MockStorageClient } from '@figgy/supabase-storage/test-helpers';
import { documentExtractions, files as filesTable, eq } from '@figgy/shared-db';

// Mock the trigger.dev SDK
vi.mock('@trigger.dev/sdk/v3', () => ({
  schemaTask: (config: any) => config.run,
  tasks: {
    trigger: vi.fn(),
  },
}));

// Mock the document extractor
vi.mock('../../../src/lib/document-extraction/extractor', () => ({
  DocumentExtractor: vi.fn().mockImplementation(() => ({
    extractDocument: vi.fn(),
  })),
}));

describe('categorize-file task', () => {
  let db: any;
  let storage: MockStorageClient;
  let testFixtures: any;

  beforeEach(async () => {
    const testDb = await setupTestDatabase();
    db = testDb.db;
    storage = new MockStorageClient();
    testFixtures = await createTestFixtures(db);
  });

  afterEach(async () => {
    await db.cleanup();
    vi.clearAllMocks();
  });

  describe('failure scenarios', () => {
    it('should move file to dead letter queue after max retries', async () => {
      // Create a file with 2 previous retry attempts
      const [file] = await db.insert(filesTable).values({
        tenantId: testFixtures.tenantId,
        uploadedBy: testFixtures.userId,
        fileName: 'invoice.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        bucket: 'vault',
        pathTokens: ['invoices', 'invoice.pdf'],
        processingStatus: 'failed',
        metadata: { retryCount: 2 },
        source: 'user_upload',
      }).returning();

      // Mock extractor to fail
      const { DocumentExtractor } = await import('../../../src/lib/document-extraction/extractor');
      const mockExtractor = new DocumentExtractor();
      mockExtractor.extractDocument = vi.fn().mockRejectedValue(new Error('Extraction failed'));

      // Run the task (this would be the 3rd attempt)
      await expect(
        categorizeFile({
          fileId: file.id,
          tenantId: testFixtures.tenantId,
          mimeType: 'application/pdf',
          source: 'user_upload',
        })
      ).rejects.toThrow('Extraction failed');

      // Verify file moved to dead letter
      const [updatedFile] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, file.id));

      expect(updatedFile.processingStatus).toBe('dead_letter');
      expect(updatedFile.metadata.retryCount).toBe(3);
      expect(updatedFile.metadata.error).toBe('categorization_failed');
      expect(updatedFile.metadata.finalFailureAt).toBeDefined();
    });

    it('should handle storage unavailability gracefully', async () => {
      const [file] = await db.insert(filesTable).values({
        tenantId: testFixtures.tenantId,
        uploadedBy: testFixtures.userId,
        fileName: 'invoice.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        bucket: 'vault',
        pathTokens: ['invoices', 'invoice.pdf'],
        processingStatus: 'pending',
        source: 'user_upload',
      }).returning();

      // Mock storage to fail
      storage.signedUrl = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Storage unavailable'),
      });

      await expect(
        categorizeFile({
          fileId: file.id,
          tenantId: testFixtures.tenantId,
          mimeType: 'application/pdf',
          source: 'user_upload',
        })
      ).rejects.toThrow('Failed to generate signed URL');

      // Verify file marked as failed
      const [updatedFile] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, file.id));

      expect(updatedFile.processingStatus).toBe('failed');
      expect(updatedFile.metadata.retryCount).toBe(1);
    });

    it('should skip supplier processing when ownership validation fails', async () => {
      const [file] = await db.insert(filesTable).values({
        tenantId: testFixtures.tenantId,
        uploadedBy: testFixtures.userId,
        fileName: 'external-invoice.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        bucket: 'vault',
        pathTokens: ['invoices', 'external-invoice.pdf'],
        processingStatus: 'pending',
        source: 'user_upload',
      }).returning();

      // Mock successful extraction
      const { DocumentExtractor } = await import('../../../src/lib/document-extraction/extractor');
      const mockExtractor = new DocumentExtractor();
      mockExtractor.extractDocument = vi.fn().mockResolvedValue({
        documentType: 'invoice',
        documentTypeConfidence: 0.95,
        fields: {
          invoiceNumber: { value: 'INV-123', confidence: 0.9 },
          vendorName: { value: 'External Vendor', confidence: 0.9 },
          // This company name won't match tenant's company
          companyName: { value: 'Other Company Ltd', confidence: 0.9 },
        },
        overallConfidence: 0.9,
        validationStatus: 'valid',
      });

      // Mock ownership validation to fail
      vi.mock('../../../src/lib/document-extraction/validators', () => ({
        validateInvoiceOwnership: vi.fn().mockResolvedValue({
          belongsToTenant: false,
          confidence: 0.9,
          matchType: 'no_match',
          reasoning: 'Invoice belongs to different company',
          requiresReview: true,
        }),
      }));

      const { tasks } = await import('@trigger.dev/sdk/v3');
      
      await categorizeFile({
        fileId: file.id,
        tenantId: testFixtures.tenantId,
        mimeType: 'application/pdf',
        source: 'user_upload',
      });

      // Verify supplier processing was NOT triggered
      expect(tasks.trigger).not.toHaveBeenCalledWith(
        'process-invoice-supplier',
        expect.any(Object)
      );

      // Verify extraction marked for review
      const [extraction] = await db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.fileId, file.id));

      expect(extraction.requiresReview).toBe(true);
      expect(extraction.reviewReason).toContain('Ownership validation');
    });
  });

  describe('success scenarios', () => {
    it('should process invoice and trigger supplier matching', async () => {
      const [file] = await db.insert(filesTable).values({
        tenantId: testFixtures.tenantId,
        uploadedBy: testFixtures.userId,
        fileName: 'valid-invoice.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        bucket: 'vault',
        pathTokens: ['invoices', 'valid-invoice.pdf'],
        processingStatus: 'pending',
        source: 'user_upload',
      }).returning();

      // Mock successful extraction
      const { DocumentExtractor } = await import('../../../src/lib/document-extraction/extractor');
      const mockExtractor = new DocumentExtractor();
      mockExtractor.extractDocument = vi.fn().mockResolvedValue({
        documentType: 'invoice',
        documentTypeConfidence: 0.95,
        fields: {
          invoiceNumber: { value: 'INV-123', confidence: 0.9 },
          vendorName: { value: 'Acme Corp', confidence: 0.9 },
          amount: { value: 1500.00, confidence: 0.95 },
        },
        overallConfidence: 0.92,
        validationStatus: 'valid',
        processingDuration: 1500,
      });

      const { tasks } = await import('@trigger.dev/sdk/v3');

      const result = await categorizeFile({
        fileId: file.id,
        tenantId: testFixtures.tenantId,
        mimeType: 'application/pdf',
        source: 'user_upload',
      });

      expect(result.status).toBe('completed');
      expect(result.category).toBe('invoice');

      // Verify supplier processing triggered
      expect(tasks.trigger).toHaveBeenCalledWith(
        'process-invoice-supplier',
        expect.objectContaining({
          tenantId: testFixtures.tenantId,
        }),
        expect.any(Object)
      );

      // Verify file updated correctly
      const [updatedFile] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, file.id));

      expect(updatedFile.processingStatus).toBe('completed');
      expect(updatedFile.metadata.category).toBe('invoice');
      expect(updatedFile.metadata.extractionConfidence).toBe(0.92);
    });
  });
});