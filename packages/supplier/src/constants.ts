/**
 * Supplier match confidence scores
 * Used to indicate how confident we are in supplier matching results
 */
export const CONFIDENCE_SCORES = {
  /** Perfect match - supplier was just created from this data */
  SUPPLIER_CREATED: '100',
  
  /** High confidence - matched to existing supplier */
  SUPPLIER_MATCHED: '95',
  
  /** Good confidence - multiple signals match */
  GOOD_MATCH: '85',
  
  /** Medium confidence - needs review */
  MEDIUM_MATCH: '70',
  
  /** Low confidence match */
  LOW_MATCH: '50',
  
  /** No supplier match found */
  NO_MATCH: '0',
  
  /** Insufficient data to attempt matching */
  INSUFFICIENT_DATA: '0',
} as const;

/**
 * Confidence thresholds for automated actions
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence to auto-accept a match */
  AUTO_ACCEPT: 90,
  
  /** Minimum confidence to suggest a match for review */
  SUGGEST_MATCH: 50,
  
  /** Below this, don't even suggest as a possible match */
  IGNORE_MATCH: 30,
} as const;

/**
 * Processing note templates
 */
export const PROCESSING_NOTES = {
  SUPPLIER_CREATED: 'Supplier created',
  SUPPLIER_UPDATED: 'Supplier updated',
  SUPPLIER_MATCHED: 'Matched to existing supplier',
  INSUFFICIENT_DATA: 'Insufficient data for supplier creation',
  VALIDATION_FAILED: 'Supplier validation failed',
  ERROR: 'Error processing supplier',
} as const;

/**
 * Default confidence values for different data sources
 */
export const DEFAULT_CONFIDENCE = {
  /** Confidence for attributes extracted from documents */
  DOCUMENT_EXTRACTED: 70,
  
  /** Confidence for manually entered data */
  MANUAL_ENTRY: 80,
  
  /** Confidence for data from verified sources */
  VERIFIED_SOURCE: 90,
  
  /** Confidence increment when data is seen multiple times */
  REPEAT_OBSERVATION_INCREMENT: 5,
  
  /** Maximum confidence from repeat observations */
  MAX_CONFIDENCE: 100,
} as const;