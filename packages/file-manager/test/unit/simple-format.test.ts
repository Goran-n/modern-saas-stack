import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('Simple Invoice Format Tests', () => {
  const invoiceFiles = [
    { name: 'Adobe', file: 'adobe_subscription.pdf' },
    { name: 'Microsoft', file: 'microsoft_invoice.pdf' },
    { name: 'ChatGPT', file: 'chatgpt_invoice.pdf' },
    { name: 'Xero', file: 'xero_monthly.pdf' },
    { name: 'Notion', file: 'notion_invoice.pdf' },
    { name: 'Figma', file: 'figma_invoice.pdf' }
  ];

  describe('PDF Validation', () => {
    invoiceFiles.forEach(({ name, file }) => {
      it(`should validate ${name} invoice PDF`, () => {
        const filePath = path.join(__dirname, '../fixtures/invoices', file);
        const fileBuffer = readFileSync(filePath);
        
        // Verify it's a valid PDF
        const pdfHeader = fileBuffer.slice(0, 4).toString();
        expect(pdfHeader).toBe('%PDF');
        
        // Test file size is reasonable (between 10KB and 1MB)
        const fileSizeKB = fileBuffer.length / 1024;
        expect(fileSizeKB).toBeGreaterThan(10);
        expect(fileSizeKB).toBeLessThan(1024);
      });
    });
  });

  describe('Expected Results Validation', () => {
    invoiceFiles.forEach(({ name, file }) => {
      it(`should have valid expected results for ${name}`, () => {
        const expectedFile = file.replace('.pdf', '.json');
        const expectedPath = path.join(__dirname, '../fixtures/expected-results', expectedFile);
        const expectedData = JSON.parse(readFileSync(expectedPath, 'utf-8'));
        
        // Validate structure
        expect(expectedData).toHaveProperty('supplier');
        expect(expectedData.supplier).toHaveProperty('name');
        
        expect(expectedData).toHaveProperty('invoice');
        expect(expectedData.invoice).toHaveProperty('currency');
        
        expect(expectedData).toHaveProperty('totals');
      });
    });
  });
});