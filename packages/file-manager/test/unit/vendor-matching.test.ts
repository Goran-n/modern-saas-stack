import { describe, it, expect, beforeEach } from 'vitest';
import { InvoiceBuilder, SupplierBuilder, SupplierPresets } from '@figgy/shared-testing/builders';
import { createTestDoubles } from '@figgy/shared-testing/doubles';
import { setupCustomMatchers } from '@figgy/shared-testing/assertions';
import { 
  calculateLevenshteinDistance, 
  normalizeCompanyName, 
  areCompaniesSimilar,
  extractDomain,
  isValidVATNumber 
} from '@figgy/utils';

// Set up custom matchers
setupCustomMatchers();

describe('Vendor Matching Tests', () => {
  let doubles: ReturnType<typeof createTestDoubles>;

  beforeEach(() => {
    doubles = createTestDoubles();
  });

  describe('Exact Vendor Name Matching', () => {
    it('should match Adobe supplier by exact name', () => {
      const supplier = SupplierPresets.adobe().build();
      const invoice = InvoiceBuilder.create()
        .withSupplier(supplier.displayName, supplier.vatNumber)
        .build();
      
      expect(invoice.supplier.name).toBe('Adobe Systems Software Ireland Ltd');
      expect(invoice.supplier.vat_number).toBe('IE6364992H');
      
      // Test name normalization
      const normalized = normalizeCompanyName(supplier.displayName);
      expect(normalized).toBe('adobe systems software ireland');
    });

    it('should match Microsoft supplier by exact name', () => {
      const supplier = SupplierPresets.microsoft().build();
      const invoice = InvoiceBuilder.create()
        .withSupplier(supplier.displayName, supplier.vatNumber)
        .build();
      
      expect(invoice.supplier.name).toBe('Microsoft Ireland Operations Ltd');
      expect(invoice.supplier.vat_number).toBe('IE8256796U');
      
      // Test name normalization
      const normalized = normalizeCompanyName(supplier.displayName);
      expect(normalized).toBe('microsoft ireland operations');
    });

    it('should match OpenAI supplier by exact name', () => {
      const supplier = SupplierPresets.openai().build();
      const invoice = InvoiceBuilder.create()
        .withSupplier(supplier.displayName, supplier.vatNumber)
        .build();
      
      expect(invoice.supplier.name).toBe('OpenAI, LLC');
      expect(invoice.supplier.vat_number).toBe('EU372041333');
      
      // Test name normalization
      const normalized = normalizeCompanyName(supplier.displayName);
      expect(normalized).toBe('openai');
    });

    it('should handle name variations and aliases', () => {
      const variations = [
        { input: 'Adobe Inc.', expected: 'Adobe Systems Software Ireland Ltd' },
        { input: 'Microsoft Corp', expected: 'Microsoft Ireland Operations Ltd' },
        { input: 'OpenAI', expected: 'OpenAI, LLC' },
        { input: 'Adobe Creative Cloud', expected: 'Adobe Systems Software Ireland Ltd' },
      ];

      variations.forEach(({ input, expected }) => {
        // Test that normalized names can help with matching
        const inputNormalized = normalizeCompanyName(input);
        const expectedNormalized = normalizeCompanyName(expected);
        
        // Check if they're similar enough for fuzzy matching
        const isSimilar = areCompaniesSimilar(input, expected, 3);
        
        if (input.toLowerCase().includes('adobe') && expected.toLowerCase().includes('adobe')) {
          expect(isSimilar).toBe(true);
        }
      });
    });
  });

  describe('Domain-based Vendor Matching', () => {
    it('should extract domains correctly from various inputs', () => {
      const testCases = [
        { input: 'contact@adobe.com', expected: 'adobe.com' },
        { input: 'support@microsoft.com', expected: 'microsoft.com' },
        { input: 'ar@openai.com', expected: 'openai.com' },
        { input: 'https://figma.com', expected: 'figma.com' },
        { input: 'notion.so', expected: 'notion.so' },
        { input: 'xero.com/contact', expected: 'xero.com' },
      ];

      testCases.forEach(({ input, expected }) => {
        const extracted = extractDomain(input);
        expect(extracted).toBe(expected);
      });
    });

    it('should handle invalid domain inputs gracefully', () => {
      const invalidInputs = [
        'not-an-email',
        'no domain here',
        '',
        'just text',
        '@nodomain',
        'domain@',
      ];

      invalidInputs.forEach(input => {
        const extracted = extractDomain(input);
        expect(extracted).toBeNull();
      });
    });

    it('should match suppliers by their known domains', () => {
      const testSuppliers = [
        SupplierPresets.adobe().withDomain('adobe.com').build(),
        SupplierPresets.microsoft().withDomain('microsoft.com').build(),
        SupplierPresets.openai().withDomain('openai.com').build(),
      ];

      testSuppliers.forEach(supplier => {
        expect(supplier.domain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/i);
        
        // Test that we can extract the same domain from an email
        const testEmail = `contact@${supplier.domain}`;
        const extractedDomain = extractDomain(testEmail);
        expect(extractedDomain).toBe(supplier.domain);
      });
    });
  });

  describe('VAT Number Validation', () => {
    it('should validate Irish VAT numbers', () => {
      const irishVATs = ['IE6364992H', 'IE8256796U', 'IE1234567A'];
      
      irishVATs.forEach(vat => {
        expect(isValidVATNumber(vat)).toBe(true);
        expect(vat).toBeValidVATNumber();
        expect(vat).toMatch(/^IE\d{7}[A-Z]$/);
      });
    });

    it('should validate EU VAT numbers', () => {
      const euVATs = ['EU372041333', 'EU528003828', 'EU372054390'];
      
      euVATs.forEach(vat => {
        expect(isValidVATNumber(vat)).toBe(true);
        expect(vat).toBeValidVATNumber();
        expect(vat).toMatch(/^EU\d{9}$/);
      });
    });

    it('should validate other European VAT numbers', () => {
      const europeanVATs = [
        'GB123456789',    // UK
        'DE123456789',    // Germany
        'FR12345678901',  // France
        'NL123456789B12', // Netherlands
      ];
      
      europeanVATs.forEach(vat => {
        expect(isValidVATNumber(vat)).toBe(true);
        expect(vat).toBeValidVATNumber();
      });
    });

    it('should reject invalid VAT numbers', () => {
      const invalidVATs = [
        'IE123',          // Too short
        'EU12345678901',  // Too long
        'INVALID123',     // Invalid format
        '123456789',      // No country code
        'IE1234567a',     // Lowercase letter
        'EU12345678A',    // Letter where number expected
      ];
      
      invalidVATs.forEach(vat => {
        expect(isValidVATNumber(vat)).toBe(false);
      });
    });

    it('should handle VAT numbers in supplier creation', () => {
      const suppliers = [
        SupplierBuilder.create().withVatNumber('IE6364992H').build(),
        SupplierBuilder.create().withVatNumber('EU372041333').build(),
        SupplierBuilder.create().withVatNumber('GB123456789').build(),
      ];

      suppliers.forEach(supplier => {
        expect(supplier.vatNumber).toMatch(/^[A-Z]{2}[A-Z0-9]+$/);
        expect(isValidVATNumber(supplier.vatNumber!)).toBe(true);
        expect(supplier.vatNumber).toBeValidVATNumber();
      });
    });
  });

  describe('Fuzzy Matching', () => {
    it('should calculate Levenshtein distance correctly', () => {
      const testCases = [
        { str1: 'Adobe', str2: 'Adode', expectedDistance: 1 },
        { str1: 'Microsoft', str2: 'Microsft', expectedDistance: 1 },
        { str1: 'OpenAI', str2: 'OpenIA', expectedDistance: 2 },
        { str1: 'Figma', str2: 'Fgima', expectedDistance: 2 },
        { str1: 'identical', str2: 'identical', expectedDistance: 0 },
        { str1: 'completely', str2: 'different', expectedDistance: 9 },
      ];

      testCases.forEach(({ str1, str2, expectedDistance }) => {
        const distance = calculateLevenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        expect(distance).toBe(expectedDistance);
      });
    });

    it('should detect similar company names', () => {
      const similarPairs = [
        { name1: 'Adobe Inc', name2: 'Adobe Systems', shouldMatch: true },
        { name1: 'Microsoft Corp', name2: 'Microsoft Corporation', shouldMatch: true },
        { name1: 'OpenAI LLC', name2: 'OpenAI, LLC', shouldMatch: true },
        { name1: 'Adobe', name2: 'Microsoft', shouldMatch: false },
        { name1: 'Very Long Company Name Ltd', name2: 'Completely Different Corp', shouldMatch: false },
      ];

      similarPairs.forEach(({ name1, name2, shouldMatch }) => {
        const areSimilar = areCompaniesSimilar(name1, name2, 2);
        expect(areSimilar).toBe(shouldMatch);
      });
    });

    it('should normalize company suffixes correctly', () => {
      const suffixTests = [
        { input: 'Adobe Inc', expected: 'adobe' },
        { input: 'Adobe, Inc.', expected: 'adobe' },
        { input: 'Adobe Limited', expected: 'adobe' },
        { input: 'Adobe Ltd', expected: 'adobe' },
        { input: 'Adobe LLC', expected: 'adobe' },
        { input: 'Adobe Corporation', expected: 'adobe' },
        { input: 'Microsoft Ireland Operations Ltd', expected: 'microsoft ireland operations' },
        { input: 'OpenAI, LLC', expected: 'openai' },
      ];

      suffixTests.forEach(({ input, expected }) => {
        const result = normalizeCompanyName(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle edge cases in normalization', () => {
      const edgeCases = [
        { input: '', expected: '' },
        { input: 'A', expected: 'a' },
        { input: 'Company Inc. Ltd. LLC', expected: 'company' },
        { input: 'Multiple    Spaces   Inc', expected: 'multiple spaces' },
        { input: '!!!Punctuation!!! Ltd.', expected: 'punctuation' },
      ];

      edgeCases.forEach(({ input, expected }) => {
        const result = normalizeCompanyName(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('New Vendor Creation', () => {
    it('should create suppliers with valid data using builder', () => {
      const newSupplier = SupplierBuilder.create()
        .withName('New Vendor Inc')
        .withDomain('newvendor.com')
        .withVatNumber('IE1234567N')
        .withAddress('123 New Street, Dublin, Ireland')
        .build();

      expect(newSupplier.displayName).toBe('New Vendor Inc');
      expect(newSupplier.normalizedName).toBe('newvendorinc');
      expect(newSupplier.domain).toBe('newvendor.com');
      expect(newSupplier.vatNumber).toBeValidVATNumber();
      expect(newSupplier.address).toContain('Dublin, Ireland');
      expect(newSupplier.id).toBeValidUUID();
    });

    it('should handle supplier creation with minimal data', () => {
      const minimalSupplier = SupplierBuilder.create()
        .withName('Minimal Supplier')
        .build();

      expect(minimalSupplier.displayName).toBe('Minimal Supplier');
      expect(minimalSupplier.normalizedName).toBe('minimalsupplier');
      expect(minimalSupplier.tenantId).toBeValidUUID();
      expect(minimalSupplier.createdBy).toBeValidUUID();
    });

    it('should generate normalized names consistently', () => {
      const testNames = [
        { input: 'Adobe Systems Software Ireland Ltd', expected: 'adobesystemssoftwareirelandltd' },
        { input: 'Microsoft Ireland Operations Ltd', expected: 'microsoftirelandoperationsltd' },
        { input: 'OpenAI, LLC', expected: 'openaillc' },
        { input: 'Test Company Inc.', expected: 'testcompanyinc' },
      ];

      testNames.forEach(({ input, expected }) => {
        const supplier = SupplierBuilder.create()
          .withName(input)
          .build();
        
        expect(supplier.normalizedName).toBe(expected);
        
        // Also test the utility function directly
        const normalized = normalizeCompanyName(input);
        expect(normalized.replace(/\s/g, '')).toBe(expected);
      });
    });

    it('should handle various contact information formats', () => {
      const supplier = SupplierBuilder.create()
        .withName('Contact Test Company')
        .withContact('contact@company.com', '+353 1 234 5678', 'https://company.com')
        .build();

      expect(supplier.email).toBe('contact@company.com');
      expect(supplier.phone).toBe('+353 1 234 5678');
      expect(supplier.website).toBe('https://company.com');
      
      // Verify domain extraction works
      const extractedDomain = extractDomain(supplier.email!);
      expect(extractedDomain).toBe('company.com');
    });
  });
});