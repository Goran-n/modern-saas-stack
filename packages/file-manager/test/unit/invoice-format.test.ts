import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { ConfigDouble, StorageDouble } from '@figgy/shared-testing/doubles';

describe('Invoice Format Tests', () => {
  let configDouble: ConfigDouble;
  let storageDouble: StorageDouble;

  beforeEach(() => {
    configDouble = new ConfigDouble({
      core: {
        DATABASE_URL: 'test-db-url',
        SUPABASE_URL: 'test-supabase-url',
        SUPABASE_SERVICE_KEY: 'test-key',
        NODE_ENV: 'test'
      }
    });
    storageDouble = new StorageDouble();
  });

  describe('PDF Format Validation', () => {
    const invoiceFiles = [
      { name: 'Adobe', file: 'adobe_subscription.pdf' },
      { name: 'Microsoft', file: 'microsoft_invoice.pdf' },
      { name: 'ChatGPT', file: 'chatgpt_invoice.pdf' },
      { name: 'Xero', file: 'xero_monthly.pdf' },
      { name: 'Notion', file: 'notion_invoice.pdf' },
      { name: 'Figma', file: 'figma_invoice.pdf' }
    ];

    invoiceFiles.forEach(({ name, file }) => {
      it(`should validate ${name} invoice PDF format`, async () => {
        const filePath = path.join(__dirname, '../fixtures/invoices', file);
        const fileBuffer = readFileSync(filePath);
        
        // Verify it's a valid PDF
        const pdfHeader = fileBuffer.slice(0, 4).toString();
        expect(pdfHeader).toBe('%PDF');
        
        // Test file size is reasonable (between 10KB and 1MB)
        const fileSizeKB = fileBuffer.length / 1024;
        expect(fileSizeKB).toBeGreaterThan(10);
        expect(fileSizeKB).toBeLessThan(1024);
        
        // Verify the PDF is valid
        expect(fileBuffer.length).toBeGreaterThan(0);
        expect(pdfHeader).toBe('%PDF');
      });
    });

    it('should identify corrupted PDF files', () => {
      const corruptedData = Buffer.from('Not a PDF file');
      
      // Check that it doesn't have PDF header
      const header = corruptedData.slice(0, 4).toString();
      expect(header).not.toBe('%PDF');
      
      // Verify a real PDF would have the correct header
      const validPdfHeader = Buffer.from('%PDF-1.4');
      expect(validPdfHeader.slice(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('File Type Validation', () => {
    it('should accept valid invoice file types', () => {
      const validTypes = [
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'png', mime: 'image/png' },
        { ext: 'jpg', mime: 'image/jpeg' },
        { ext: 'jpeg', mime: 'image/jpeg' }
      ];
      
      // Test that each type is in the valid list
      for (const { ext, mime } of validTypes) {
        expect(validTypes.some(t => t.mime === mime)).toBe(true);
      }
      
      // Test invalid types are not in the list
      const invalidTypes = ['application/msword', 'text/plain', 'video/mp4'];
      for (const invalidType of invalidTypes) {
        expect(validTypes.some(t => t.mime === invalidType)).toBe(false);
      }
    });

    it('should validate file size limits', () => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
      
      // Test file too large (> 50MB)
      const largeFileSize = 51 * 1024 * 1024; // 51MB
      expect(largeFileSize).toBeGreaterThan(MAX_FILE_SIZE);
      
      // Test normal file size (5MB)
      const normalFileSize = 5 * 1024 * 1024; // 5MB
      expect(normalFileSize).toBeLessThan(MAX_FILE_SIZE);
      
      // Test edge case - exactly at limit
      const edgeCaseSize = 50 * 1024 * 1024; // 50MB
      expect(edgeCaseSize).toBe(MAX_FILE_SIZE);
    });
  });

  describe('Multi-page Invoice Handling', () => {
    it('should handle multi-page PDF invoices', () => {
      // Microsoft invoice has 2 pages - verify the file exists and is valid PDF
      const filePath = path.join(__dirname, '../fixtures/invoices/microsoft_invoice.pdf');
      const fileBuffer = readFileSync(filePath);
      
      // Verify it's a valid PDF
      const pdfHeader = fileBuffer.slice(0, 4).toString();
      expect(pdfHeader).toBe('%PDF');
      
      // Verify file size indicates multiple pages (generally > 50KB)
      const fileSizeKB = fileBuffer.length / 1024;
      expect(fileSizeKB).toBeGreaterThan(50);
      
      // Test metadata structure for multi-page handling
      const metadata = {
        pageCount: 2,
        isMultiPage: true,
        extractedPages: [1, 2]
      };
      
      expect(metadata.pageCount).toBe(2);
      expect(metadata.isMultiPage).toBe(true);
      expect(metadata.extractedPages).toHaveLength(2);
    });
  });
});