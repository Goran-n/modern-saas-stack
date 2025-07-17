// Type exports
export * from './types';

// Constants exports
export { 
  CONFIDENCE_SCORES, 
  CONFIDENCE_THRESHOLDS,
  PROCESSING_NOTES,
  DEFAULT_CONFIDENCE 
} from './constants';

// Error exports
export { SupplierError, SupplierErrors, createError } from './errors';

// Core exports
export { AttributeNormalizer } from './ingestion/normalizer';
export { IngestionValidator } from './ingestion/validator';
export { SupplierMatcher, type MatchResult } from './matching/matcher';

// Validation exports
export { SupplierValidator, type ValidationResult } from './validation/supplier-validator';

// Service exports
export { SupplierIngestionService, type IngestionResult } from './services/ingestion-service';
export { 
  SupplierService, 
  type CreateSupplierInput, 
  type UpdateSupplierInput 
} from './services/supplier-service';

// Query exports
export { SupplierQueries } from './queries/supplier-queries';

// Transformer exports
export { 
  transformInvoiceToSupplier,
  type InvoiceSupplierData 
} from './transformers/invoice-transformer';

// Utility exports
export { generateSlug } from './utils/slug';
export { 
  extractVendorData, 
  extractVendorDataWithConfidence,
  extractVendorAddress,
  hasMinimumVendorData,
  getVendorDataCompleteness,
  type ExtractedVendorData
} from './utils/document-extraction';