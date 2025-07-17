import { describe, it, expect, beforeEach } from 'vitest';
import { SupplierMatcher } from '../../matching/matcher';
import { SupplierFactory } from '../factories';
import type { Supplier } from '../../types';

describe('SupplierMatcher', () => {
  let existingSuppliers: Supplier[];

  beforeEach(() => {
    SupplierFactory.reset();
    existingSuppliers = [
      SupplierFactory.createSupplier({
        companyNumber: '12345678',
        vatNumber: 'GB123456789',
        displayName: 'ACME Ltd'
      }),
      SupplierFactory.createSupplier({
        companyNumber: '87654321',
        vatNumber: 'GB987654321',
        displayName: 'Test Corp'
      }),
      SupplierFactory.createSupplier({
        companyNumber: null,
        vatNumber: 'GB111111111',
        displayName: 'VAT Only Ltd'
      })
    ];
  });

  describe('company number matching', () => {
    it('matches by exact company number with 100% confidence', () => {
      const result = SupplierMatcher.match(
        { companyNumber: '12345678' },
        'Different Name',
        existingSuppliers
      );

      expect(result.matched).toBe(true);
      expect(result.supplierId).toBe(existingSuppliers[0].id);
      expect(result.confidence).toBe(100);
      expect(result.matchType).toBe('company_number');
    });

    it('prioritizes company number over VAT match', () => {
      const result = SupplierMatcher.match(
        { 
          companyNumber: '12345678',
          vatNumber: 'GB987654321' // Different supplier's VAT
        },
        'Some Name',
        existingSuppliers
      );

      expect(result.supplierId).toBe(existingSuppliers[0].id);
      expect(result.matchType).toBe('company_number');
    });

    it('returns no match for non-existent company number', () => {
      const result = SupplierMatcher.match(
        { companyNumber: '99999999' },
        'New Company',
        existingSuppliers
      );

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.matchType).toBe('none');
    });
  });

  describe('VAT number matching', () => {
    it('matches by VAT number with 95% confidence', () => {
      const result = SupplierMatcher.match(
        { vatNumber: 'GB111111111' },
        'Different Name',
        existingSuppliers
      );

      expect(result.matched).toBe(true);
      expect(result.supplierId).toBe(existingSuppliers[2].id);
      expect(result.confidence).toBe(95);
      expect(result.matchType).toBe('vat_number');
    });

    it('falls back to VAT when no company number provided', () => {
      const result = SupplierMatcher.match(
        { vatNumber: 'GB987654321' },
        'Test Corp',
        existingSuppliers
      );

      expect(result.supplierId).toBe(existingSuppliers[1].id);
      expect(result.matchType).toBe('vat_number');
    });
  });

  describe('name matching', () => {
    it('matches by normalized name with 70% confidence', () => {
      const result = SupplierMatcher.match(
        {},
        'ACME Limited', // Will normalize to 'acme'
        existingSuppliers
      );

      expect(result.matched).toBe(true);
      expect(result.supplierId).toBe(existingSuppliers[0].id);
      expect(result.confidence).toBe(70);
      expect(result.matchType).toBe('name');
    });

    it('normalizes common suffixes correctly', () => {
      // Test specific normalization cases based on actual implementation
      const specificSuppliers = [
        SupplierFactory.createSupplier({ displayName: 'Test Company' }),
        SupplierFactory.createSupplier({ displayName: 'VAT Only Company' })
      ];

      // Test 1: Corp suffix normalization (note: "corporation" is not in the regex)
      const result1 = SupplierMatcher.match({}, 'Test Company Corp', specificSuppliers);
      expect(result1.matched).toBe(true);
      expect(result1.supplierId).toBe(specificSuppliers[0].id);
      expect(result1.matchType).toBe('name');

      // Test 2: Ltd suffix normalization
      const result2 = SupplierMatcher.match({}, 'VAT Only Company Ltd', specificSuppliers);
      expect(result2.matched).toBe(true);
      expect(result2.supplierId).toBe(specificSuppliers[1].id);
      expect(result2.matchType).toBe('name');

      // Test 3: Limited suffix normalization
      const result3 = SupplierMatcher.match({}, 'VAT Only Company Limited', specificSuppliers);
      expect(result3.matched).toBe(true);
      expect(result3.supplierId).toBe(specificSuppliers[1].id);
      expect(result3.matchType).toBe('name');
    });

    it('handles special characters in names', () => {
      const suppliersWithSpecialChars = [
        SupplierFactory.createSupplier({
          displayName: 'ABC & Co. Ltd'
        })
      ];

      const result = SupplierMatcher.match(
        {},
        'ABC & Co Limited',
        suppliersWithSpecialChars
      );

      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('name');
    });
  });

  describe('no match scenarios', () => {
    it('returns no match when no criteria match', () => {
      const result = SupplierMatcher.match(
        {
          companyNumber: '00000000',
          vatNumber: 'GB000000000'
        },
        'Unknown Company',
        existingSuppliers
      );

      expect(result.matched).toBe(false);
      expect(result.supplierId).toBeUndefined();
      expect(result.confidence).toBe(0);
      expect(result.matchType).toBe('none');
    });

    it('returns no match with empty supplier list', () => {
      const result = SupplierMatcher.match(
        { companyNumber: '12345678' },
        'ACME Ltd',
        []
      );

      expect(result.matched).toBe(false);
    });

    it('returns no match with no identifiers and unmatched name', () => {
      const result = SupplierMatcher.match(
        {},
        'Completely New Company Name',
        existingSuppliers
      );

      expect(result.matched).toBe(false);
      expect(result.matchType).toBe('none');
    });
  });

  describe('edge cases', () => {
    it('handles undefined identifiers gracefully', () => {
      const result = SupplierMatcher.match(
        {
          companyNumber: undefined,
          vatNumber: undefined
        },
        'ACME Ltd',
        existingSuppliers
      );

      // Should still match by name
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('name');
    });

    it('handles empty string identifiers', () => {
      const result = SupplierMatcher.match(
        {
          companyNumber: '',
          vatNumber: ''
        },
        'Test Corp',
        existingSuppliers
      );

      // Empty strings should be ignored, fall back to name
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('name');
    });

    it('is case sensitive for identifiers (current behavior)', () => {
      const result = SupplierMatcher.match(
        { vatNumber: 'gb123456789' }, // lowercase
        'Some Name',
        existingSuppliers
      );

      // Current implementation is case sensitive
      // This documents the actual behavior
      expect(result.matched).toBe(false);
      expect(result.matchType).toBe('none');
    });
  });
});