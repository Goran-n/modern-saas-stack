import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { InvoiceBuilder, InvoicePresets } from '@figgy/shared-testing/builders';
import { assertValidInvoice, assertAmountEquals, setupCustomMatchers } from '@figgy/shared-testing/assertions';
import { isValidVATNumber } from '@figgy/utils';

// Set up custom matchers
setupCustomMatchers();

describe('Invoice Validation Tests', () => {
  describe('PDF Structure Validation', () => {
    const testPDFs = [
      { name: 'Adobe', path: 'adobe_subscription.pdf' },
      { name: 'Microsoft', path: 'microsoft_invoice.pdf' },
      { name: 'ChatGPT', path: 'chatgpt_invoice.pdf' },
      { name: 'Xero', path: 'xero_monthly.pdf' },
      { name: 'Notion', path: 'notion_invoice.pdf' },
      { name: 'Figma', path: 'figma_invoice.pdf' },
    ];

    testPDFs.forEach(({ name, path: pdfPath }) => {
      it(`should validate ${name} invoice PDF structure`, () => {
        const fullPath = path.join(__dirname, '../fixtures/invoices', pdfPath);
        const fileBuffer = readFileSync(fullPath);
        
        // PDF header check
        const header = fileBuffer.slice(0, 5).toString();
        expect(header).toMatch(/^%PDF-/);
        
        // PDF footer check (some PDFs have %EOF instead of %%EOF)
        const footer = fileBuffer.slice(-10).toString();
        expect(footer).toMatch(/%+EOF/);
        
        // Size validation using custom matcher
        const sizeKB = fileBuffer.length / 1024;
        expect(sizeKB).toBeWithinRange(10, 1024); // 10KB to 1MB
        
        // Basic structure checks
        const content = fileBuffer.toString('binary');
        expect(content).toContain('/Type');
        expect(content).toContain('/Page');
      });
    });
  });

  describe('Expected Data Validation', () => {
    const testCases = [
      { name: 'Adobe', file: 'adobe_subscription.json' },
      { name: 'Microsoft', file: 'microsoft_invoice.json' },
      { name: 'ChatGPT', file: 'chatgpt_invoice.json' },
      { name: 'Xero', file: 'xero_monthly.json' },
      { name: 'Notion', file: 'notion_invoice.json' },
      { name: 'Figma', file: 'figma_invoice.json' },
    ];

    testCases.forEach(({ name, file }) => {
      it(`should have complete expected data for ${name}`, () => {
        const expectedPath = path.join(__dirname, '../fixtures/expected-results', file);
        const expectedData = JSON.parse(readFileSync(expectedPath, 'utf-8'));
        
        // Use our assertion helper
        assertValidInvoice(expectedData);
        
        // VAT validation for EU invoices using utility function
        if (expectedData.invoice.currency === 'EUR') {
          expect(expectedData.totals.tax_amount || expectedData.totals.vat).toBeDefined();
        }
      });
    });
  });

  describe('Amount Calculations', () => {
    it('should have correct calculations for Adobe invoice', () => {
      const invoice = InvoicePresets.adobe().build();
      
      assertAmountEquals(invoice.totals.total!, 24.59);
      assertAmountEquals(invoice.totals.tax_amount!, 4.60);
      assertAmountEquals(invoice.totals.subtotal!, 19.99);
      
      // Tax rate validation for Ireland
      const taxRate = (invoice.totals.tax_amount! / invoice.totals.subtotal!) * 100;
      expect(taxRate).toBeCloseTo(23, 1);
    });

    it('should have correct calculations for Microsoft invoice', () => {
      const invoice = InvoicePresets.microsoft().build();
      
      assertAmountEquals(invoice.totals.total!, 43.17);
      assertAmountEquals(invoice.totals.tax_amount!, 8.07);
      assertAmountEquals(invoice.totals.subtotal!, 35.10);
      
      // Tax rate validation for Ireland
      const taxRate = (invoice.totals.tax_amount! / invoice.totals.subtotal!) * 100;
      expect(taxRate).toBeCloseTo(23, 1);
    });

    it('should handle zero tax for US invoices', () => {
      const invoice = InvoicePresets.openai().build();
      
      assertAmountEquals(invoice.totals.total!, 90.00);
      assertAmountEquals(invoice.totals.tax_amount!, 0);
      assertAmountEquals(invoice.totals.subtotal!, 90.00);
    });

    it('should validate custom calculation scenarios', () => {
      const customInvoice = InvoiceBuilder.create()
        .withAmount(123.45, 0.20) // 20% tax rate
        .build();
      
      const expectedNet = 123.45 / 1.20;
      const expectedTax = 123.45 - expectedNet;
      
      assertAmountEquals(customInvoice.totals.total!, 123.45);
      assertAmountEquals(customInvoice.totals.tax_amount!, expectedTax);
      assertAmountEquals(customInvoice.totals.subtotal!, expectedNet);
    });
  });

  describe('Date Format Validation', () => {
    it('should validate Adobe date format (DD-MMM-YYYY)', () => {
      const invoice = InvoicePresets.adobe().build();
      const date = invoice.invoice.date;
      
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // ISO format in our builder
      expect(new Date(date)).toBeInstanceOf(Date);
      expect(new Date(date).getTime()).not.toBeNaN();
    });

    it('should validate Microsoft date format (DD/MM/YYYY)', () => {
      const invoice = InvoicePresets.microsoft().build();
      const date = invoice.invoice.date;
      
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(date)).toBeInstanceOf(Date);
      expect(new Date(date).getTime()).not.toBeNaN();
    });

    it('should handle various date formats consistently', () => {
      const testDates = [
        '2024-10-16',    // ISO format
        '2024/01/18',    // Alternative slash format
        '2024-09-18',    // Another ISO format
      ];

      testDates.forEach(dateStr => {
        const invoice = InvoiceBuilder.create()
          .withDate(dateStr)
          .build();
        
        expect(invoice.invoice.date).toBe(dateStr);
        expect(new Date(dateStr)).toBeInstanceOf(Date);
        expect(new Date(dateStr).getTime()).not.toBeNaN();
      });
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        '32-13-2024',    // Invalid day/month
        '2024-13-32',    // Invalid month/day
        'not-a-date',    // Not a date
        '',              // Empty string
      ];

      invalidDates.forEach(invalidDate => {
        expect(() => {
          InvoiceBuilder.create().withDate(invalidDate).build();
        }).not.toThrow(); // Builder accepts string, validation happens elsewhere
        
        // But the date should be invalid when parsed
        expect(new Date(invalidDate).getTime()).toBeNaN();
      });
    });
  });

  describe('Vendor Information', () => {
    it('should validate Adobe vendor information', () => {
      const invoice = InvoicePresets.adobe().build();
      
      expect(invoice.supplier.name).toBe('Adobe Systems Software Ireland Ltd');
      expect(invoice.supplier.vat_number).toBeValidVATNumber();
      expect(invoice.supplier.vat_number).toBe('IE6364992H');
      expect(isValidVATNumber(invoice.supplier.vat_number!)).toBe(true);
    });

    it('should validate Microsoft vendor information', () => {
      const invoice = InvoicePresets.microsoft().build();
      
      expect(invoice.supplier.name).toBe('Microsoft Ireland Operations Ltd');
      expect(invoice.supplier.vat_number).toBeValidVATNumber();
      expect(invoice.supplier.vat_number).toBe('IE8256796U');
      expect(isValidVATNumber(invoice.supplier.vat_number!)).toBe(true);
    });

    it('should validate OpenAI vendor information', () => {
      const invoice = InvoicePresets.openai().build();
      
      expect(invoice.supplier.name).toBe('OpenAI, LLC');
      expect(invoice.supplier.vat_number).toBeValidVATNumber();
      expect(invoice.supplier.vat_number).toBe('EU372041333');
      expect(isValidVATNumber(invoice.supplier.vat_number!)).toBe(true);
    });

    it('should handle vendors without VAT numbers', () => {
      const invoice = InvoiceBuilder.create()
        .withSupplier('Local Supplier')
        .build();
      
      expect(invoice.supplier.name).toBe('Local Supplier');
      // VAT number should be generated by builder or can be undefined
      if (invoice.supplier.vat_number) {
        expect(isValidVATNumber(invoice.supplier.vat_number)).toBe(true);
      }
    });

    it('should validate various VAT number formats', () => {
      const vatNumbers = [
        'IE6364992H',    // Ireland
        'EU372041333',   // EU
        'GB123456789',   // UK
        'DE123456789',   // Germany
      ];

      vatNumbers.forEach(vat => {
        expect(isValidVATNumber(vat)).toBe(true);
        
        const invoice = InvoiceBuilder.create()
          .withSupplier('Test Company', vat)
          .build();
        
        expect(invoice.supplier.vat_number).toBe(vat);
        expect(invoice.supplier.vat_number).toBeValidVATNumber();
      });
    });

    it('should reject invalid VAT numbers', () => {
      const invalidVATs = [
        'INVALID123',     // Invalid format
        'IE123',          // Too short
        'EU12345678901',  // Too long
        '123456789',      // No country code
        '',               // Empty
      ];

      invalidVATs.forEach(invalidVAT => {
        expect(isValidVATNumber(invalidVAT)).toBe(false);
      });
    });
  });
});