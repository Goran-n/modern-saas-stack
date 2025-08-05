import { expect } from 'vitest';

// Custom matchers for better assertions
export const customMatchers = {
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () => 
        pass 
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },

  toBeValidVATNumber(received: string) {
    const vatPatterns = {
      IE: /^IE\d{7}[A-Z]$/,
      EU: /^EU\d{9}$/,
      GB: /^GB\d{9}$/,
      DE: /^DE\d{9}$/,
      FR: /^FR[A-Z0-9]{2}\d{9}$/,
      IT: /^IT\d{11}$/,
      ES: /^ES[A-Z]\d{8}$/,
      NL: /^NL\d{9}B\d{2}$/,
      BE: /^BE0\d{9}$/,
    };
    
    const pass = Object.values(vatPatterns).some(pattern => pattern.test(received));
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid VAT number`
          : `expected ${received} to be a valid VAT number`,
    };
  },

  toBeValidMimeType(received: string, expectedTypes?: string[]) {
    const validTypes = expectedTypes || [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];
    const pass = validTypes.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid MIME type`
          : `expected ${received} to be one of ${validTypes.join(', ')}`,
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range ${min}-${max}`
          : `expected ${received} to be within range ${min}-${max}`,
    };
  },

  toHaveProcessingStatus(received: any, status: string) {
    const pass = received?.processingStatus === status;
    return {
      pass,
      message: () =>
        pass
          ? `expected processingStatus not to be ${status}`
          : `expected processingStatus to be ${status}, but got ${received?.processingStatus}`,
    };
  },

  toContainMetadata(received: any, key: string, value?: any) {
    const hasKey = received?.metadata && key in received.metadata;
    const hasValue = value !== undefined 
      ? received?.metadata?.[key] === value
      : true;
    const pass = hasKey && hasValue;
    
    return {
      pass,
      message: () => {
        if (!hasKey) {
          return `expected metadata to contain key '${key}'`;
        }
        if (!hasValue) {
          return `expected metadata.${key} to be ${value}, but got ${received.metadata[key]}`;
        }
        return `expected metadata not to contain key '${key}'`;
      },
    };
  },
};

// Helper functions for common assertions
export function assertValidInvoice(invoice: any): void {
  expect(invoice).toBeDefined();
  expect(invoice.supplier).toBeDefined();
  expect(invoice.supplier.name).toBeTruthy();
  expect(typeof invoice.supplier.name).toBe('string');
  
  expect(invoice.invoice).toBeDefined();
  expect(invoice.invoice.number).toBeTruthy();
  expect(invoice.invoice.currency).toMatch(/^[A-Z]{3}$/);
  
  expect(invoice.totals).toBeDefined();
  const total = invoice.totals.total || invoice.totals.grand_total || invoice.totals.total_due;
  expect(typeof total).toBe('number');
  expect(total).toBeGreaterThan(0);
}

export function assertValidFile(file: any): void {
  expect(file).toBeDefined();
  expect(file.id).toBeTruthy();
  expect(file.fileName).toBeTruthy();
  expect(file.mimeType).toBeTruthy();
  expect(file.size).toBeGreaterThan(0);
  expect(file.processingStatus).toBeTruthy();
  expect(file.bucket).toBeTruthy();
  expect(Array.isArray(file.pathTokens)).toBe(true);
}

export function assertValidSupplier(supplier: any): void {
  expect(supplier).toBeDefined();
  expect(supplier.id).toBeTruthy();
  expect(supplier.normalizedName).toBeTruthy();
  expect(supplier.displayName).toBeTruthy();
  expect(supplier.tenantId).toBeTruthy();
}

export function assertErrorResponse(response: any, expectedError?: string): void {
  expect(response).toBeDefined();
  expect(response.error).toBeTruthy();
  if (expectedError) {
    expect(response.error.message || response.error).toContain(expectedError);
  }
  expect(response.data).toBeNull();
}

export function assertSuccessResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response.error).toBeNull();
  expect(response.data).toBeTruthy();
}

// Date assertion helpers
export function assertDateWithinRange(
  date: Date | string,
  expectedDate: Date | string,
  toleranceMs: number = 60000 // 1 minute default
): void {
  const actualMs = new Date(date).getTime();
  const expectedMs = new Date(expectedDate).getTime();
  const difference = Math.abs(actualMs - expectedMs);
  
  expect(difference).toBeLessThanOrEqual(toleranceMs);
}

// Amount assertion helpers
export function assertAmountEquals(
  actual: number,
  expected: number,
  tolerance: number = 0.01
): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

// Configure Vitest to use custom matchers
export function setupCustomMatchers(): void {
  expect.extend(customMatchers);
}