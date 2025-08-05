export interface ExtractionResult {
  documentType: 'invoice' | 'receipt' | 'contract' | 'unknown';
  documentTypeConfidence: number;
  fields: Record<string, { value: any; confidence: number }>;
  overallConfidence: number;
  validationStatus: 'valid' | 'invalid' | 'requires_review';
  processingDuration?: number;
  metadata?: Record<string, any>;
}

export class ExtractorDouble {
  private responses: Map<string, ExtractionResult> = new Map();
  private errors: Map<string, Error> = new Map();
  private delays: Map<string, number> = new Map();
  private callHistory: Array<{ fileId: string; url: string; timestamp: Date }> = [];

  async extractDocument(
    fileId: string,
    url: string
  ): Promise<ExtractionResult> {
    // Record the call
    this.callHistory.push({ fileId, url, timestamp: new Date() });

    // Check for configured errors
    const error = this.errors.get(fileId) || this.errors.get('*');
    if (error) {
      throw error;
    }

    // Simulate delay if configured
    const delay = this.delays.get(fileId) || this.delays.get('*') || 100;
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, delay));

    // Return configured response or default
    const response = this.responses.get(fileId) || this.responses.get('*');
    if (response) {
      return {
        ...response,
        processingDuration: Date.now() - startTime,
      };
    }

    // Default response
    return {
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      fields: {
        vendorName: { value: 'Default Test Vendor', confidence: 0.9 },
        invoiceNumber: { value: 'TEST-001', confidence: 0.95 },
        amount: { value: 100.00, confidence: 0.98 },
        date: { value: new Date().toISOString().split('T')[0], confidence: 0.9 },
      },
      overallConfidence: 0.93,
      validationStatus: 'valid',
      processingDuration: Date.now() - startTime,
    };
  }

  // Test configuration methods
  configureResponse(fileId: string, response: ExtractionResult): void {
    this.responses.set(fileId, response);
  }

  configureDefaultResponse(response: ExtractionResult): void {
    this.responses.set('*', response);
  }

  simulateError(fileId: string, error: Error): void {
    this.errors.set(fileId, error);
  }

  simulateGlobalError(error: Error): void {
    this.errors.set('*', error);
  }

  simulateDelay(fileId: string, delayMs: number): void {
    this.delays.set(fileId, delayMs);
  }

  simulateGlobalDelay(delayMs: number): void {
    this.delays.set('*', delayMs);
  }

  // Test verification methods
  getCallHistory(): typeof this.callHistory {
    return [...this.callHistory];
  }

  getCallCount(): number {
    return this.callHistory.length;
  }

  wasCalledWith(fileId: string): boolean {
    return this.callHistory.some(call => call.fileId === fileId);
  }

  getLastCall(): typeof this.callHistory[0] | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  reset(): void {
    this.responses.clear();
    this.errors.clear();
    this.delays.clear();
    this.callHistory = [];
  }
}

export function createTestExtractor(): ExtractorDouble {
  return new ExtractorDouble();
}

// Preset extraction results for common scenarios
export const ExtractionPresets = {
  validInvoice: (overrides: Partial<ExtractionResult> = {}): ExtractionResult => ({
    documentType: 'invoice',
    documentTypeConfidence: 0.95,
    fields: {
      vendorName: { value: 'Acme Corp', confidence: 0.92 },
      invoiceNumber: { value: 'INV-2024-001', confidence: 0.98 },
      amount: { value: 1500.00, confidence: 0.99 },
      date: { value: '2024-01-15', confidence: 0.95 },
      taxAmount: { value: 345.00, confidence: 0.97 },
      currency: { value: 'USD', confidence: 0.99 },
    },
    overallConfidence: 0.96,
    validationStatus: 'valid',
    ...overrides,
  }),

  lowConfidenceInvoice: (): ExtractionResult => ({
    documentType: 'invoice',
    documentTypeConfidence: 0.65,
    fields: {
      vendorName: { value: 'Unknown Vendor', confidence: 0.4 },
      invoiceNumber: { value: 'UNCLEAR', confidence: 0.3 },
      amount: { value: 0, confidence: 0.2 },
    },
    overallConfidence: 0.35,
    validationStatus: 'requires_review',
  }),

  invalidDocument: (): ExtractionResult => ({
    documentType: 'unknown',
    documentTypeConfidence: 0.1,
    fields: {},
    overallConfidence: 0.1,
    validationStatus: 'invalid',
  }),

  receipt: (): ExtractionResult => ({
    documentType: 'receipt',
    documentTypeConfidence: 0.88,
    fields: {
      merchantName: { value: 'Coffee Shop', confidence: 0.85 },
      total: { value: 4.50, confidence: 0.95 },
      date: { value: new Date().toISOString().split('T')[0], confidence: 0.9 },
    },
    overallConfidence: 0.89,
    validationStatus: 'valid',
  }),
};