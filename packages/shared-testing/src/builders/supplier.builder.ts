import { faker } from '@faker-js/faker';

export interface SupplierData {
  id?: string;
  tenantId: string;
  normalizedName: string;
  displayName: string;
  domain?: string;
  vatNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SupplierBuilder {
  private data: SupplierData;

  constructor() {
    const companyName = faker.company.name();
    this.data = {
      id: faker.string.uuid(),
      tenantId: faker.string.uuid(),
      normalizedName: this.normalizeName(companyName),
      displayName: companyName,
      domain: faker.internet.domainName(),
      vatNumber: this.generateVatNumber(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      metadata: {},
      createdBy: faker.string.uuid(),
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
    };
  }

  static create(): SupplierBuilder {
    return new SupplierBuilder();
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withTenant(tenantId: string, createdBy: string): this {
    this.data.tenantId = tenantId;
    this.data.createdBy = createdBy;
    return this;
  }

  withName(displayName: string, normalizedName?: string): this {
    this.data.displayName = displayName;
    this.data.normalizedName = normalizedName || this.normalizeName(displayName);
    return this;
  }

  withDomain(domain: string): this {
    this.data.domain = domain;
    return this;
  }

  withVatNumber(vatNumber: string): this {
    this.data.vatNumber = vatNumber;
    return this;
  }

  withContact(email?: string, phone?: string, website?: string): this {
    if (email) this.data.email = email;
    if (phone) this.data.phone = phone;
    if (website) this.data.website = website;
    return this;
  }

  withAddress(address: string): this {
    this.data.address = address;
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.data.metadata = { ...this.data.metadata, ...metadata };
    return this;
  }

  build(): SupplierData {
    return JSON.parse(JSON.stringify(this.data)); // Deep clone
  }

  buildWithoutId(): Omit<SupplierData, 'id'> {
    const { id, ...dataWithoutId } = this.data;
    return JSON.parse(JSON.stringify(dataWithoutId));
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  }

  private generateVatNumber(): string {
    const countryCode = faker.helpers.arrayElement(['IE', 'EU', 'GB']);
    switch (countryCode) {
      case 'IE':
        return `IE${faker.number.int({ min: 1000000, max: 9999999 })}${faker.string.alpha({ length: 1, casing: 'upper' })}`;
      case 'EU':
        return `EU${faker.number.int({ min: 100000000, max: 999999999 })}`;
      case 'GB':
        return `GB${faker.number.int({ min: 100000000, max: 999999999 })}`;
      default:
        return `${faker.number.int({ min: 1000000000, max: 9999999999 })}`;
    }
  }
}

// Preset builders for common test scenarios
export const SupplierPresets = {
  adobe: () => SupplierBuilder.create()
    .withName('Adobe Systems Software Ireland Ltd', 'adobesystemssoftwareirelandltd')
    .withDomain('adobe.com')
    .withVatNumber('IE6364992H'),

  microsoft: () => SupplierBuilder.create()
    .withName('Microsoft Ireland Operations Ltd', 'microsoftirelandoperationsltd')
    .withDomain('microsoft.com')
    .withVatNumber('IE8256796U'),

  openai: () => SupplierBuilder.create()
    .withName('OpenAI, LLC', 'openaillc')
    .withDomain('openai.com')
    .withVatNumber('EU372041333'),

  minimal: () => SupplierBuilder.create()
    .withName('Test Supplier'),

  withAllDetails: () => SupplierBuilder.create()
    .withContact('contact@supplier.com', '+353 1 234 5678', 'https://supplier.com')
    .withAddress('123 Business Park, Dublin 2, Ireland')
    .withMetadata({
      verified: true,
      category: 'software',
      tags: ['saas', 'subscription'],
    }),
};