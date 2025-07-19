import type {
  CompanyProfile,
  ExtractedFields,
  ExtractedFieldValue,
} from "@kibly/shared-db";
import { z } from "zod";
import {
  DOCUMENT_TYPES,
  EXTRACTION_METHODS,
  FIELD_SOURCES,
  TAX_TYPES,
  VALIDATION_STATUSES,
} from "./constants";

// Document types that we can classify
export const documentTypeEnum = z.enum(DOCUMENT_TYPES);

export type DocumentType = z.infer<typeof documentTypeEnum>;

// Field confidence schema - matches database ExtractedFieldValue
export const fieldWithConfidenceSchema = z.object({
  value: z.any(),
  confidence: z.number().min(0).max(100),
  source: z.enum(FIELD_SOURCES).default("ai_extraction"),
  alternativeValues: z
    .array(
      z.object({
        value: z.any(),
        confidence: z.number().min(0).max(100),
      }),
    )
    .optional(),
});

// Company profile schema removed - using database type directly

// Annotation for highlighting extracted fields
export const fieldAnnotationSchema = z.object({
  fieldName: z.string(),
  pageNumber: z.number(),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  textContent: z.string(),
});

// Main extraction result schema
export const extractedDocumentSchema = z.object({
  // Document metadata
  documentType: documentTypeEnum,
  documentTypeConfidence: z.number().min(0).max(100),
  processingVersion: z.string(),

  // Extraction results - now using database ExtractedFields type
  fields: z.custom<ExtractedFields>(),

  // Company profile (for invoices, receipts, etc.)
  companyProfile: z.custom<CompanyProfile>().optional(),

  // Line items for invoices/receipts
  lineItems: z
    .array(
      z.object({
        description: z.string().nullable(),
        quantity: z.number().nullable(),
        unitPrice: z.number().nullable(),
        totalPrice: z.number().nullable(),
        taxAmount: z.number().nullable(),
        confidence: z.number().min(0).max(100),
      }),
    )
    .optional(),

  // Quality metrics
  overallConfidence: z.number().min(0).max(100),
  dataCompleteness: z.number().min(0).max(100),
  validationStatus: z.enum(VALIDATION_STATUSES),

  // Annotation data
  annotations: z.array(fieldAnnotationSchema).optional(),

  // Processing metadata
  extractionMethod: z.enum(EXTRACTION_METHODS),
  processingDuration: z.number(), // milliseconds
  errors: z
    .array(
      z.object({
        field: z.string(),
        error: z.string(),
      }),
    )
    .default([]),
});

// Line item schema
export const lineItemSchema = z.object({
  description: z.string().nullable(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  totalPrice: z.number().nullable(),
  taxAmount: z.number().nullable(),
});

// Schema for the accounting document extraction
export const accountingDocumentSchema = z.object({
  // Core financial fields
  totalAmount: z.number().nullable().describe("Total amount including tax"),
  subtotalAmount: z.number().nullable().describe("Amount before tax"),
  taxAmount: z.number().nullable().describe("Tax amount"),
  taxRate: z.number().nullable().describe("Tax rate as percentage"),
  taxType: z.enum(TAX_TYPES).nullable(),
  currency: z
    .string()
    .nullable()
    .describe("Three-letter ISO 4217 currency code"),

  // Document identifiers
  documentNumber: z.string().nullable().describe("Invoice/receipt number"),
  documentDate: z.string().nullable().describe("Document date in ISO format"),
  dueDate: z.string().nullable().describe("Payment due date in ISO format"),

  // Vendor information
  vendorName: z.string().nullable().describe("Legal name of the vendor"),
  vendorAddress: z.string().nullable().describe("Complete vendor address"),
  vendorCity: z.string().nullable().describe("Vendor city"),
  vendorPostalCode: z.string().nullable().describe("Vendor postal/ZIP code"),
  vendorCountry: z.string().nullable().describe("Vendor country ISO code"),
  vendorEmail: z.string().email().nullable(),
  vendorPhone: z.string().nullable(),
  vendorWebsite: z.string().nullable(),
  vendorTaxId: z.string().nullable().describe("VAT/Tax ID of vendor"),
  vendorCompanyNumber: z
    .string()
    .nullable()
    .describe("Company registration number"),

  // Customer information
  customerName: z.string().nullable(),
  customerAddress: z.string().nullable(),
  customerEmail: z.string().email().nullable(),
  customerTaxId: z.string().nullable(),

  // Payment information
  paymentMethod: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  bankAccount: z.string().nullable(),

  // Additional metadata
  language: z.string().nullable(),
  notes: z.string().nullable(),

  // Line items
  lineItems: z.array(lineItemSchema).default([]),
});

// Types - now using database types as single source of truth
export type ExtractedDocument = z.infer<typeof extractedDocumentSchema>;
export type AccountingDocument = z.infer<typeof accountingDocumentSchema>;
export type FieldWithConfidence = ExtractedFieldValue; // Use database type
export type {
  CompanyProfile,
  ExtractionError,
  FieldAnnotation,
  LineItem,
} from "@kibly/shared-db";
