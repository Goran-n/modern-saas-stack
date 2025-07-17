import { z } from 'zod';

// ============================================
// Base Types
// ============================================

export const SupplierStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
} as const;

export const DataSource = {
  INVOICE: 'invoice',
  MANUAL: 'manual',
} as const;

export const AttributeType = {
  ADDRESS: 'address',
  PHONE: 'phone',
  EMAIL: 'email',
  WEBSITE: 'website',
  BANK_ACCOUNT: 'bank_account',
} as const;

// ============================================
// Core Schemas
// ============================================

// Identifiers with validation
export const identifierSchema = z.object({
  companyNumber: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
}).refine(
  data => data.companyNumber || data.vatNumber,
  { message: 'At least one identifier (companyNumber or vatNumber) is required' }
);

// Address schema
export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  postalCode: z.string().optional().nullable(),
  country: z.string().length(2), // ISO country code
});

// Contact information
export const contactSchema = z.object({
  type: z.enum(['phone', 'email', 'website']),
  value: z.string().min(1),
  isPrimary: z.boolean().default(false),
});

// Bank account
export const bankAccountSchema = z.object({
  accountName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  sortCode: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
}).refine(
  data => data.accountNumber || data.iban,
  { message: 'Either accountNumber or IBAN is required' }
);

// ============================================
// Ingestion Schema
// ============================================

export const supplierIngestionDataSchema = z.object({
  identifiers: identifierSchema,
  name: z.string().min(1).max(200),
  addresses: z.array(addressSchema).default([]),
  contacts: z.array(contactSchema).default([]),
  bankAccounts: z.array(bankAccountSchema).default([]),
});

export const supplierIngestionRequestSchema = z.object({
  source: z.nativeEnum(DataSource),
  sourceId: z.string(), // e.g., invoice ID
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  data: supplierIngestionDataSchema,
});

// ============================================
// Database Models
// ============================================

export const supplierSchema = z.object({
  id: z.string().uuid(),
  companyNumber: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  legalName: z.string(),
  displayName: z.string(),
  slug: z.string(),
  status: z.nativeEnum(SupplierStatus),
  tenantId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional().nullable(),
});

export const supplierAttributeSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  attributeType: z.nativeEnum(AttributeType),
  value: z.record(z.string(), z.unknown()),
  hash: z.string(),
  source: z.nativeEnum(DataSource),
  sourceId: z.string(),
  confidence: z.number().min(0).max(100),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  firstSeenAt: z.date(),
  lastSeenAt: z.date(),
  seenCount: z.number().default(1),
  createdAt: z.date(),
  createdBy: z.string().uuid().optional().nullable(),
});

// ============================================
// Type Exports
// ============================================

export type SupplierStatus = typeof SupplierStatus[keyof typeof SupplierStatus];
export type DataSource = typeof DataSource[keyof typeof DataSource];
export type AttributeType = typeof AttributeType[keyof typeof AttributeType];

export type Identifiers = z.infer<typeof identifierSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type BankAccount = z.infer<typeof bankAccountSchema>;

export type SupplierIngestionData = z.infer<typeof supplierIngestionDataSchema>;
export type SupplierIngestionRequest = z.infer<typeof supplierIngestionRequestSchema>;

export type Supplier = z.infer<typeof supplierSchema>;
export type SupplierAttribute = z.infer<typeof supplierAttributeSchema>;