import { z } from 'zod';
import { 
  DOCUMENT_TYPES, 
  TAX_TYPES, 
  VALIDATION_STATUSES, 
  EXTRACTION_METHODS, 
  FIELD_SOURCES,
  ADDRESS_TYPES 
} from './constants';

// Document types that we can classify
export const documentTypeEnum = z.enum(DOCUMENT_TYPES);

export type DocumentType = z.infer<typeof documentTypeEnum>;

// Field confidence schema
export const fieldWithConfidenceSchema = z.object({
  value: z.any(),
  confidence: z.number().min(0).max(100),
  source: z.enum(FIELD_SOURCES).default('ai_extraction'),
  alternativeValues: z.array(z.object({
    value: z.any(),
    confidence: z.number().min(0).max(100),
  })).optional(),
});

// Company profile schema for standardised supplier data
export const companyProfileSchema = z.object({
  // Primary identifiers
  taxIdentifiers: z.object({
    vatNumber: z.string().optional(),
    taxId: z.string().optional(),
    companyNumber: z.string().optional(),
    countryCode: z.string(),
  }),
  
  // Company details
  legalName: z.string(),
  tradingNames: z.array(z.string()).default([]),
  
  // Contact information
  addresses: z.array(z.object({
    type: z.enum(ADDRESS_TYPES),
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string(),
    confidence: z.number().min(0).max(100),
  })).default([]),
  
  primaryEmail: z.string().email().optional(),
  domains: z.array(z.string()).default([]),
  phones: z.array(z.string()).default([]),
  
  // Financial details
  bankAccounts: z.array(z.object({
    accountNumber: z.string().optional(),
    iban: z.string().optional(),
    swiftCode: z.string().optional(),
    bankName: z.string().optional(),
  })).default([]),
  paymentMethods: z.array(z.string()).default([]),
  defaultCurrency: z.string().optional(),
  
  // Matching metadata
  normalizedName: z.string(),
  matchingKeys: z.array(z.string()).default([]),
  lastVerifiedDate: z.date().optional(),
});

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
  
  // Extraction results
  fields: z.record(z.string(), fieldWithConfidenceSchema),
  
  // Company profile (for invoices, receipts, etc.)
  companyProfile: companyProfileSchema.optional(),
  
  // Line items for invoices/receipts
  lineItems: z.array(z.object({
    description: z.string().nullable(),
    quantity: z.number().nullable(),
    unitPrice: z.number().nullable(),
    totalPrice: z.number().nullable(),
    taxAmount: z.number().nullable(),
    confidence: z.number().min(0).max(100),
  })).optional(),
  
  // Quality metrics
  overallConfidence: z.number().min(0).max(100),
  dataCompleteness: z.number().min(0).max(100),
  validationStatus: z.enum(VALIDATION_STATUSES),
  
  // Annotation data
  annotations: z.array(fieldAnnotationSchema).optional(),
  
  // Processing metadata
  extractionMethod: z.enum(EXTRACTION_METHODS),
  processingDuration: z.number(), // milliseconds
  errors: z.array(z.object({
    field: z.string(),
    error: z.string(),
  })).default([]),
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
  totalAmount: z.number().nullable().describe('Total amount including tax'),
  subtotalAmount: z.number().nullable().describe('Amount before tax'),
  taxAmount: z.number().nullable().describe('Tax amount'),
  taxRate: z.number().nullable().describe('Tax rate as percentage'),
  taxType: z.enum(TAX_TYPES).nullable(),
  currency: z.string().nullable().describe('Three-letter ISO 4217 currency code'),
  
  // Document identifiers
  documentNumber: z.string().nullable().describe('Invoice/receipt number'),
  documentDate: z.string().nullable().describe('Document date in ISO format'),
  dueDate: z.string().nullable().describe('Payment due date in ISO format'),
  
  // Vendor information
  vendorName: z.string().nullable().describe('Legal name of the vendor'),
  vendorAddress: z.string().nullable().describe('Complete vendor address'),
  vendorCity: z.string().nullable().describe('Vendor city'),
  vendorPostalCode: z.string().nullable().describe('Vendor postal/ZIP code'),
  vendorCountry: z.string().nullable().describe('Vendor country ISO code'),
  vendorEmail: z.string().email().nullable(),
  vendorPhone: z.string().nullable(),
  vendorWebsite: z.string().nullable(),
  vendorTaxId: z.string().nullable().describe('VAT/Tax ID of vendor'),
  
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

// Types
export type ExtractedDocument = z.infer<typeof extractedDocumentSchema>;
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type AccountingDocument = z.infer<typeof accountingDocumentSchema>;
export type FieldWithConfidence = z.infer<typeof fieldWithConfidenceSchema>;
export type FieldAnnotation = z.infer<typeof fieldAnnotationSchema>;