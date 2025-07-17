import { supplierIngestionRequestSchema, SupplierIngestionRequest } from '../types';

/**
 * Basic validation for ingestion requests
 */
export class IngestionValidator {
  /**
   * Validate and sanitize ingestion request
   */
  static validate(request: unknown): SupplierIngestionRequest {
    // Parse with Zod
    const parsed = supplierIngestionRequestSchema.parse(request);
    
    // Sanitize data
    return this.sanitize(parsed);
  }
  
  private static sanitize(request: SupplierIngestionRequest): SupplierIngestionRequest {
    // Deep clone to avoid mutations
    const sanitized = JSON.parse(JSON.stringify(request));
    
    // Trim all strings
    this.trimStrings(sanitized);
    
    // Normalize identifiers
    if (sanitized.data.identifiers.vatNumber) {
      sanitized.data.identifiers.vatNumber = sanitized.data.identifiers.vatNumber.toUpperCase();
    }
    if (sanitized.data.identifiers.companyNumber) {
      sanitized.data.identifiers.companyNumber = sanitized.data.identifiers.companyNumber.toUpperCase();
    }
    
    return sanitized;
  }
  
  private static trimStrings(obj: any): void {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
      } else if (obj[key] && typeof obj[key] === 'object') {
        this.trimStrings(obj[key]);
      }
    });
  }
}