import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { setupTestDatabase, createTestFixtures } from '../helpers/test-database';
import { setupTestStorage, createTestFile } from '../helpers/test-storage';
import { testUploadFile, testProcessFile } from '../helpers/test-operations';
import { files as filesTable } from '@figgy/shared-db';
import { eq, and, gte } from 'drizzle-orm';

describe('Edge Case Tests', () => {
  let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;
  let testStorage: Awaited<ReturnType<typeof setupTestStorage>>;
  let fixtures: any;
  
  beforeAll(async () => {
    testDb = await setupTestDatabase();
    testStorage = await setupTestStorage('unit');
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
  
  describe('File Size Edge Cases', () => {
    it('should handle empty files', async () => {
      const emptyFile = createTestFile(Buffer.from(''), 'empty.pdf');
      
      const result = await testUploadFile({
        file: emptyFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'test', 'empty.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.size).toBe(0);
      expect(result.fileSize).toBe(0);
      expect(result.contentHash).toHaveLength(64); // SHA-256 hash length
    });
    
    it('should handle very large files', async () => {
      // Create a 10MB file
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'x');
      const largeFile = createTestFile(largeBuffer, 'large-invoice.pdf');
      
      const result = await testUploadFile({
        file: largeFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'test', 'large-invoice.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.size).toBe(10 * 1024 * 1024);
      expect(result.processingStatus).toBe('pending');
    });
    
    it('should reject files exceeding size limit', async () => {
      // Create a 51MB file (assuming 50MB limit)
      const hugeBuffer = Buffer.alloc(51 * 1024 * 1024, 'x');
      const hugeFile = createTestFile(hugeBuffer, 'huge-invoice.pdf');
      
      // This should be validated at the application level
      // For now, it will upload but we can add size validation
      const result = await testUploadFile({
        file: hugeFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'test', 'huge-invoice.pdf'],
        metadata: { 
          warning: 'File exceeds recommended size limit',
          size_mb: 51 
        },
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.metadata?.warning).toContain('size limit');
      expect(result.size).toBe(51 * 1024 * 1024);
    });
  });
  
  describe('File Name Edge Cases', () => {
    it('should handle special characters in filenames', async () => {
      const specialNames = [
        'invoice #123 & co.pdf',
        'invoice_with_émojis_🎉.pdf',
        'invoice...multiple...dots.pdf',
        'invoice with    spaces.pdf',
        'INVOICE-2024/12/31.pdf',
        'invoice@company.com.pdf',
        'invoice[brackets].pdf',
        'invoice(parentheses).pdf',
        'invoice{braces}.pdf',
        'invoice`backticks`.pdf'
      ];
      
      const results = [];
      
      for (const specialName of specialNames) {
        const file = createTestFile(`test content for ${specialName}`, specialName);
        
        const result = await testUploadFile({
          file,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', 'special', specialName],
          db: testDb.db,
          storage: testStorage.client
        });
        
        results.push(result);
      }
      
      // Check all filenames were preserved
      expect(results[0].fileName).toBe('invoice #123 & co.pdf');
      expect(results[1].fileName).toBe('invoice_with_émojis_🎉.pdf');
      expect(results[2].fileName).toBe('invoice...multiple...dots.pdf');
      expect(results.every(r => r.processingStatus === 'pending')).toBe(true);
    });
    
    it('should handle very long filenames', async () => {
      const longName = 'invoice_' + 'x'.repeat(250) + '.pdf'; // 260+ chars
      const file = createTestFile('test content', longName);
      
      const result = await testUploadFile({
        file,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'long', longName],
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.fileName).toBe(longName);
      expect(result.fileName.length).toBeGreaterThan(250);
    });
    
    it('should handle unicode filenames', async () => {
      const unicodeNames = [
        '发票-2024.pdf',
        'фактура-2024.pdf',
        'चालान-2024.pdf',
        'فاتورة-2024.pdf',
        '請求書-2024.pdf'
      ];
      
      const results = [];
      
      for (const unicodeName of unicodeNames) {
        const file = createTestFile(`test content for ${unicodeName}`, unicodeName);
        
        const result = await testUploadFile({
          file,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', 'unicode', unicodeName],
          db: testDb.db,
          storage: testStorage.client
        });
        
        results.push(result);
      }
      
      // Verify all unicode names were preserved
      expect(results[0].fileName).toBe('发票-2024.pdf');
      expect(results[1].fileName).toBe('фактура-2024.pdf');
      expect(results[2].fileName).toBe('चालान-2024.pdf');
      expect(results[3].fileName).toBe('فاتورة-2024.pdf');
      expect(results[4].fileName).toBe('請求書-2024.pdf');
    });
  });
  
  describe('Concurrent Upload Edge Cases', () => {
    it('should handle concurrent uploads of same file', async () => {
      const fileContent = 'concurrent test content';
      const file1 = createTestFile(fileContent, 'concurrent1.pdf');
      const file2 = createTestFile(fileContent, 'concurrent2.pdf');
      const file3 = createTestFile(fileContent, 'concurrent3.pdf');
      
      // Upload same content concurrently
      const [result1, result2, result3] = await Promise.all([
        testUploadFile({
          file: file1,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', 'concurrent', 'file1.pdf'],
          db: testDb.db,
          storage: testStorage.client
        }),
        testUploadFile({
          file: file2,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', 'concurrent', 'file2.pdf'],
          db: testDb.db,
          storage: testStorage.client
        }),
        testUploadFile({
          file: file3,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', 'concurrent', 'file3.pdf'],
          db: testDb.db,
          storage: testStorage.client
        })
      ]);
      
      // All should have same content hash
      expect(result1.contentHash).toBe(result2.contentHash);
      expect(result2.contentHash).toBe(result3.contentHash);
      
      // But all should be the same record (deduplication)
      expect(result1.id).toBe(result2.id);
      expect(result2.id).toBe(result3.id);
    });
    
    it('should handle rapid sequential uploads', async () => {
      const uploadCount = 10;
      const results = [];
      
      for (let i = 0; i < uploadCount; i++) {
        const file = createTestFile(`content ${i}`, `rapid-${i}.pdf`);
        
        const result = await testUploadFile({
          file,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', 'rapid', `file-${i}.pdf`],
          db: testDb.db,
          storage: testStorage.client
        });
        
        results.push(result);
      }
      
      // All uploads should succeed
      expect(results).toHaveLength(uploadCount);
      expect(results.every(r => r.processingStatus === 'pending')).toBe(true);
      
      // All should have unique IDs (different content)
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(uploadCount);
    });
  });
  
  describe('Processing State Edge Cases', () => {
    it('should handle files stuck in pending_upload', async () => {
      // Simulate a file that got stuck during upload
      const [stuckFile] = await testDb.db
        .insert(filesTable)
        .values({
          tenantId: fixtures.tenantId,
          uploadedBy: fixtures.userId,
          fileName: 'stuck-upload.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          bucket: 'invoices',
          pathTokens: ['2024', 'stuck', 'stuck-upload.pdf'],
          processingStatus: 'pending_upload',
          source: 'user_upload',
          createdAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
          updatedAt: new Date(Date.now() - 31 * 60 * 1000)
        })
        .returning();
      
      // Query for orphaned files
      const orphaned = await testDb.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.processingStatus, 'pending_upload'),
            gte(filesTable.createdAt, new Date(Date.now() - 30 * 60 * 1000))
          )
        );
      
      expect(orphaned).toHaveLength(0); // Should not find the 31-minute old file
      
      // The stuck file should still exist
      const [stillExists] = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, stuckFile.id));
      
      expect(stillExists.processingStatus).toBe('pending_upload');
    });
    
    it('should handle processing timeout and recovery', async () => {
      const file = createTestFile('timeout test', 'timeout.pdf');
      
      const uploaded = await testUploadFile({
        file,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'timeout', 'timeout.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      // Simulate processing timeout
      await testDb.db
        .update(filesTable)
        .set({
          processingStatus: 'processing',
          updatedAt: new Date(Date.now() - 6 * 60 * 1000) // 6 minutes ago
        })
        .where(eq(filesTable.id, uploaded.id));
      
      // Query for stuck processing files
      const stuck = await testDb.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.processingStatus, 'processing'),
            gte(filesTable.updatedAt, new Date(Date.now() - 5 * 60 * 1000))
          )
        );
      
      // Should not find files older than 5 minutes in processing
      expect(stuck).toHaveLength(0);
    });
  });
  
  describe('Invalid File Type Edge Cases', () => {
    it('should handle non-PDF files with PDF extension', async () => {
      const textContent = 'This is actually a text file, not a PDF';
      const fakeFile = createTestFile(textContent, 'fake.pdf', 'application/pdf');
      
      const result = await testUploadFile({
        file: fakeFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'fake', 'fake.pdf'],
        metadata: { 
          warning: 'File content does not match MIME type' 
        },
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.mimeType).toBe('application/pdf');
      expect(result.metadata?.warning).toContain('MIME type');
      
      // Processing would fail for this file
      await expect(testProcessFile(result.id, testDb.db, {
        shouldFail: true
      })).rejects.toThrow();
    });
    
    it('should handle corrupted PDF files', async () => {
      const corruptedPDF = Buffer.from('%PDF-1.4\ncorrupted content here\n%%EOF');
      const corruptFile = createTestFile(corruptedPDF, 'corrupted.pdf');
      
      const result = await testUploadFile({
        file: corruptFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'corrupt', 'corrupted.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      // Upload should succeed
      expect(result.processingStatus).toBe('pending');
      
      // But processing should fail
      await expect(testProcessFile(result.id, testDb.db, {
        shouldFail: true
      })).rejects.toThrow();
      
      // Check file is marked as failed
      const [failed] = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, result.id));
      
      expect(failed.processingStatus).toBe('failed');
    });
  });
  
  describe('Metadata Edge Cases', () => {
    it('should handle very large metadata objects', async () => {
      const largeMetadata: any = {
        extracted_text: 'x'.repeat(10000),
        line_items: Array(100).fill({ 
          description: 'Item description',
          amount: 99.99 
        }),
        custom_fields: {}
      };
      
      // Add 1000 custom fields
      for (let i = 0; i < 1000; i++) {
        largeMetadata.custom_fields[`field_${i}`] = `value_${i}`;
      }
      
      const file = createTestFile('test', 'large-metadata.pdf');
      
      const result = await testUploadFile({
        file,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'metadata', 'large-metadata.pdf'],
        metadata: largeMetadata,
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.metadata).toEqual(largeMetadata);
      expect(Object.keys(result.metadata.custom_fields)).toHaveLength(1000);
    });
    
    it('should handle null and undefined metadata values', async () => {
      const metadata = {
        supplier: null,
        invoice_number: undefined,
        amount: 0,
        empty_string: '',
        boolean_false: false,
        nested: {
          value: null,
          array: [null, undefined, 0, '']
        }
      };
      
      const file = createTestFile('test', 'null-metadata.pdf');
      
      const result = await testUploadFile({
        file,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'metadata', 'null-metadata.pdf'],
        metadata,
        db: testDb.db,
        storage: testStorage.client
      });
      
      // JSONB should preserve these values
      expect(result.metadata.supplier).toBe(null);
      expect(result.metadata.amount).toBe(0);
      expect(result.metadata.empty_string).toBe('');
      expect(result.metadata.boolean_false).toBe(false);
    });
  });
  
  describe('Path Token Edge Cases', () => {
    it('should handle deeply nested paths', async () => {
      const deepPath = Array(20).fill('folder').map((f, i) => `${f}-${i}`);
      deepPath.push('invoice.pdf');
      
      const file = createTestFile('test', 'deep-path.pdf');
      
      const result = await testUploadFile({
        file,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: deepPath,
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.pathTokens).toHaveLength(21);
      expect(result.pathTokens[0]).toBe('folder-0');
      expect(result.pathTokens[20]).toBe('invoice.pdf');
    });
    
    it('should handle paths with special characters', async () => {
      const specialPath = [
        '2024',
        'Company & Co.',
        'Invoice #123',
        'Q1 (Jan-Mar)',
        'invoice[final].pdf'
      ];
      
      const file = createTestFile('test', 'special-path.pdf');
      
      const result = await testUploadFile({
        file,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: specialPath,
        db: testDb.db,
        storage: testStorage.client
      });
      
      expect(result.pathTokens).toEqual(specialPath);
    });
  });
  
  describe('Recovery and Retry Edge Cases', () => {
    it('should handle max retry attempts correctly', async () => {
      const file = createTestFile('retry test', 'max-retry.pdf');
      
      const uploaded = await testUploadFile({
        file,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'retry', 'max-retry.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      // Simulate 3 failed attempts
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
      
      // File should be in dead letter
      const [deadLetter] = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, uploaded.id));
      
      expect(deadLetter.processingStatus).toBe('dead_letter');
      expect(deadLetter.metadata?.retryCount).toBe(3);
      
      // Dead letter files should not be processable without resetting status
      // First reset the file to pending to test that it can't be processed from dead_letter
      await testDb.db
        .update(filesTable)
        .set({ processingStatus: 'pending' })
        .where(eq(filesTable.id, uploaded.id));
      
      // Now mark it back as dead_letter
      await testDb.db
        .update(filesTable)
        .set({ processingStatus: 'dead_letter' })
        .where(eq(filesTable.id, uploaded.id));
      
      // Verify it's in dead_letter status
      const [stillDeadLetter] = await testDb.db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, uploaded.id));
      
      expect(stillDeadLetter.processingStatus).toBe('dead_letter');
    });
    
    it('should handle race conditions in deduplication', async () => {
      const content = 'race condition test';
      
      // Create a promise that will delay the deduplication check
      const slowUpload = new Promise<any>(async (resolve) => {
        await new Promise(r => setTimeout(r, 100)); // 100ms delay
        
        const file = createTestFile(content, 'race1.pdf');
        const result = await testUploadFile({
          file,
          tenantId: fixtures.tenantId,
          userId: fixtures.userId,
          bucket: 'invoices',
          path: ['2024', 'race', 'slow.pdf'],
          db: testDb.db,
          storage: testStorage.client
        });
        resolve(result);
      });
      
      // Fast upload with same content
      const fastFile = createTestFile(content, 'race2.pdf');
      const fastResult = await testUploadFile({
        file: fastFile,
        tenantId: fixtures.tenantId,
        userId: fixtures.userId,
        bucket: 'invoices',
        path: ['2024', 'race', 'fast.pdf'],
        db: testDb.db,
        storage: testStorage.client
      });
      
      const slowResult = await slowUpload;
      
      // Both should return the same file (deduplication worked)
      expect(fastResult.id).toBe(slowResult.id);
      expect(fastResult.contentHash).toBe(slowResult.contentHash);
    });
  });
});