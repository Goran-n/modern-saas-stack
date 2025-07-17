import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tenants } from './tenants';

// Enums
export const supplierStatusEnum = pgEnum('supplier_status', [
  'active',
  'inactive', 
  'deleted',
]);

export const dataSourceEnum = pgEnum('data_source', [
  'invoice',
  'manual',
]);

export const attributeTypeEnum = pgEnum('attribute_type', [
  'address',
  'phone',
  'email',
  'website',
  'bank_account',
]);

// Main suppliers table
export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Identifiers - at least one required
  companyNumber: text('company_number'),
  vatNumber: text('vat_number'),
  
  // Basic info
  legalName: text('legal_name').notNull(),
  displayName: text('display_name').notNull(),
  slug: text('slug').notNull(),
  
  // Status
  status: supplierStatusEnum('status').notNull().default('active'),
  
  // Tenant relationship
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  // Indexes
  tenantIdx: index('idx_suppliers_tenant_id').on(table.tenantId),
  statusIdx: index('idx_suppliers_status').on(table.status),
  companyNumberIdx: index('idx_suppliers_company_number').on(table.companyNumber),
  vatNumberIdx: index('idx_suppliers_vat_number').on(table.vatNumber),
  
  // Unique constraints
  uniqueCompanyNumberPerTenant: uniqueIndex('unique_company_number_per_tenant')
    .on(table.tenantId, table.companyNumber)
    .where(sql`company_number IS NOT NULL`),
  
  // VAT Number Constraint Decision:
  // We intentionally DO NOT have a unique constraint on VAT numbers per tenant.
  // This is because a single VAT-registered entity can have multiple trading names,
  // each potentially being a separate supplier in our system.
  // Example: A parent company with VAT number GB123456789 might trade as:
  // - "ABC Supplies Ltd" for one product line
  // - "XYZ Distribution" for another product line
  // Each would be a separate supplier record but share the same VAT number.
  // This is a common business practice and our system must support it.
  uniqueSlugPerTenant: uniqueIndex('unique_slug_per_tenant')
    .on(table.tenantId, table.slug),
}));

// Data sources tracking
export const supplierDataSources = pgTable('supplier_data_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  
  // Source information
  sourceType: dataSourceEnum('source_type').notNull(),
  sourceId: text('source_id'),
  
  // Tracking
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  supplierIdx: index('idx_supplier_data_sources_supplier_id').on(table.supplierId),
  sourceTypeIdx: index('idx_supplier_data_sources_source_type').on(table.sourceType),
  uniqueSourcePerSupplier: uniqueIndex('unique_source_per_supplier')
    .on(table.supplierId, table.sourceType, table.sourceId),
}));

// Supplier attributes (addresses, contacts, etc.)
export const supplierAttributes = pgTable('supplier_attributes', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  
  // Attribute info
  attributeType: attributeTypeEnum('attribute_type').notNull(),
  value: jsonb('value').notNull(),
  hash: text('hash').notNull(), // SHA256 hash for deduplication
  
  // Source tracking
  sourceType: dataSourceEnum('source_type').notNull(),
  sourceId: text('source_id'),
  
  // Confidence and status
  confidence: integer('confidence').notNull().default(50),
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  
  // Occurrence tracking
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  seenCount: integer('seen_count').notNull().default(1),
  
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
}, (table) => ({
  supplierIdx: index('idx_supplier_attributes_supplier_id').on(table.supplierId),
  typeIdx: index('idx_supplier_attributes_type').on(table.attributeType),
  activeIdx: index('idx_supplier_attributes_active').on(table.isActive),
  hashIdx: index('idx_supplier_attributes_hash').on(table.hash),
  uniqueAttributeValue: uniqueIndex('unique_attribute_value')
    .on(table.supplierId, table.attributeType, table.hash),
}));

// Relations
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  dataSources: many(supplierDataSources),
  attributes: many(supplierAttributes),
}));

export const supplierDataSourcesRelations = relations(supplierDataSources, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierDataSources.supplierId],
    references: [suppliers.id],
  }),
}));

export const supplierAttributesRelations = relations(supplierAttributes, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierAttributes.supplierId],
    references: [suppliers.id],
  }),
}));