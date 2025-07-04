import { pgTable, text, varchar, boolean, decimal, integer, timestamp, uuid, jsonb, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { invoices } from './invoices';
import { transactions } from './transactions';

export const suppliers = pgTable('suppliers', {
  // Primary Keys
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Core Identification (Required)
  name: varchar('name', { length: 500 }).notNull(),
  displayName: varchar('display_name', { length: 500 }),
  
  // Additional Names (Edge Cases)
  legalName: varchar('legal_name', { length: 500 }),
  tradingNames: text('trading_names').array(),
  
  // Individual Contact Names (for Xero compatibility)
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  
  // External System Identifiers
  externalIds: jsonb('external_ids').default([]).$type<Array<{ system: string; id: string }>>(),
  companyNumber: varchar('company_number', { length: 50 }),
  
  // Contact Information (All Optional)
  primaryEmail: varchar('primary_email', { length: 255 }),
  additionalEmails: text('additional_emails').array(),
  primaryPhone: varchar('primary_phone', { length: 100 }),
  additionalPhones: text('additional_phones').array(),
  website: varchar('website', { length: 500 }),
  
  // Address Fields (Flexible Structure)
  addressLine1: varchar('address_line1', { length: 500 }),
  addressLine2: varchar('address_line2', { length: 500 }),
  addressLine3: varchar('address_line3', { length: 500 }),
  addressLine4: varchar('address_line4', { length: 500 }),
  city: varchar('city', { length: 255 }),
  stateProvince: varchar('state_province', { length: 255 }),
  postalCode: varchar('postal_code', { length: 50 }),
  countryCode: varchar('country_code', { length: 2 }),
  countryName: varchar('country_name', { length: 100 }),
  
  // Additional addresses as JSONB for multiple locations
  shippingAddresses: jsonb('shipping_addresses').default([]).$type<Array<{
    type: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  }>>(),
  billingAddresses: jsonb('billing_addresses').default([]).$type<Array<{
    type: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  }>>(),
  
  // Tax Information (Global Support)
  taxNumber: varchar('tax_number', { length: 100 }),
  taxNumberType: varchar('tax_number_type', { length: 50 }),
  secondaryTaxNumbers: jsonb('secondary_tax_numbers').default({}).$type<Record<string, string>>(),
  taxExempt: boolean('tax_exempt').default(false),
  taxExemptionReason: varchar('tax_exemption_reason', { length: 255 }),
  
  // Default Tax Types (Xero compatibility)
  defaultTaxTypeSales: varchar('default_tax_type_sales', { length: 50 }),
  defaultTaxTypePurchases: varchar('default_tax_type_purchases', { length: 50 }),
  
  // Banking Information (Optional)
  defaultCurrency: varchar('default_currency', { length: 3 }),
  bankAccountName: varchar('bank_account_name', { length: 255 }),
  bankAccountNumber: varchar('bank_account_number', { length: 100 }),
  bankAccountType: varchar('bank_account_type', { length: 50 }),
  bankName: varchar('bank_name', { length: 255 }),
  bankBranch: varchar('bank_branch', { length: 255 }),
  bankSwiftCode: varchar('bank_swift_code', { length: 20 }),
  bankRoutingNumber: varchar('bank_routing_number', { length: 50 }),
  additionalBankAccounts: jsonb('additional_bank_accounts').default([]).$type<Array<{
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
    routingNumber?: string;
  }>>(),
  
  // Payment Terms
  paymentTermsDays: integer('payment_terms_days'),
  paymentTermsType: varchar('payment_terms_type', { length: 50 }),
  paymentTermsDescription: text('payment_terms_description'),
  creditLimit: decimal('credit_limit', { precision: 18, scale: 2 }),
  
  // Classification
  supplierType: varchar('supplier_type', { length: 50 }).default('supplier'),
  isActive: boolean('is_active').default(true),
  isIndividual: boolean('is_individual').default(false),
  
  // Contact Status (Xero compatibility)
  contactStatus: varchar('contact_status', { length: 20 }).default('ACTIVE'),
  
  // Provider Mappings (Critical for Sync)
  providerIds: jsonb('provider_ids').default({}).$type<Record<string, string>>(),
  providerSyncData: jsonb('provider_sync_data').default({}).$type<Record<string, any>>(),
  
  // AI Enhancement Fields
  normalizedName: varchar('normalized_name', { length: 500 }),
  nameTokens: text('name_tokens').array(),
  industryCode: varchar('industry_code', { length: 50 }),
  supplierSize: varchar('supplier_size', { length: 20 }),
  
  // Metadata
  tags: text('tags').array(),
  customFields: jsonb('custom_fields').default({}).$type<Record<string, any>>(),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
  
  // Quality Indicators
  dataQualityScore: decimal('data_quality_score', { precision: 3, scale: 2 }),
  verifiedDate: date('verified_date'),
  verificationSource: varchar('verification_source', { length: 50 }),
  
  // Audit Fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 50 }),
  lastSyncedAt: timestamp('last_synced_at'),
  syncVersion: integer('sync_version').default(0),
}, (table) => ({
  // Indexes
  tenantNameIdx: index('idx_suppliers_tenant_name').on(table.tenantId, table.name),
  normalizedIdx: index('idx_suppliers_normalized').on(table.tenantId, table.normalizedName),
  taxNumberIdx: index('idx_suppliers_tax_number').on(table.tenantId, table.taxNumber),
  emailIdx: index('idx_suppliers_email').on(table.tenantId, table.primaryEmail),
  activeIdx: index('idx_suppliers_active').on(table.tenantId, table.isActive),
  externalIdsIdx: index('idx_suppliers_external_ids').using('gin', table.externalIds),
  statusIdx: index('idx_suppliers_status').on(table.tenantId, table.contactStatus),
  providerSupplierUnique: uniqueIndex('unique_provider_supplier').on(table.tenantId, table.providerIds),
}));

// Relations
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  invoices: many(invoices),
  transactions: many(transactions),
}));

// Types
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

// Enums
export const SUPPLIER_TYPE = {
  SUPPLIER: 'supplier',
  CUSTOMER: 'customer',
  BOTH: 'both',
  EMPLOYEE: 'employee',
  OTHER: 'other',
} as const;

export const CONTACT_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  GDPR_ERASED: 'GDPR_ERASED',
} as const;

export const PAYMENT_TERMS_TYPE = {
  NET: 'NET',
  EOM: 'EOM',
  COD: 'COD',
  CIA: 'CIA',
  DUEDATE: 'DUEDATE',
} as const;