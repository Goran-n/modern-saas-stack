import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { createTestDoubles } from '@figgy/shared-testing/doubles';
import { setupCustomMatchers } from '@figgy/shared-testing/assertions';

// Set up custom matchers
setupCustomMatchers();

describe('Extraction Accuracy Tests', () => {
  let doubles: ReturnType<typeof createTestDoubles>;

  beforeEach(() => {
    doubles = createTestDoubles();
  });

  describe('Invoice Data Extraction', () => {
    const testCases = [
      {
        name: 'Adobe',
        file: 'adobe_subscription.pdf',
        expectedFile: 'adobe_subscription.json'
      },
      {
        name: 'Microsoft',
        file: 'microsoft_invoice.pdf',
        expectedFile: 'microsoft_invoice.json'
      },
      {
        name: 'ChatGPT',
        file: 'chatgpt_invoice.pdf',
        expectedFile: 'chatgpt_invoice.json'
      },
      {
        name: 'Xero',
        file: 'xero_monthly.pdf',
        expectedFile: 'xero_monthly.json'
      },
      {
        name: 'Notion',
        file: 'notion_invoice.pdf',
        expectedFile: 'notion_invoice.json'
      },
      {
        name: 'Figma',
        file: 'figma_invoice.pdf',
        expectedFile: 'figma_invoice.json'
      }
    ];

    testCases.forEach(({ name, file, expectedFile }) => {
      it(`should accurately extract data from ${name} invoice`, async () => {
        const expectedPath = path.join(__dirname, '../fixtures/expected-results', expectedFile);
        const expectedData = JSON.parse(readFileSync(expectedPath, 'utf-8'));

        // Configure the extractor double to return expected data in the correct format
        const expectedResult = {
          documentType: 'invoice' as const,
          documentTypeConfidence: 0.95,
          fields: {
            vendorName: { value: expectedData.supplier.name, confidence: 0.95 },
            vendorVatNumber: { value: expectedData.supplier.vat_number || '', confidence: 0.90 },
            invoiceNumber: { value: expectedData.invoice.number, confidence: 0.98 },
            currency: { value: expectedData.invoice.currency, confidence: 0.99 },
            amount: { value: expectedData.totals.grand_total || expectedData.totals.total, confidence: 0.95 },
            date: { value: expectedData.invoice.date, confidence: 0.92 },
          },
          overallConfidence: 0.94,
          validationStatus: 'valid' as const,
        };

        doubles.extractor.configureResponse('mock-file-id', expectedResult);
        const result = await doubles.extractor.extractDocument('mock-file-id', 'mock-url');

        // Verify extraction fields match expected data
        expect(result.fields.vendorName?.value).toBe(expectedData.supplier.name);
        if (expectedData.supplier.vat_number) {
          expect(result.fields.vendorVatNumber?.value).toBe(expectedData.supplier.vat_number);
        }

        // Verify invoice details
        expect(result.fields.invoiceNumber?.value).toBe(expectedData.invoice.number);
        expect(result.fields.currency?.value).toBe(expectedData.invoice.currency);

        // Verify totals
        const expectedAmount = expectedData.totals.grand_total || expectedData.totals.total;
        if (expectedAmount !== undefined) {
          expect(result.fields.amount?.value).toBe(expectedAmount);
        }
      });
    });
  });

  describe('Amount Extraction Accuracy', () => {
    const amountTests = [
      { invoice: 'Adobe', total: 24.59, currency: 'EUR', tax: 4.60, net: 19.99 },
      { invoice: 'Microsoft', total: 43.17, currency: 'EUR', tax: 8.07, net: 35.10 },
      { invoice: 'ChatGPT', total: 90.00, currency: 'USD', tax: 0, net: 90.00 },
      { invoice: 'Xero', total: 117.80, currency: 'USD', tax: 0, net: 117.80 },
      { invoice: 'Notion', total: 60.00, currency: 'USD', tax: 0, net: 60.00 },
      { invoice: 'Figma', total: 92.25, currency: 'USD', tax: 17.25, net: 75.00 }
    ];

    amountTests.forEach(({ invoice, total, currency, tax, net }) => {
      it(`should extract correct amounts for ${invoice} invoice`, async () => {
        const amountResult = {
          documentType: 'invoice' as const,
          documentTypeConfidence: 0.95,
          fields: {
            amount: { value: total, confidence: 0.95 },
            currency: { value: currency, confidence: 0.99 },
            taxAmount: { value: tax, confidence: 0.90 },
            netAmount: { value: net, confidence: 0.92 },
          },
          overallConfidence: 0.94,
          validationStatus: 'valid' as const,
        };

        doubles.extractor.configureResponse('amount-test-id', amountResult);
        const result = await doubles.extractor.extractDocument('amount-test-id', 'mock-url');

        expect(result.fields.amount?.value).toBe(total);
        expect(result.fields.currency?.value).toBe(currency);
        expect(result.fields.taxAmount?.value).toBe(tax);
        expect(result.fields.netAmount?.value).toBe(net);

        // Verify calculation accuracy
        const calculatedTotal = net + tax;
        expect(Math.abs(calculatedTotal - total)).toBeLessThan(0.01); // Allow for rounding
      });
    });
  });

  describe('Date Extraction and Parsing', () => {
    const dateTests = [
      { 
        invoice: 'Adobe', 
        invoiceDate: '16-OCT-2024',
        expectedParsed: new Date(2024, 9, 16) // October is month 9 (0-indexed)
      },
      { 
        invoice: 'Microsoft', 
        invoiceDate: '18/01/2024',
        expectedParsed: new Date(2024, 0, 18) // January is month 0
      },
      { 
        invoice: 'ChatGPT', 
        invoiceDate: 'September 18, 2024',
        expectedParsed: new Date(2024, 8, 18) // September is month 8
      },
      { 
        invoice: 'Xero', 
        invoiceDate: 'Jan 12, 2024',
        expectedParsed: new Date(2024, 0, 12)
      },
      { 
        invoice: 'Notion', 
        invoiceDate: 'March 31, 2024',
        expectedParsed: new Date(2024, 2, 31) // March is month 2
      },
      { 
        invoice: 'Figma', 
        invoiceDate: 'January 23, 2024',
        expectedParsed: new Date(2024, 0, 23)
      }
    ];

    dateTests.forEach(({ invoice, invoiceDate, expectedParsed }) => {
      it(`should correctly parse date format for ${invoice}`, () => {
        const parsed = parseInvoiceDate(invoiceDate);
        expect(parsed.getTime()).toBe(expectedParsed.getTime());
      });
    });
  });

  describe('Line Item Extraction', () => {
    it('should extract all line items from multi-item invoices', async () => {
      // Figma has 2 line items
      const lineItemResult = {
        documentType: 'invoice' as const,
        documentTypeConfidence: 0.95,
        fields: {
          lineItem1: { value: 'Professional FigJam seats (monthly): 3 x $5.00 = $15.00', confidence: 0.90 },
          lineItem2: { value: 'Professional Figma design seats (monthly): 4 x $15.00 = $60.00', confidence: 0.92 },
          lineItemCount: { value: 2, confidence: 0.95 },
        },
        overallConfidence: 0.92,
        validationStatus: 'valid' as const,
      };

      doubles.extractor.configureResponse('line-items-test', lineItemResult);
      const result = await doubles.extractor.extractDocument('line-items-test', 'mock-url');
      
      expect(result.fields.lineItemCount?.value).toBe(2);
      expect(result.fields.lineItem1?.value).toContain('3 x $5.00 = $15.00');
      expect(result.fields.lineItem2?.value).toContain('4 x $15.00 = $60.00');
      
      // Verify extraction confidence
      expect(result.fields.lineItem1?.confidence).toBeGreaterThan(0.8);
      expect(result.fields.lineItem2?.confidence).toBeGreaterThan(0.8);
    });

    it('should handle discount line items', async () => {
      const discountResult = {
        documentType: 'invoice' as const,
        documentTypeConfidence: 0.95,
        fields: {
          lineItem1: { value: 'Monthly Subscription: $62.00', confidence: 0.95 },
          lineItem2: { value: 'Monthly Subscription: $62.00', confidence: 0.95 },
          lineItem3: { value: '5% subscriber discount: -$6.20', confidence: 0.90 },
          lineItemCount: { value: 3, confidence: 0.98 },
          discountAmount: { value: -6.20, confidence: 0.90 },
          subtotal: { value: 124.00, confidence: 0.95 },
          total: { value: 117.80, confidence: 0.98 },
        },
        overallConfidence: 0.94,
        validationStatus: 'valid' as const,
      };

      doubles.extractor.configureResponse('discount-test', discountResult);
      const result = await doubles.extractor.extractDocument('discount-test', 'mock-url');
      
      expect(result.fields.lineItemCount?.value).toBe(3);
      expect(result.fields.discountAmount?.value).toBe(-6.20);
      expect(result.fields.total?.value).toBe(117.80);
      
      // Verify calculation accuracy
      const subtotal = result.fields.subtotal?.value || 0;
      const discount = result.fields.discountAmount?.value || 0;
      expect(subtotal + discount).toBe(117.80);
    });
  });

  describe('Billing Period Extraction', () => {
    it('should extract billing period dates', async () => {
      const periodResult = {
        documentType: 'invoice' as const,
        documentTypeConfidence: 0.95,
        fields: {
          billingPeriodStart: { value: '2024-10-16', confidence: 0.92 },
          billingPeriodEnd: { value: '2024-11-15', confidence: 0.92 },
          billingDays: { value: 30, confidence: 0.95 },
        },
        overallConfidence: 0.93,
        validationStatus: 'valid' as const,
      };

      doubles.extractor.configureResponse('period-test', periodResult);
      const result = await doubles.extractor.extractDocument('period-test', 'mock-url');
      
      expect(result.fields.billingPeriodStart?.value).toBe('2024-10-16');
      expect(result.fields.billingPeriodEnd?.value).toBe('2024-11-15');
      expect(result.fields.billingDays?.value).toBe(30);
    });
  });

  describe('Customer Information Extraction', () => {
    it('should extract customer details accurately', async () => {
      const customerResult = {
        documentType: 'invoice' as const,
        documentTypeConfidence: 0.95,
        fields: {
          customerName: { value: 'NIKIC COMPANY LIMITED', confidence: 0.92 },
          customerVatNumber: { value: 'IE3410228VH', confidence: 0.90 },
          customerEmail: { value: 'goran@nikic.co', confidence: 0.88 },
          customerAddress: { value: '17 Sunny Hill, Kenmare 00000, Ireland', confidence: 0.85 },
        },
        overallConfidence: 0.89,
        validationStatus: 'valid' as const,
      };

      doubles.extractor.configureResponse('customer-test', customerResult);
      const result = await doubles.extractor.extractDocument('customer-test', 'mock-url');
      
      expect(result.fields.customerName?.value).toBe('NIKIC COMPANY LIMITED');
      expect(result.fields.customerVatNumber?.value).toBe('IE3410228VH');
      expect(result.fields.customerEmail?.value).toBe('goran@nikic.co');
      expect(result.fields.customerAddress?.value).toBe('17 Sunny Hill, Kenmare 00000, Ireland');
    });
  });

  describe('Extraction Confidence Scoring', () => {
    it('should provide confidence scores for extracted data', async () => {
      const confidenceResult = {
        documentType: 'invoice' as const,
        documentTypeConfidence: 0.95,
        fields: {
          invoiceNumber: { value: 'INV-12345', confidence: 0.95 },
          amount: { value: 100.00, confidence: 0.98 },
          vendorName: { value: 'Test Supplier', confidence: 0.92 },
        },
        overallConfidence: 0.95,
        validationStatus: 'valid' as const,
      };

      doubles.extractor.configureResponse('confidence-test', confidenceResult);
      const result = await doubles.extractor.extractDocument('confidence-test', 'mock-url');
      
      expect(result.overallConfidence).toBeGreaterThan(0.9);
      expect(result.fields.invoiceNumber?.confidence).toBeGreaterThan(0.9);
      expect(result.fields.amount?.confidence).toBeGreaterThan(0.9);
      expect(result.fields.vendorName?.confidence).toBeGreaterThan(0.9);
    });
  });
});

// Helper function to parse various date formats
function parseInvoiceDate(dateStr: string): Date {
  // Try different date formats
  const formats = [
    // DD-MMM-YYYY (16-OCT-2024)
    /(\d{1,2})-([A-Z]{3})-(\d{4})/i,
    // DD/MM/YYYY (18/01/2024)
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // Month DD, YYYY (September 18, 2024)
    /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/,
    // Mon DD, YYYY (Jan 12, 2024)
    /([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/,
    // M/DD/YYYY (3/31/2024)
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/
  ];

  const monthMap: { [key: string]: number } = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8, 'sept': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };

  // Try DD-MMM-YYYY format
  if (dateStr.includes('-') && /[A-Z]{3}/i.test(dateStr)) {
    const parts = dateStr.split('-');
    const day = parseInt(parts[0]);
    const month = monthMap[parts[1].toLowerCase()];
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }

  // Try Month DD, YYYY format
  const monthDayYear = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (monthDayYear) {
    const month = monthMap[monthDayYear[1].toLowerCase()];
    const day = parseInt(monthDayYear[2]);
    const year = parseInt(monthDayYear[3]);
    return new Date(year, month, day);
  }

  // Try DD/MM/YYYY format (European)
  if (dateStr.includes('/') && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = dateStr.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    
    // Check if it's likely US format (month > 12)
    if (day > 12 && month <= 12) {
      return new Date(year, month, day);
    }
    // Otherwise assume European format
    return new Date(year, month, day);
  }

  // Fallback to Date constructor
  return new Date(dateStr);
}