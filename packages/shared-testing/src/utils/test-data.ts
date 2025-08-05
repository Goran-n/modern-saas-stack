import { faker } from '@faker-js/faker';

/**
 * Generate test file buffer with specific content
 */
export function createTestBuffer(content: string | Buffer, size?: number): Buffer {
  if (Buffer.isBuffer(content)) {
    return size ? Buffer.concat([content], size) : content;
  }
  
  const buffer = Buffer.from(content, 'utf-8');
  if (size && buffer.length < size) {
    return Buffer.concat([buffer, Buffer.alloc(size - buffer.length, 0)]);
  }
  
  return buffer;
}

/**
 * Generate realistic PDF buffer for testing
 */
export function createTestPDFBuffer(content: string = 'Test PDF Content'): Buffer {
  const pdfHeader = Buffer.from('%PDF-1.4\n');
  const pdfBody = Buffer.from(`\n1 0 obj\n<< /Type /Page >>\nendobj\n${content}\n`);
  const pdfFooter = Buffer.from('\n%%EOF');
  
  return Buffer.concat([pdfHeader, pdfBody, pdfFooter]);
}

/**
 * Generate test email addresses
 */
export function generateTestEmail(domain: string = faker.internet.domainName()): string {
  return `${faker.internet.userName()}@${domain}`;
}

/**
 * Generate test phone numbers in various formats
 */
export function generateTestPhone(country: 'IE' | 'US' | 'UK' | 'DE' = 'IE'): string {
  const formats = {
    IE: '+353 1 XXX XXXX',
    US: '+1 (XXX) XXX-XXXX',
    UK: '+44 20 XXXX XXXX',
    DE: '+49 30 XXXX XXXX',
  };
  
  const format = formats[country];
  return format.replace(/X/g, () => faker.string.numeric(1));
}

/**
 * Generate test addresses
 */
export function generateTestAddress(country: 'IE' | 'US' | 'UK' | 'DE' = 'IE'): string {
  const templates = {
    IE: () => `${faker.location.buildingNumber()} ${faker.location.street()}, ${faker.location.city()}, ${faker.location.county()}, Ireland`,
    US: () => `${faker.location.buildingNumber()} ${faker.location.street()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}, USA`,
    UK: () => `${faker.location.buildingNumber()} ${faker.location.street()}, ${faker.location.city()}, ${faker.location.zipCode()}, United Kingdom`,
    DE: () => `${faker.location.street()} ${faker.location.buildingNumber()}, ${faker.location.zipCode()} ${faker.location.city()}, Germany`,
  };
  
  return templates[country]();
}

/**
 * Generate test currencies
 */
export function generateTestCurrency(): string {
  return faker.helpers.arrayElement(['EUR', 'USD', 'GBP', 'CAD', 'AUD']);
}

/**
 * Generate test amounts with proper decimal places
 */
export function generateTestAmount(min: number = 10, max: number = 10000): number {
  return Number(faker.number.float({ min, max, fractionDigits: 2 }));
}

/**
 * Generate test date in various formats
 */
export function generateTestDate(format: 'ISO' | 'US' | 'EU' = 'ISO'): string {
  const date = faker.date.recent({ days: 365 });
  
  switch (format) {
    case 'ISO':
      return date.toISOString().split('T')[0];
    case 'US':
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
    case 'EU':
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Generate test invoice numbers in common formats
 */
export function generateTestInvoiceNumber(): string {
  const formats = [
    () => `INV-${faker.date.recent().getFullYear()}-${faker.number.int({ min: 1000, max: 9999 })}`,
    () => `${faker.date.recent().getFullYear()}${faker.number.int({ min: 10000, max: 99999 })}`,
    () => `${faker.string.alpha({ length: 3, casing: 'upper' })}-${faker.number.int({ min: 100, max: 999 })}`,
    () => faker.string.alphanumeric(10, { casing: 'upper' }),
  ];
  
  return faker.helpers.arrayElement(formats)();
}

/**
 * Generate test metadata objects
 */
export function generateTestMetadata(keys: string[] = []): Record<string, any> {
  const defaultKeys = ['source', 'category', 'confidence', 'processingTime'];
  const allKeys = [...defaultKeys, ...keys];
  
  const metadata: Record<string, any> = {};
  
  allKeys.forEach(key => {
    switch (key) {
      case 'source':
        metadata[key] = faker.helpers.arrayElement(['user_upload', 'email_attachment', 'api', 'integration']);
        break;
      case 'category':
        metadata[key] = faker.helpers.arrayElement(['invoice', 'receipt', 'contract', 'document']);
        break;
      case 'confidence':
        metadata[key] = faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 });
        break;
      case 'processingTime':
        metadata[key] = faker.number.int({ min: 100, max: 5000 });
        break;
      default:
        metadata[key] = faker.lorem.word();
    }
  });
  
  return metadata;
}

/**
 * Generate test file paths
 */
export function generateTestFilePath(depth: number = 3): string[] {
  const path = [];
  
  for (let i = 0; i < depth - 1; i++) {
    path.push(faker.system.directoryPath().split('/').pop() || 'folder');
  }
  
  path.push(faker.system.fileName());
  return path;
}

/**
 * Create test error objects
 */
export function createTestError(message: string = faker.lorem.sentence(), code?: string): Error {
  const error = new Error(message);
  if (code) {
    (error as any).code = code;
  }
  return error;
}