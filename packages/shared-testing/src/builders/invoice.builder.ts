import { faker } from '@faker-js/faker';

export interface InvoiceData {
  supplier: {
    name: string;
    vat_number?: string;
    address?: string;
    email?: string;
    domain?: string;
  };
  invoice: {
    number: string;
    date: string;
    due_date?: string;
    currency: string;
    billing_period?: {
      from: string;
      to: string;
    };
  };
  customer: {
    name: string;
    vat_number?: string;
    address?: string;
    email?: string;
  };
  line_items?: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    amount: number;
  }>;
  totals: {
    subtotal?: number;
    tax_amount?: number;
    discount?: number;
    total?: number;
    grand_total?: number;
    total_due?: number;
  };
}

export class InvoiceBuilder {
  private data: InvoiceData;

  constructor() {
    this.data = {
      supplier: {
        name: faker.company.name(),
        vat_number: this.generateVatNumber(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        email: faker.internet.email(),
        domain: faker.internet.domainName(),
      },
      invoice: {
        number: this.generateInvoiceNumber(),
        date: faker.date.recent().toISOString().split('T')[0],
        currency: faker.helpers.arrayElement(['EUR', 'USD', 'GBP']),
      },
      customer: {
        name: faker.company.name(),
        vat_number: this.generateVatNumber(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        email: faker.internet.email(),
      },
      totals: {
        subtotal: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
        tax_amount: 0,
        total: 0,
      },
    };
    
    // Calculate tax and total
    this.calculateTotals();
  }

  static create(): InvoiceBuilder {
    return new InvoiceBuilder();
  }

  withSupplier(name: string, vatNumber?: string): this {
    this.data.supplier.name = name;
    if (vatNumber) {
      this.data.supplier.vat_number = vatNumber;
    }
    return this;
  }

  withSupplierDetails(supplier: Partial<InvoiceData['supplier']>): this {
    this.data.supplier = { ...this.data.supplier, ...supplier };
    return this;
  }

  withInvoiceNumber(number: string): this {
    this.data.invoice.number = number;
    return this;
  }

  withDate(date: string): this {
    this.data.invoice.date = date;
    return this;
  }

  withCurrency(currency: string): this {
    this.data.invoice.currency = currency;
    return this;
  }

  withCustomer(name: string, vatNumber?: string): this {
    this.data.customer.name = name;
    if (vatNumber) {
      this.data.customer.vat_number = vatNumber;
    }
    return this;
  }

  withLineItems(items: InvoiceData['line_items']): this {
    this.data.line_items = items;
    // Recalculate totals based on line items
    if (items) {
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      this.data.totals.subtotal = subtotal;
      this.calculateTotals();
    }
    return this;
  }

  withAmount(total: number, taxRate: number = 0.23): this {
    const subtotal = total / (1 + taxRate);
    const taxAmount = total - subtotal;
    
    this.data.totals = {
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      grand_total: Number(total.toFixed(2)),
      total_due: Number(total.toFixed(2)),
    };
    return this;
  }

  withTotals(totals: Partial<InvoiceData['totals']>): this {
    this.data.totals = { ...this.data.totals, ...totals };
    return this;
  }

  withBillingPeriod(from: string, to: string): this {
    this.data.invoice.billing_period = { from, to };
    return this;
  }

  build(): InvoiceData {
    return JSON.parse(JSON.stringify(this.data)); // Deep clone
  }

  buildRaw(): string {
    return JSON.stringify(this.data, null, 2);
  }

  private generateVatNumber(): string {
    const countryCode = faker.helpers.arrayElement(['IE', 'EU']);
    if (countryCode === 'IE') {
      return `IE${faker.number.int({ min: 1000000, max: 9999999 })}${faker.string.alpha({ length: 1, casing: 'upper' })}`;
    } else {
      return `EU${faker.number.int({ min: 100000000, max: 999999999 })}`;
    }
  }

  private generateInvoiceNumber(): string {
    const prefix = faker.helpers.arrayElement(['INV', 'INVOICE', '']);
    const separator = faker.helpers.arrayElement(['-', '/', '']);
    const year = faker.date.recent().getFullYear();
    const number = faker.number.int({ min: 1, max: 9999 }).toString().padStart(4, '0');
    
    if (prefix) {
      return `${prefix}${separator}${year}${separator}${number}`;
    }
    return `${year}${number}`;
  }

  private calculateTotals(): void {
    const subtotal = this.data.totals.subtotal || 0;
    const taxRate = this.data.invoice.currency === 'EUR' ? 0.23 : 0; // Irish VAT for EUR
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    
    this.data.totals = {
      ...this.data.totals,
      tax_amount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      grand_total: Number(total.toFixed(2)),
      total_due: Number(total.toFixed(2)),
    };
  }
}

// Preset builders for common test scenarios
export const InvoicePresets = {
  adobe: () => InvoiceBuilder.create()
    .withSupplier('Adobe Systems Software Ireland Ltd', 'IE6364992H')
    .withInvoiceNumber('IE239300981')
    .withDate('2024-10-16')
    .withCurrency('EUR')
    .withAmount(24.59, 0.23)
    .withCustomer('GORAN NIKIC', 'IE3410228VH'),

  microsoft: () => InvoiceBuilder.create()
    .withSupplier('Microsoft Ireland Operations Ltd', 'IE8256796U')
    .withInvoiceNumber('E404806917')
    .withDate('2024-01-18')
    .withCurrency('EUR')
    .withAmount(43.17, 0.23)
    .withCustomer('Nikic Company Ltd.'),

  openai: () => InvoiceBuilder.create()
    .withSupplier('OpenAI, LLC', 'EU372041333')
    .withInvoiceNumber('C8CCDFF4-0004')
    .withDate('2024-09-18')
    .withCurrency('USD')
    .withAmount(90.00, 0)
    .withCustomer('NIKIC COMPANY LIMITED', 'IE3410228VH'),

  minimal: () => InvoiceBuilder.create()
    .withSupplier('Test Supplier')
    .withAmount(100.00),

  withLineItems: () => InvoiceBuilder.create()
    .withLineItems([
      { description: 'Service A', quantity: 2, unit_price: 50, amount: 100 },
      { description: 'Service B', quantity: 1, unit_price: 75, amount: 75 },
    ]),
};