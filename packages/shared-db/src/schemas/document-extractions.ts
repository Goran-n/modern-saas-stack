import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { files } from "./files";
import { suppliers } from "./suppliers";

export const documentTypeEnum = pgEnum("document_type", [
  "invoice",
  "receipt",
  "purchase_order",
  "credit_note",
  "quote",
  "contract",
  "statement",
  "other",
]);

export const validationStatusEnum = pgEnum("validation_status", [
  "valid",
  "needs_review",
  "invalid",
]);

export const extractionMethodEnum = pgEnum("extraction_method", [
  "primary",
  "ocr_fallback",
  "manual",
]);

export const documentExtractions = pgTable("document_extractions", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id")
    .notNull()
    .references(() => files.id),

  // Document classification
  documentType: documentTypeEnum("document_type").notNull(),
  documentTypeConfidence: numeric("document_type_confidence", {
    precision: 5,
    scale: 2,
  }).notNull(),

  // Extracted data with confidence
  extractedFields: jsonb("extracted_fields")
    .notNull()
    .$type<import("../types").ExtractedFields>(), // Field values with confidence scores
  companyProfile:
    jsonb("company_profile").$type<import("../types").CompanyProfile>(), // Standardised company data
  lineItems: jsonb("line_items").array().$type<import("../types").LineItem[]>(), // Array of line items

  // Quality metrics
  overallConfidence: numeric("overall_confidence", {
    precision: 5,
    scale: 2,
  }).notNull(),
  dataCompleteness: numeric("data_completeness", {
    precision: 5,
    scale: 2,
  }).notNull(),
  validationStatus: validationStatusEnum("validation_status").notNull(),

  // Annotations for highlighting
  annotations:
    jsonb("annotations").$type<import("../types").FieldAnnotation[]>(),

  // Supplier matching
  matchedSupplierId: uuid("matched_supplier_id").references(() => suppliers.id),
  matchConfidence: numeric("match_confidence", { precision: 5, scale: 2 }),
  suggestedMatches: jsonb("suggested_matches")
    .array()
    .$type<import("../types").SuggestedMatch[]>(),

  // Processing metadata
  extractionMethod: extractionMethodEnum("extraction_method").notNull(),
  processingDurationMs: integer("processing_duration_ms").notNull(),
  modelVersion: text("model_version").notNull(),
  errors: jsonb("errors")
    .default([])
    .$type<import("../types").ExtractionError[]>(),
  processingNotes: text("processing_notes"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type exports
export type DocumentExtraction = typeof documentExtractions.$inferSelect;
export type NewDocumentExtraction = typeof documentExtractions.$inferInsert;
