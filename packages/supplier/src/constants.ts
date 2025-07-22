/**
 * Supplier match confidence scores
 * Used to indicate how confident we are in supplier matching results
 */
export const CONFIDENCE_SCORES = {
  /** Perfect match - supplier was just created from this data */
  SUPPLIER_CREATED: "100",

  /** High confidence - matched to existing supplier */
  SUPPLIER_MATCHED: "95",

  /** Good confidence - multiple signals match */
  GOOD_MATCH: "85",

  /** Medium confidence - needs review */
  MEDIUM_MATCH: "70",

  /** Low confidence match */
  LOW_MATCH: "50",

  /** No supplier match found */
  NO_MATCH: "0",

  /** Insufficient data to attempt matching */
  INSUFFICIENT_DATA: "0",
} as const;

/**
 * Confidence thresholds for automated actions
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence to auto-accept a match */
  AUTO_ACCEPT: 80,

  /** Minimum confidence to suggest a match for review */
  SUGGEST_MATCH: 40,

  /** Below this, don't even suggest as a possible match */
  IGNORE_MATCH: 20,

  /** Minimum confidence to create a new supplier */
  CREATE_SUPPLIER: 60,
} as const;

/**
 * Processing note templates
 */
export const PROCESSING_NOTES = {
  SUPPLIER_CREATED: "Supplier created",
  SUPPLIER_UPDATED: "Supplier updated",
  SUPPLIER_MATCHED: "Matched to existing supplier",
  INSUFFICIENT_DATA: "Insufficient data for supplier creation",
  VALIDATION_FAILED: "Supplier validation failed",
  ERROR: "Error processing supplier",
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

/**
 * Scoring weights for supplier matching
 */
export const MATCH_SCORES = {
  /** Name matching scores */
  NAME: {
    EXACT: 30,
    FUZZY_HIGH: 25, // 90%+ similarity
    FUZZY_MEDIUM: 20, // 70%+ similarity
    FUZZY_LOW: 10, // 50%+ similarity
  },

  /** Address matching scores */
  ADDRESS: {
    FULL_MATCH: 25, // All components match
    CITY_COUNTRY: 15, // City and country match
    COUNTRY_ONLY: 10, // Country only
  },

  /** Email/domain matching scores */
  DOMAIN: {
    EXACT_MATCH: 20, // Domain matches exactly
  },

  /** Tax identifier scores */
  IDENTIFIERS: {
    COMPANY_NUMBER: 15,
    VAT_NUMBER: 10,
  },

  /** Contact matching scores */
  CONTACTS: {
    PHONE: 5,
    EMAIL: 5,
  },

  /** Bank account matching scores */
  BANK_ACCOUNT: {
    IBAN_MATCH: 20, // IBAN is highly unique
    ACCOUNT_NUMBER: 15, // Account number with bank code
    PARTIAL_MATCH: 10, // Partial account or bank name only
  },

  /** Pattern matching scores */
  PATTERNS: {
    INVOICE_NUMBER_FORMAT: 10, // Consistent invoice numbering pattern
    PAYMENT_TERMS: 5, // Consistent payment terms
  },

  /** Confidence weight multipliers */
  CONFIDENCE_MULTIPLIERS: {
    HIGH: 1.0, // 80-100% confidence
    MEDIUM: 0.8, // 60-79% confidence
    LOW: 0.6, // 40-59% confidence
    VERY_LOW: 0.4, // Below 40% confidence
  },
} as const;
