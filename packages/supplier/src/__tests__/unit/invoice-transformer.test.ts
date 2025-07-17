import { describe, it, expect } from 'vitest';
import { transformInvoiceToSupplier, type InvoiceSupplierData } from '../../transformers/invoice-transformer';
import { randomUUID } from 'crypto';

describe('InvoiceTransformer', () => {
  const tenantId = randomUUID();
  const userId = randomUUID();

  describe('transformInvoiceToSupplier', () => {
    it('transforms complete invoice data to supplier request', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorAddress: '123 Main Street',
        vendorCity: 'London',
        vendorPostalCode: 'SW1A 1AA',
        vendorCountry: 'GB',
        vendorEmail: 'vendor@example.com',
        vendorPhone: '+44 20 7123 4567',
        vendorWebsite: 'https://vendor.example.com',
        companyProfile: {
          taxIdentifiers: {
            companyNumber: '12345678'
          }
        }
      };

      const result = transformInvoiceToSupplier(invoice, tenantId, userId);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('invoice');
      expect(result!.sourceId).toBe(invoice.id);
      expect(result!.tenantId).toBe(tenantId);
      expect(result!.userId).toBe(userId);
      expect(result!.data.name).toBe('Test Vendor');
      expect(result!.data.identifiers.vatNumber).toBe('GB123456789');
      expect(result!.data.identifiers.companyNumber).toBe('12345678');
      expect(result!.data.addresses).toHaveLength(1);
      expect(result!.data.contacts).toHaveLength(3); // email, phone, website
    });

    it('returns null when vendor name is missing', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: null,
        vendorTaxId: 'GB123456789',
        companyProfile: {
          taxIdentifiers: {
            companyNumber: '12345678'
          }
        }
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result).toBeNull();
    });

    it('returns null when no identifiers are present', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorAddress: '123 Main St',
        vendorCity: 'London'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result).toBeNull();
    });

    it('extracts VAT number from vendorTaxId when formatted correctly', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        // No companyProfile
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result).not.toBeNull();
      expect(result!.data.identifiers.vatNumber).toBe('GB123456789');
      expect(result!.data.identifiers.companyNumber).toBeNull();
    });

    it('uses companyProfile VAT when vendorTaxId is invalid', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: '123456789', // Invalid format
        companyProfile: {
          taxIdentifiers: {
            vatNumber: 'GB987654321'
          }
        }
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result).not.toBeNull();
      expect(result!.data.identifiers.vatNumber).toBe('GB987654321');
    });

    it('creates address with full details when available', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorAddress: '123 Main Street',
        vendorCity: 'London',
        vendorPostalCode: 'SW1A 1AA',
        vendorCountry: 'GB'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result!.data.addresses).toHaveLength(1);
      expect(result!.data.addresses[0]).toEqual({
        line1: '123 Main Street',
        line2: null,
        city: 'London',
        postalCode: 'SW1A 1AA',
        country: 'GB'
      });
    });

    it('creates address with default city when city is missing', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorAddress: '123 Main Street',
        vendorCountry: 'US'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result!.data.addresses).toHaveLength(1);
      expect(result!.data.addresses[0].city).toBe('Unknown City'); // US default
    });

    it('skips address when only partial data available', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorCity: 'London' // Address missing
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result!.data.addresses).toHaveLength(0);
    });

    it('adds email contact as primary', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorEmail: 'vendor@example.com'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result!.data.contacts).toHaveLength(1);
      expect(result!.data.contacts[0]).toEqual({
        type: 'email',
        value: 'vendor@example.com',
        isPrimary: true
      });
    });

    it('adds phone as primary when no email exists', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorPhone: '+44 20 7123 4567'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result!.data.contacts).toHaveLength(1);
      expect(result!.data.contacts[0]).toEqual({
        type: 'phone',
        value: '+44 20 7123 4567',
        isPrimary: true
      });
    });

    it('adds phone as non-primary when email exists', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorEmail: 'vendor@example.com',
        vendorPhone: '+44 20 7123 4567'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      const phoneContact = result!.data.contacts.find(c => c.type === 'phone');
      expect(phoneContact?.isPrimary).toBe(false);
    });

    it('adds website as non-primary contact', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorWebsite: 'https://vendor.example.com'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result!.data.contacts).toHaveLength(1);
      expect(result!.data.contacts[0]).toEqual({
        type: 'website',
        value: 'https://vendor.example.com',
        isPrimary: false
      });
    });

    it('handles null values in optional fields', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorAddress: null,
        vendorCity: null,
        vendorPostalCode: null,
        vendorCountry: null,
        vendorEmail: null,
        vendorPhone: null,
        vendorWebsite: null,
        companyProfile: null
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result).not.toBeNull();
      expect(result!.data.addresses).toHaveLength(0);
      expect(result!.data.contacts).toHaveLength(0);
      expect(result!.data.bankAccounts).toHaveLength(0);
    });

    it('uses default country GB when not specified', () => {
      const invoice: InvoiceSupplierData = {
        id: randomUUID(),
        vendorName: 'Test Vendor',
        vendorTaxId: 'GB123456789',
        vendorAddress: '123 Main Street',
        vendorCity: 'London'
      };

      const result = transformInvoiceToSupplier(invoice, tenantId);

      expect(result!.data.addresses[0].country).toBe('GB');
    });
  });
});