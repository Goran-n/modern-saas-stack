// Validation configuration that can be easily updated or extended
// This replaces hardcoded validation arrays throughout the codebase

export const ValidationConfig = {
  // Valid intents - these match the QueryIntent enum
  intents: [
    "count",
    "list",
    "search",
    "aggregate",
    "status",
    "greeting",
    "casual",
    "financial",
    "help",
    "unknown",
  ],

  // Valid entity values
  entities: {
    status: ["pending", "processing", "completed", "failed"],
    source: ["whatsapp", "slack", "user_upload", "integration"],
    documentType: [
      "invoice",
      "receipt",
      "purchase_order",
      "credit_note",
      "quote",
      "contract",
      "statement",
      "other",
    ],
  },

  // Valid field names for different operations
  fields: {
    aggregation: [
      "totalAmount",
      "subtotalAmount",
      "taxAmount",
      "size",
      "count",
    ],
    groupBy: ["status", "source", "documentType", "vendor", "date"],
    sorting: [
      "createdAt",
      "updatedAt",
      "size",
      "totalAmount",
      "confidence",
      "fileName",
    ],
  },

  // Limits and constraints
  constraints: {
    limit: {
      min: 1,
      max: 100,
      default: 20,
    },
    confidence: {
      min: 0,
      max: 1,
    },
  },
};

// Field mappings for database columns
export const FieldMappings = {
  // Maps sort fields to their database columns
  sortFields: {
    createdAt: "files.createdAt",
    updatedAt: "files.updatedAt",
    size: "files.size",
    fileName: "files.fileName",
    confidence: "documentExtractions.overallConfidence",
    totalAmount: "extractedFields.totalAmount",
  },

  // Maps aggregation fields to their JSON paths
  aggregationFields: {
    totalAmount: {
      table: "documentExtractions",
      path: "extractedFields->>'totalAmount'->>'value'",
    },
    subtotalAmount: {
      table: "documentExtractions",
      path: "extractedFields->>'subtotalAmount'->>'value'",
    },
    taxAmount: {
      table: "documentExtractions",
      path: "extractedFields->>'taxAmount'->>'value'",
    },
    size: { table: "files", path: "size" },
    count: { table: "files", path: "*" },
  },

  // Fields that require joining with document_extractions
  extractionRequiredFields: [
    "documentType",
    "vendor",
    "confidence",
    "totalAmount",
    "subtotalAmount",
    "taxAmount",
  ],
};

// Helper to get config dynamically (could be extended to load from DB/env)
export function getValidationConfig() {
  return ValidationConfig;
}

// Helper to get field mappings
export function getFieldMappings() {
  return FieldMappings;
}
