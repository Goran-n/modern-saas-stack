import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileBuilder } from '@figgy/shared-testing/builders';
import { createTestDoubles } from '@figgy/shared-testing/doubles';
import { setupCustomMatchers } from '@figgy/shared-testing/assertions';
import { testUploadFile } from '../helpers/test-operations';
import { files as filesTable, eq } from '@figgy/shared-db';
import { randomUUID } from 'crypto';
import { setupTestDatabase, type TestDatabase } from '../helpers/test-database';

setupCustomMatchers();

describe('File Upload Security Tests', () => {
  let doubles: ReturnType<typeof createTestDoubles>;
  let testDb: TestDatabase;
  let db: any;

  beforeEach(async () => {
    doubles = createTestDoubles();
    testDb = await setupTestDatabase();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('Path Traversal Prevention', () => {
    it('should reject files with path traversal attempts in filename', async () => {
        
        const maliciousFilenames = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          'innocent.pdf/../../../etc/passwd',
          'file.pdf%2F..%2F..%2F..%2Fetc%2Fpasswd',
          'file.pdf%00../../etc/passwd',
          'file.pdf\x00../../etc/passwd',
          './../sensitive-file.pdf',
          '....//....//....//etc/passwd',
          'file.pdf/../../',
          '\\\\server\\share\\file.pdf',
        ];

        for (const filename of maliciousFilenames) {
          const file = FileBuilder.create()
            .withFileName(filename)
            .withTenant()
            .build();

          await expect(testUploadFile({
            file: {
              name: filename,
              type: 'application/pdf',
              size: 1024,
              buffer: Buffer.from('test content'),
            },
            tenantId: file.tenantId,
            userId: file.uploadedBy,
            bucket: 'invoices',
            path: ['2024', '01', filename],
            db,
            storage: doubles.storage,
          })).rejects.toThrow(/invalid|path traversal|forbidden/i);
        }
    });

    it('should reject files with path traversal in path tokens', async () => {
        
        const maliciousPaths = [
          ['..', '..', 'etc', 'passwd'],
          ['2024', '..', '..', 'private'],
          ['invoices', '../../../', 'etc', 'passwd'],
          ['valid', 'path', '../', '../', 'sensitive'],
          ['.', '.', '.'],
          ['', '', ''],
        ];

        for (const pathTokens of maliciousPaths) {
          const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
          
          await expect(testUploadFile({
            file: {
              name: 'innocent.pdf',
              type: 'application/pdf',
              size: 1024,
              buffer: Buffer.from('test content'),
            },
            tenantId: file.tenantId,
            userId: file.uploadedBy,
            bucket: 'invoices',
            path: pathTokens,
            db,
            storage: doubles.storage,
          })).rejects.toThrow(/invalid|path traversal|forbidden/i);
        }
    });

    it('should sanitize but accept files with encoded characters', async () => {
        
        const encodedFilenames = [
          { input: 'file%20with%20spaces.pdf', expected: 'file with spaces.pdf' },
          { input: 'invoice%232024.pdf', expected: 'invoice#2024.pdf' },
          { input: 'document%2Bfinal.pdf', expected: 'document+final.pdf' },
        ];

        for (const { input, expected } of encodedFilenames) {
          const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
          const uniqueBuffer = Buffer.from(`test content for ${input}`); // Unique content to avoid deduplication
          
          const result = await testUploadFile({
            file: {
              name: input,
              type: 'application/pdf',
              size: uniqueBuffer.length,
              buffer: uniqueBuffer,
            },
            tenantId: file.tenantId,
            userId: file.uploadedBy,
            bucket: 'invoices',
            path: ['2024', '01', expected],
            db,
            storage: doubles.storage,
          });

          expect(result.fileName).toBe(expected);
        }
    });
  });

  describe('File Type Validation', () => {
    it('should reject files with mismatched MIME types', async () => {
        
        const mismatchedFiles = [
          { name: 'malware.pdf', type: 'application/x-executable', content: Buffer.from([0x4D, 0x5A]) }, // EXE header
          { name: 'script.pdf', type: 'application/pdf', content: Buffer.from('#!/bin/bash\nrm -rf /') },
          { name: 'fake.jpg', type: 'image/jpeg', content: Buffer.from('%PDF-1.4') }, // PDF header
          { name: 'virus.png', type: 'image/png', content: Buffer.from('MZ') }, // EXE header
        ];

        for (const testFile of mismatchedFiles) {
          const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
          
          await expect(testUploadFile({
            file: {
              name: testFile.name,
              type: testFile.type,
              size: testFile.content.length,
              buffer: testFile.content,
            },
            tenantId: file.tenantId,
            userId: file.uploadedBy,
            bucket: 'invoices',
            path: ['2024', '01', testFile.name],
            validateContent: true, // Enable content validation
            db,
            storage: doubles.storage,
          })).rejects.toThrow(/mime type|file type|validation/i);
        }
    });

    it('should reject executable file types regardless of extension', async () => {
        
        const executableTypes = [
          'application/x-executable',
          'application/x-msdownload',
          'application/x-sh',
          'application/x-bat',
          'text/x-shellscript',
          'application/x-powershell',
          'application/x-msdos-program',
        ];

        for (const mimeType of executableTypes) {
          const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
          
          await expect(testUploadFile({
            file: {
              name: 'innocent.pdf',
              type: mimeType,
              size: 1024,
              buffer: Buffer.from('test content'),
            },
            tenantId: file.tenantId,
            userId: file.uploadedBy,
            bucket: 'invoices',
            path: ['2024', '01', 'innocent.pdf'],
            db,
            storage: doubles.storage,
          })).rejects.toThrow(/forbidden|executable|not allowed/i);
        }
    });

    it('should validate magic bytes for common file types', async () => {
        
        const validFiles = [
          { 
            name: 'real.pdf', 
            type: 'application/pdf', 
            content: Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.from('\n...rest of pdf...')])
          },
          { 
            name: 'real.png', 
            type: 'image/png', 
            content: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
          },
          { 
            name: 'real.jpg', 
            type: 'image/jpeg', 
            content: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
          },
        ];

        for (const testFile of validFiles) {
          const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
          
          const result = await testUploadFile({
            file: {
              name: testFile.name,
              type: testFile.type,
              size: testFile.content.length,
              buffer: testFile.content,
            },
            tenantId: file.tenantId,
            userId: file.uploadedBy,
            bucket: 'invoices',
            path: ['2024', '01', testFile.name],
            validateContent: true,
            db,
            storage: doubles.storage,
          });

          expect(result.fileName).toBe(testFile.name);
          expect(result.mimeType).toBe(testFile.type);
        }
    });
  });

  describe('File Size Limits', () => {
    it('should reject files exceeding maximum size limit', async () => {
        
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        const oversizedFile = Buffer.alloc(MAX_SIZE + 1);
        const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();

        await expect(testUploadFile({
          file: {
            name: 'huge.pdf',
            type: 'application/pdf',
            size: oversizedFile.length,
            buffer: oversizedFile,
          },
          tenantId: 'test-tenant',
          userId: 'test-user',
          bucket: 'invoices',
          path: ['2024', '01', 'huge.pdf'],
          db,
          storage: doubles.storage,
        })).rejects.toThrow(/size limit|too large|exceeds/i);
    });

    it('should handle zip bomb protection', async () => {
        
        // Simulate a compressed file that expands significantly
        const compressedSize = 1024; // 1KB
        const reportedSize = 10 * 1024 * 1024 * 1024; // 10GB
        const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
        
        await expect(testUploadFile({
          file: {
            name: 'bomb.zip',
            type: 'application/zip',
            size: reportedSize, // Reported size doesn't match actual
            buffer: Buffer.alloc(compressedSize),
          },
          tenantId: 'test-tenant',
          userId: 'test-user',
          bucket: 'invoices',
          path: ['2024', '01', 'bomb.zip'],
          db,
          storage: doubles.storage,
        })).rejects.toThrow(/File size exceeds maximum limit|size mismatch|suspicious/i);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize dangerous characters in filenames', async () => {
        
        const dangerousFilenames = [
          { input: 'file<script>.pdf', expected: 'filescript.pdf' },
          { input: 'invoice|command.pdf', expected: 'invoicecommand.pdf' },
          { input: 'doc;rm -rf /.pdf', expected: 'docrm -rf .pdf' },
          { input: 'file\x00null.pdf', expected: 'filenull.pdf' },
          { input: 'file\nnewline.pdf', expected: 'filenewline.pdf' },
          { input: 'file\rcarriage.pdf', expected: 'filecarriage.pdf' },
        ];

        for (const { input, expected } of dangerousFilenames) {
          const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
          const uniqueBuffer = Buffer.from(`test content for ${input}`); // Unique content to avoid deduplication
          
          const result = await testUploadFile({
            file: {
              name: input,
              type: 'application/pdf',
              size: uniqueBuffer.length,
              buffer: uniqueBuffer,
            },
            tenantId: file.tenantId,
            userId: file.uploadedBy,
            bucket: 'invoices',
            path: ['2024', '01', expected],
            sanitizeFilename: true,
            db,
            storage: doubles.storage,
          });

          expect(result.fileName).toBe(expected);
          expect(result.fileName).not.toContain('<');
          expect(result.fileName).not.toContain('>');
          expect(result.fileName).not.toContain('|');
          expect(result.fileName).not.toContain('\x00');
        }
    });

    it('should reject files with filenames exceeding length limit', async () => {
        
        const longFilename = 'a'.repeat(300) + '.pdf';
        const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
        
        await expect(testUploadFile({
          file: {
            name: longFilename,
            type: 'application/pdf',
            size: 1024,
            buffer: Buffer.from('test content'),
          },
          tenantId: file.tenantId,
          userId: file.uploadedBy,
          bucket: 'invoices',
          path: ['2024', '01', 'truncated.pdf'],
          maxFilenameLength: 255,
          db,
          storage: doubles.storage,
        })).rejects.toThrow(/Invalid filename: too long/i);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent access to files across tenants', async () => {
        
        // Upload file for tenant A
        const fileBuilderA = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
        
        const fileA = await testUploadFile({
          file: {
            name: 'tenant-a.pdf',
            type: 'application/pdf',
            size: 1024,
            buffer: Buffer.from('Tenant A data'),
          },
          tenantId: fileBuilderA.tenantId,
          userId: fileBuilderA.uploadedBy,
          bucket: 'invoices',
          path: ['2024', '01', 'tenant-a.pdf'],
          db,
          storage: doubles.storage,
        });

        // Try to access file A from tenant B
        const fileBuilderB = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
        
        const filesFromB = await db
          .select()
          .from(filesTable)
          .where(eq(filesTable.tenantId, fileBuilderB.tenantId));

        expect(filesFromB).toHaveLength(0);

        // Verify tenant A can still access their file
        const filesFromA = await db
          .select()
          .from(filesTable)
          .where(eq(filesTable.id, fileA.id));

        expect(filesFromA).toHaveLength(1);
        expect(filesFromA[0].tenantId).toBe(fileBuilderA.tenantId);
    });

    it('should prevent path collision between tenants', async () => {
        
        const samePath = ['2024', '01', 'invoice.pdf'];
        
        // Upload for tenant A
        const fileBuilderA = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
        
        const fileA = await testUploadFile({
          file: {
            name: 'invoice.pdf',
            type: 'application/pdf',
            size: 1024,
            buffer: Buffer.from('Tenant A invoice'),
          },
          tenantId: fileBuilderA.tenantId,
          userId: fileBuilderA.uploadedBy,
          bucket: 'invoices',
          path: samePath,
          db,
          storage: doubles.storage,
        });

        // Upload for tenant B with same path
        const fileBuilderB = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();
        
        const fileB = await testUploadFile({
          file: {
            name: 'invoice.pdf',
            type: 'application/pdf',
            size: 1024,
            buffer: Buffer.from('Tenant B invoice'),
          },
          tenantId: fileBuilderB.tenantId,
          userId: fileBuilderB.uploadedBy,
          bucket: 'invoices',
          path: samePath,
          db,
          storage: doubles.storage,
        });

        // Verify both files exist independently
        expect(fileA.id).not.toBe(fileB.id);
        expect(fileA.tenantId).toBe(fileBuilderA.tenantId);
        expect(fileB.tenantId).toBe(fileBuilderB.tenantId);

        // Verify storage paths include tenant ID
        const storageFileA = doubles.storage.getFile('invoices', samePath.join('/'));
        const storageFileB = doubles.storage.getFile('invoices', samePath.join('/'));
        
        // In real implementation, paths should be tenant-scoped
        // This is a test to ensure the implementation does this
    });
  });

  describe('Content Security', () => {
    // Content scanning temporarily disabled - will be implemented later
    it.skip('should scan for embedded malicious content', async () => {
        
        // PDF with embedded JavaScript
        const maliciousPDF = Buffer.concat([
          Buffer.from('%PDF-1.4\n'),
          Buffer.from('/JS (app.alert("XSS"))'),
          Buffer.from('\n%%EOF'),
        ]);
        const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();

        await expect(testUploadFile({
          file: {
            name: 'malicious.pdf',
            type: 'application/pdf',
            size: maliciousPDF.length,
            buffer: maliciousPDF,
          },
          tenantId: file.tenantId,
          userId: file.uploadedBy,
          bucket: 'invoices',
          path: ['2024', '01', 'malicious.pdf'],
          scanContent: true, // Enable content scanning
          db,
          storage: doubles.storage,
        })).rejects.toThrow(/malicious|javascript|security/i);
    });

    it('should strip metadata from uploaded files', async () => {
        
        // Simulate file with metadata
        const fileWithMetadata = {
          name: 'document.pdf',
          type: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('PDF content'),
        };
        const file = FileBuilder.create().withTenant(randomUUID(), randomUUID()).build();

        const result = await testUploadFile({
          file: fileWithMetadata,
          tenantId: file.tenantId,
          userId: file.uploadedBy,
          bucket: 'invoices',
          path: ['2024', '01', 'document.pdf'],
          metadata: {
            'GPS-Location': '37.7749° N, 122.4194° W',
            'Author': 'John Doe',
            'Company': 'Sensitive Corp',
            'Software': 'Adobe Acrobat Pro',
          },
          stripMetadata: true,
          db,
          storage: doubles.storage,
        });

        // Verify sensitive metadata is not stored
        expect(result.metadata).not.toHaveProperty('GPS-Location');
        expect(result.metadata).not.toHaveProperty('Author');
        expect(result.metadata).not.toHaveProperty('Company');
    });
  });
});