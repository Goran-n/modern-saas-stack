import { randomUUID } from 'crypto';
import type { Supplier, SupplierIngestionRequest, Identifiers } from '../../types';

export class SupplierFactory {
  private static counter = 0;

  static reset() {
    this.counter = 0;
  }

  static createSupplier(overrides: Partial<Supplier> = {}): Supplier {
    const id = overrides.id || randomUUID();
    const companyNumber = overrides.companyNumber || `${12345678 + this.counter}`;
    const name = overrides.legalName || `Test Company ${this.counter}`;
    
    this.counter++;

    return {
      id,
      tenantId: randomUUID(),
      companyNumber,
      vatNumber: overrides.vatNumber || `GB${999999999 - this.counter}`,
      legalName: name,
      displayName: overrides.displayName || name,
      slug: overrides.slug || name.toLowerCase().replace(/\s+/g, '-'),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides
    };
  }

  static createIdentifiers(overrides: Partial<Identifiers> = {}): Identifiers {
    this.counter++;
    return {
      companyNumber: `${12345678 + this.counter}`,
      vatNumber: `GB${999999999 - this.counter}`,
      ...overrides
    };
  }

  static createIngestionRequest(
    overrides: Partial<SupplierIngestionRequest> = {}
  ): SupplierIngestionRequest {
    const name = overrides.data?.name || `Test Company ${this.counter}`;
    
    return {
      tenantId: randomUUID(),
      source: 'invoice',
      sourceId: `test-invoice-${this.counter}`,
      data: {
        name,
        identifiers: this.createIdentifiers(overrides.data?.identifiers),
        addresses: [],
        contacts: [],
        bankAccounts: [],
        ...overrides.data
      },
      ...overrides
    };
  }

  static createMinimalIngestionRequest(
    tenantId: string,
    name: string = `Test Company ${this.counter}`
  ): SupplierIngestionRequest {
    return {
      tenantId,
      source: 'invoice',
      sourceId: `test-invoice-${this.counter++}`,
      data: {
        name,
        identifiers: {
          vatNumber: `GB${999999999 - this.counter}`
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    };
  }

  static createFullIngestionRequest(tenantId: string): SupplierIngestionRequest {
    this.counter++;
    return {
      tenantId,
      source: 'invoice',
      sourceId: `test-invoice-${this.counter}`,
      data: {
        name: `Full Test Company ${this.counter}`,
        identifiers: {
          companyNumber: `${12345678 + this.counter}`,
          vatNumber: `GB${999999999 - this.counter}`
        },
        addresses: [{
          line1: '123 Test Street',
          line2: 'Test Building',
          city: 'London',
          postalCode: 'SW1A 1AA',
          country: 'GB',
          isPrimary: true
        }],
        contacts: [
          { type: 'email', value: `test${this.counter}@example.com`, isPrimary: true },
          { type: 'phone', value: `+44 20 7123 ${1000 + this.counter}`, isPrimary: false },
          { type: 'website', value: `https://testcompany${this.counter}.com`, isPrimary: false }
        ],
        bankAccounts: [{
          accountName: `Test Company ${this.counter}`,
          accountNumber: `${10000000 + this.counter}`,
          sortCode: '12-34-56',
          iban: `GB82WEST${12345678901234 + this.counter}`,
          swiftCode: 'WESTGB2L',
          isPrimary: true
        }]
      }
    };
  }
}