import { describe, it, expect } from 'vitest';
import { IngestionValidator } from '../../ingestion/validator';
import { SupplierFactory } from '../factories';
import { ValidationError } from '../../errors';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

describe('IngestionValidator', () => {
  describe('validate', () => {
    it('accepts valid complete request', () => {
      const request = SupplierFactory.createFullIngestionRequest(randomUUID());
      
      expect(() => IngestionValidator.validate(request)).not.toThrow();
      const result = IngestionValidator.validate(request);
      
      // Check structure is preserved
      expect(result.source).toBe(request.source);
      expect(result.sourceId).toBe(request.sourceId);
      expect(result.tenantId).toBe(request.tenantId);
      expect(result.data.name).toBe(request.data.name);
      expect(result.data.identifiers).toBeDefined();
      expect(result.data.addresses).toHaveLength(1);
      expect(result.data.contacts).toHaveLength(3);
      expect(result.data.bankAccounts).toHaveLength(1);
    });

    it('accepts minimal valid request', () => {
      const request = SupplierFactory.createMinimalIngestionRequest(randomUUID());
      
      expect(() => IngestionValidator.validate(request)).not.toThrow();
      const result = IngestionValidator.validate(request);
      
      expect(result.data.identifiers.vatNumber).toBeDefined();
      expect(result.data.addresses).toEqual([]);
      expect(result.data.contacts).toEqual([]);
      expect(result.data.bankAccounts).toEqual([]);
    });

    it('throws ZodError for missing required fields', () => {
      const invalidRequest = {
        // Missing tenantId
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' }
        }
      };

      expect(() => IngestionValidator.validate(invalidRequest as any))
        .toThrow(ZodError);
    });

    it('throws ZodError for invalid source type', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invalid-source',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' }
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
    });

    it('throws ZodError for missing supplier name', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          identifiers: { vatNumber: 'GB123456789' },
          addresses: [],
          contacts: [],
          bankAccounts: []
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
    });

    it('throws ZodError for empty supplier name', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: '',
          identifiers: { vatNumber: 'GB123456789' }
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
    });

    it('defaults missing arrays to empty arrays', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' }
          // Missing addresses, contacts, bankAccounts
        }
      };

      const result = IngestionValidator.validate(request as any);
      
      expect(result.data.addresses).toEqual([]);
      expect(result.data.contacts).toEqual([]);
      expect(result.data.bankAccounts).toEqual([]);
    });

    it('validates contact types', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' },
          contacts: [
            { type: 'invalid' as any, value: 'test@example.com', isPrimary: true }
          ]
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
    });

    it('validates address structure', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' },
          addresses: [
            {
              // Missing required line1
              city: 'London'
            } as any
          ]
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
    });

    it('validates bank account structure', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' },
          bankAccounts: [
            {
              accountName: 'Test Account'
              // Missing accountNumber or IBAN - should fail validation
            } as any
          ]
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
    });

    it('trims string values', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: '  Test Company  ',
          identifiers: { vatNumber: '  GB123456789  ' }
        }
      };

      const result = IngestionValidator.validate(request as any);
      
      expect(result.data.name).toBe('Test Company');
      expect(result.data.identifiers.vatNumber).toBe('GB123456789');
    });

    it('preserves userId when provided', () => {
      const userId = randomUUID();
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        userId,
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' }
        }
      };

      const result = IngestionValidator.validate(request as any);
      
      expect(result.userId).toBe(userId);
    });

    it('throws error when no identifiers provided', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: {
            // No identifiers
          }
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
      
      try {
        IngestionValidator.validate(request);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toContain('identifier');
        }
      }
    });

    it('normalizes identifiers to uppercase', () => {
      const request = {
        tenantId: randomUUID(),
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: {
            vatNumber: 'gb123456789',
            companyNumber: 'abc12345'
          }
        }
      };

      const result = IngestionValidator.validate(request as any);
      
      expect(result.data.identifiers.vatNumber).toBe('GB123456789');
      expect(result.data.identifiers.companyNumber).toBe('ABC12345');
    });

    it('handles invalid UUID format', () => {
      const request = {
        tenantId: 'not-a-uuid',
        source: 'invoice',
        sourceId: 'test-123',
        data: {
          name: 'Test Company',
          identifiers: { vatNumber: 'GB123456789' }
        }
      };

      expect(() => IngestionValidator.validate(request))
        .toThrow(ZodError);
      
      try {
        IngestionValidator.validate(request);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].path).toContain('tenantId');
          expect(error.errors[0].message).toContain('uuid');
        }
      }
    });
  });

  describe('error messages', () => {
    it('provides clear error message for validation failures', () => {
      const invalidRequest = {
        source: 123, // Should be string
        data: {
          identifiers: {}
        }
      };

      try {
        IngestionValidator.validate(invalidRequest as any);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        if (error instanceof ZodError) {
          expect(error.errors.length).toBeGreaterThan(0);
        }
      }
    });
  });
});