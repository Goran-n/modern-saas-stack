/**
 * Document extraction constants
 * Single source of truth for all enum values and constants used in document extraction
 */

// Document types we can classify
export const DOCUMENT_TYPES = [
  'invoice',
  'receipt',
  'purchase_order',
  'credit_note',
  'quote',
  'contract',
  'statement',
  'other'
] as const;

// Tax types we recognize
export const TAX_TYPES = [
  'vat',
  'sales_tax',
  'gst',
  'withholding_tax',
  'service_tax',
  'excise_tax',
  'reverse_charge',
  'custom_tax'
] as const;

// Validation statuses
export const VALIDATION_STATUSES = [
  'valid',
  'needs_review',
  'invalid'
] as const;

// Extraction methods
export const EXTRACTION_METHODS = [
  'primary',
  'ocr_fallback',
  'manual'
] as const;

// Field sources
export const FIELD_SOURCES = [
  'ai_extraction',
  'ocr',
  'rules',
  'user_corrected'
] as const;

// Address types
export const ADDRESS_TYPES = [
  'billing',
  'shipping',
  'registered'
] as const;

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,
  MEDIUM: 70,
  LOW: 50,
} as const;

// Processing configuration
export const PROCESSING_CONFIG = {
  MODEL_NAME: 'claude-3-5-sonnet-20240620',
  MAX_TOKENS: 4096,
  EXTRACTION_TIMEOUT_MS: 45000,
  PROCESSING_VERSION: '1.0.0',
} as const;

// Default confidence scores for different field types
export const DEFAULT_FIELD_CONFIDENCE = {
  // High confidence fields
  currency: 98,
  totalAmount: 95,
  documentNumber: 92,
  documentDate: 90,
  
  // Medium confidence fields
  vendorEmail: 88,
  vendorName: 85,
  customerName: 85,
  taxAmount: 85,
  
  // Lower confidence fields
  vendorAddress: 75,
  vendorCity: 75,
  vendorPostalCode: 75,
  vendorCountry: 75,
  customerAddress: 75,
  notes: 70,
  paymentTerms: 70,
  
  // Default for unknown fields
  default: 80,
} as const;