// Type exports

// Constants exports
export {
  CONFIDENCE_SCORES,
  CONFIDENCE_THRESHOLDS,
  DEFAULT_CONFIDENCE,
  PROCESSING_NOTES,
} from "./constants";
// Error exports
export { createError, SupplierError, SupplierErrors } from "./errors";
// Core exports
export { AttributeNormalizer } from "./ingestion/normalizer";
export { IngestionValidator } from "./ingestion/validator";
export { type MatchResult, SupplierMatcher } from "./matching/matcher";
// Query exports
export { SupplierQueries } from "./queries/supplier-queries";
// Service exports
export { GlobalSupplierService } from "./services/global-supplier-service";
export {
  type IngestionResult,
  SupplierIngestionService,
} from "./services/ingestion-service";
export { LogoService } from "./services/logo-service";
export { SupplierOperations } from "./services/supplier-operations";
export {
  type CreateSupplierInput,
  SupplierService,
  type UpdateSupplierInput,
} from "./services/supplier-service";
// Transformer exports
export {
  type InvoiceSupplierData,
  transformInvoiceToSupplier,
} from "./transformers/invoice-transformer";
export * from "./types";
export {
  type ExtractedVendorData,
  extractVendorAddress,
  extractVendorData,
  extractVendorDataWithConfidence,
  getVendorDataCompleteness,
  hasMinimumVendorData,
} from "./utils/document-extraction";

// Utility exports
export { generateSlug } from "./utils/slug";
// Validation exports
export {
  SupplierValidator,
  type ValidationResult,
} from "./validation/supplier-validator";
