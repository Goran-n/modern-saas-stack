import { randomUUID } from 'crypto';

export interface DocumentExtraction {
  id: string;
  fileId: string;
  tenantId: string;
  documentType: string;
  documentTypeConfidence: number;
  extractedFields: Record<string, any>;
  extractionMethod: 'primary' | 'ocr_fallback' | 'manual';
  overallConfidence: number;
  matchedSupplierId?: string;
  processingNotes?: string;
}

export class DocumentExtractionFactory {
  private static counter = 0;

  static reset() {
    this.counter = 0;
  }

  static createInvoiceExtraction(
    overrides: Partial<DocumentExtraction> = {}
  ): DocumentExtraction {
    this.counter++;
    
    return {
      id: randomUUID(),
      fileId: randomUUID(),
      tenantId: randomUUID(),
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      extractedFields: {
        vendorName: `Test Vendor ${this.counter}`,
        vendorVatNumber: `GB${999999999 - this.counter}`,
        vendorCompanyNumber: `${12345678 + this.counter}`,
        vendorAddress: '123 Test Street, London SW1A 1AA',
        vendorEmail: `vendor${this.counter}@example.com`,
        vendorPhone: `+44 20 7123 ${1000 + this.counter}`,
        invoiceNumber: `INV-${this.counter}`,
        invoiceDate: new Date().toISOString(),
        totalAmount: 1000 + this.counter * 100,
        currency: 'GBP'
      },
      extractionMethod: 'primary',
      overallConfidence: 0.9,
      ...overrides
    };
  }

  static createMinimalExtraction(tenantId: string): DocumentExtraction {
    this.counter++;
    
    return {
      id: randomUUID(),
      fileId: randomUUID(),
      tenantId,
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      extractedFields: {
        vendorName: `Minimal Vendor ${this.counter}`,
        // No identifiers - should fail validation
      },
      extractionMethod: 'primary',
      overallConfidence: 0.9
    };
  }

  static createLowConfidenceExtraction(tenantId: string): DocumentExtraction {
    this.counter++;
    
    return {
      id: randomUUID(),
      fileId: randomUUID(),
      tenantId,
      documentType: 'invoice',
      documentTypeConfidence: 0.6, // Low confidence
      extractedFields: {
        vendorName: `Low Confidence Vendor ${this.counter}`,
        vendorVatNumber: `GB${999999999 - this.counter}`
      },
      extractionMethod: 'ocr_fallback',
      overallConfidence: 0.5
    };
  }
}