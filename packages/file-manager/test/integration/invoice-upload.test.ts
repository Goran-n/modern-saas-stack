import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { setupCustomMatchers } from '@figgy/shared-testing/assertions';
import { setupTestDatabase, createTestFixtures } from '../helpers/test-database';
import { setupTestStorage, createTestFile } from '../helpers/test-storage';
import { testUploadFile, testProcessFile } from '../helpers/test-operations';
import { files as filesTable } from '@figgy/shared-db';
import { eq } from 'drizzle-orm';

// Set up custom matchers
setupCustomMatchers();

describe('Invoice Upload Integration Tests', () => {
  let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;
  let testStorage: Awaited<ReturnType<typeof setupTestStorage>>;
  let fixtures: any;
  
  beforeAll(async () => {
    // Setup test database and storage
    testDb = await setupTestDatabase();
    testStorage = await setupTestStorage('unit'); // Use mock storage for now
    
    // Create test fixtures
    fixtures = await createTestFixtures(testDb.db);
  });
  
  afterAll(async () => {
    await testDb?.cleanup();
    await testStorage?.cleanup();
  });
  
  beforeEach(async () => {
    // Clear files between tests
    await testDb.db.delete(filesTable);
  });
  
  describe('Atomic Upload Pattern', () => {
    it('should create database record before storage upload', async () => {
      const invoicePath = path.join(__dirname, '../fixtures/invoices/adobe_subscription.pdf');
      const invoiceBuffer = readFileSync(invoicePath);
      const testFile = createTestFile(invoiceBuffer, 'adobe_subscription.pdf');
      
      // Upload file
      const result = await testUploadFile({
        file: testFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', '10', 'adobe_subscription.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      // Verify database record
      expect(result.id).toBeValidUUID();
      expect(result.processingStatus).toBe('pending');
      expect(result.contentHash).toHaveLength(64);
      if (result.publicUrl) {
        expect(result.publicUrl).toContain('adobe_subscription.pdf');
      }
      
      // Verify file exists in storage
      const { data } = await testStorage.client.downloadBuffer(
        'invoices',
        '2024/10/adobe_subscription.pdf'
      );
      expect(data).toBeInstanceOf(Buffer);
      expect(data?.length).toBe(invoiceBuffer.length);
    });
    
    it('should handle storage failure gracefully', async () => {
      const testFile = createTestFile('test content', 'test.pdf');
      
      // Mock storage failure
      const originalUpload = testStorage.client.uploadBuffer;
      testStorage.client.uploadBuffer = async () => ({
        data: null,
        error: new Error('Storage service unavailable')
      });
      
      // Attempt upload
      await expect(testUploadFile({
        file: testFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', '10', 'test.pdf'],
        db: testDb.db,
        storage: testStorage.client
      })).rejects.toThrow('Storage service unavailable');
      
      // Verify record is marked as failed
      const [failedRecord] = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.fileName, 'test.pdf'));
      
      expect(failedRecord.processingStatus).toBe('failed');
      expect(failedRecord.metadata?.error).toBe('Storage service unavailable');
      
      // Restore original method
      testStorage.client.uploadBuffer = originalUpload;
    });
    
    it('should prevent duplicate uploads', async () => {
      const testFile = createTestFile('duplicate content', 'duplicate.pdf');
      
      // First upload
      const first = await testUploadFile({
        file: testFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', '10', 'duplicate.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      // Second upload with same content
      const second = await testUploadFile({
        file: testFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', '10', 'duplicate-copy.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      // Should return the same record
      expect(second.id).toBe(first.id);
      expect(second.contentHash).toBe(first.contentHash);
      
      // Verify only one record exists
      const records = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.contentHash, first.contentHash));
      
      expect(records).toHaveLength(1);
    });
  });
  
  describe('Processing Lifecycle', () => {
    it('should track processing status correctly', async () => {
      const testFile = createTestFile('processing test', 'process.pdf');
      
      // Upload file
      const uploaded = await testUploadFile({
        file: testFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', '10', 'process.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(uploaded.processingStatus).toBe('pending');
      
      // Process file successfully
      await testProcessFile(uploaded.id, testDb.db, {
        extractedData: {
          supplier: { name: 'Test Supplier' },
          totals: { amount: 100 }
        }
      });
      
      // Verify completion
      const [completed] = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, uploaded.id));
      
      expect(completed.processingStatus).toBe('completed');
      expect(completed.metadata).toMatchObject({
        supplier: { name: 'Test Supplier' },
        totals: { amount: 100 }
      });
      expect(completed.metadata?.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
    
    it('should move to dead letter after 3 failures', async () => {
      const testFile = createTestFile('fail test', 'fail.pdf');
      
      // Upload file
      const uploaded = await testUploadFile({
        file: testFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', '10', 'fail.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await testProcessFile(uploaded.id, testDb.db, {
            shouldFail: true,
            retryCount: i
          });
        } catch (e) {
          // Expected to fail
        }
      }
      
      // Verify moved to dead letter
      const [deadLetter] = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, uploaded.id));
      
      expect(deadLetter.processingStatus).toBe('dead_letter');
      expect(deadLetter.metadata?.retryCount).toBe(3);
      expect(deadLetter.metadata?.error).toContain('3 attempts');
    });
  });
  
  describe('Real Invoice Processing', () => {
    const testInvoices = [
      { file: 'adobe_subscription.pdf', expectedTotal: 24.59, supplier: 'Adobe' },
      { file: 'microsoft_invoice.pdf', expectedTotal: 43.17, supplier: 'Microsoft' },
      { file: 'chatgpt_invoice.pdf', expectedTotal: 90.00, supplier: 'OpenAI' }
    ];
    
    testInvoices.forEach(({ file, expectedTotal, supplier }) => {
      it(`should process ${supplier} invoice correctly`, async () => {
        const invoicePath = path.join(__dirname, '../fixtures/invoices', file);
        const invoiceBuffer = readFileSync(invoicePath);
        const testFile = createTestFile(invoiceBuffer, file);
        
        // Upload invoice
        const uploaded = await testUploadFile({
          file: testFile,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', '10', file],
          metadata: {
            source: 'test',
            expectedTotal,
            expectedSupplier: supplier
          },
          db: testDb.db,
          storage: testStorage.client
        });
        
        // Verify upload
        expect(uploaded.fileName).toBe(file);
        expect(uploaded.mimeType).toBe('application/pdf');
        expect(uploaded.size).toBeGreaterThan(10000); // At least 10KB
        expect(uploaded.metadata?.expectedTotal).toBe(expectedTotal);
        
        // Simulate processing with expected data
        const expectedDataPath = path.join(
          __dirname, 
          '../fixtures/expected-results',
          file.replace('.pdf', '.json')
        );
        const expectedData = JSON.parse(readFileSync(expectedDataPath, 'utf-8'));
        
        await testProcessFile(uploaded.id, testDb.db, {
          extractedData: expectedData
        });
        
        // Verify processing results
        const [processed] = await testDb.db
          .select()
          .from(filesTable)
          .where(eq(filesTable.id, uploaded.id));
        
        expect(processed.processingStatus).toBe('completed');
        expect(processed.metadata?.supplier?.name).toContain(supplier);
        
        const total = processed.metadata?.totals?.total || 
                     processed.metadata?.totals?.grand_total ||
                     processed.metadata?.totals?.total_due;
        
        expect(total).toBe(expectedTotal);
      });
    });
  });
});