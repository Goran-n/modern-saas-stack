import { pgTable, text, varchar, boolean, decimal, integer, timestamp, uuid, jsonb, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { suppliers } from './suppliers';
import { integrations } from './integrations';
import { transactions } from './transactions';

export const invoices = pgTable('invoices', {
  // Primary Keys
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Source Tracking (Required)
  integrationId: uuid('integration_id').references(() => integrations.id),
  providerInvoiceId: varchar('provider_invoice_id', { length: 255 }).notNull(),
  
  // Invoice Type & Status
  invoiceType: varchar('invoice_type', { length: 50 }).notNull(),
  invoiceSubtype: varchar('invoice_subtype', { length: 50 }),
  status: varchar('status', { length: 50 }).notNull(),
  
  // Invoice Identification
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  reference: varchar('reference', { length: 500 }),
  
  // Xero-specific Fields
  repeatingInvoiceId: varchar('repeating_invoice_id', { length: 255 }),
  brandingThemeId: varchar('branding_theme_id', { length: 255 }),
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  
  // Dates (Flexible)
  invoiceDate: date('invoice_date'),
  dueDate: date('due_date'),
  serviceDate: date('service_date'),
  periodStartDate: date('period_start_date'),
  periodEndDate: date('period_end_date'),
  
  // Parties
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierName: varchar('supplier_name', { length: 500 }),
  
  // Original Amounts (As per invoice)
  subtotalAmount: decimal('subtotal_amount', { precision: 18, scale: 6 }),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 6 }),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 6 }),
  totalAmount: decimal('total_amount', { precision: 18, scale: 6 }).notNull(),
  
  // Currency (Multi-currency support)
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 10 }),
  baseCurrencyCode: varchar('base_currency_code', { length: 3 }),
  baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 6 }),
  
  // Payment Tracking
  amountPaid: decimal('amount_paid', { precision: 18, scale: 6 }).default('0'),
  amountCredited: decimal('amount_credited', { precision: 18, scale: 6 }).default('0'),
  amountDue: decimal('amount_due', { precision: 18, scale: 6 }),
  
  // Payment Information
  fullyPaid: boolean('fully_paid').default(false),
  paymentDate: date('payment_date'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  expectedPaymentDate: date('expected_payment_date'),
  plannedPaymentDate: date('planned_payment_date'),
  
  // Line Items (Embedded for performance)
  lineItems: jsonb('line_items').default([]).$type<Array<{
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercentage?: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    totalAmount: number;
    accountCode?: string;
    trackingCategories?: Record<string, any>;
    customFields?: Record<string, any>;
  }>>(),
  lineItemsCount: integer('line_items_count').default(0),
  
  // Tax Details (Flexible for global support)
  taxInclusive: boolean('tax_inclusive').default(true),
  taxCalculationType: varchar('tax_calculation_type', { length: 50 }),
  lineAmountTypes: varchar('line_amount_types', { length: 20 }).default('Exclusive'),
  taxDetails: jsonb('tax_details').default({}).$type<{
    rates?: Record<string, number>;
    amounts?: Record<string, number>;
    exemptions?: string[];
    taxPointDate?: string;
  }>(),
  
  // Approval Workflow
  approvalStatus: varchar('approval_status', { length: 50 }),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  approvalNotes: text('approval_notes'),
  
  // Attachments
  hasAttachments: boolean('has_attachments').default(false),
  attachmentCount: integer('attachment_count').default(0),
  attachmentIds: text('attachment_ids').array(),
  
  // AI Processing Fields
  extractedEntities: jsonb('extracted_entities').default({}).$type<{
    vendorName?: string;
    invoiceNumber?: string;
    amounts?: Record<string, any>;
    lineItems?: any[];
    confidenceScores?: Record<string, number>;
  }>(),
  ocrProcessed: boolean('ocr_processed').default(false),
  ocrConfidence: decimal('ocr_confidence', { precision: 3, scale: 2 }),
  
  // Provider Data (Full object for edge cases)
  providerData: jsonb('provider_data').default({}).$type<Record<string, any>>(),
  providerUpdatedAt: timestamp('provider_updated_at'),
  
  // Processing Flags
  needsReview: boolean('needs_review').default(false),
  reviewNotes: text('review_notes'),
  processingErrors: jsonb('processing_errors').default([]).$type<Array<{
    error: string;
    timestamp: string;
    field?: string;
  }>>(),
  
  // Custom Metadata
  metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
  
  // Audit Fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  importedAt: timestamp('imported_at').defaultNow(),
  lastSyncedAt: timestamp('last_synced_at'),
  syncVersion: integer('sync_version').default(0),
}, (table) => ({
  // Indexes
  tenantDateIdx: index('idx_invoices_tenant_date').on(table.tenantId, table.invoiceDate),
  tenantSupplierIdx: index('idx_invoices_tenant_supplier').on(table.tenantId, table.supplierId),
  tenantStatusIdx: index('idx_invoices_tenant_status').on(table.tenantId, table.status),
  tenantDueIdx: index('idx_invoices_tenant_due').on(table.tenantId, table.dueDate),
  needsReviewIdx: index('idx_invoices_needs_review').on(table.tenantId, table.needsReview),
  providerInvoiceUnique: uniqueIndex('unique_provider_invoice').on(table.tenantId, table.integrationId, table.providerInvoiceId),
}));

// Relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  integration: one(integrations, {
    fields: [invoices.integrationId],
    references: [integrations.id],
  }),
  supplier: one(suppliers, {
    fields: [invoices.supplierId],
    references: [suppliers.id],
  }),
  transactions: many(transactions),
}));

// Types
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// Enums
export const INVOICE_TYPE = {
  BILL: 'bill',
  INVOICE: 'invoice',
  CREDIT_NOTE: 'credit_note',
  DEBIT_NOTE: 'debit_note',
} as const;

export const INVOICE_SUBTYPE = {
  RECURRING: 'recurring',
  DEPOSIT: 'deposit',
  PROGRESS: 'progress',
  PREPAYMENT: 'prepayment',
} as const;

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  PAID: 'paid',
  VOID: 'void',
  DELETED: 'deleted',
} as const;

export const LINE_AMOUNT_TYPES = {
  EXCLUSIVE: 'Exclusive',
  INCLUSIVE: 'Inclusive',
  NO_TAX: 'NoTax',
} as const;