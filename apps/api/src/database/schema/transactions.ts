import { pgTable, uuid, varchar, text, jsonb, timestamp, decimal, boolean, date, pgEnum, index, unique, integer } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { integrations } from './integrations'

// Enums for transaction classification
export const providerTypeEnum = pgEnum('provider_type', [
  'xero',
  'quickbooks', 
  'bank_direct',
  'manual',
  'csv_import'
])

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',     // Not yet cleared
  'cleared',     // Cleared/posted
  'reconciled',  // Matched and reconciled
  'disputed',    // Under dispute
  'void'         // Cancelled/voided
])

export const enrichmentStatusEnum = pgEnum('enrichment_status', [
  'pending',     // Waiting for enrichment
  'processing',  // Currently being processed
  'completed',   // Enrichment complete
  'failed'       // Enrichment failed
])

// Main transactions table - stores raw transaction data from imports
export const transactions = pgTable('transactions', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Source tracking
  integrationId: uuid('integration_id').references(() => integrations.id, { onDelete: 'set null' }),
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
  providerType: providerTypeEnum('provider_type').notNull(),
  
  // Core transaction data (from initial import)
  transactionDate: date('transaction_date').notNull(),
  postedDate: date('posted_date'), // When transaction actually cleared
  amount: decimal('amount', { precision: 18, scale: 6 }).notNull(), // Gross amount
  currency: varchar('currency', { length: 10 }).notNull(), // ISO currency code
  
  // Transaction Type (Xero compatibility)
  transactionType: varchar('transaction_type', { length: 50 }), // SPEND, RECEIVE, SPEND-OVERPAYMENT, RECEIVE-PREPAYMENT
  
  // Multi-currency support
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }),
  baseCurrencyAmount: decimal('base_currency_amount', { precision: 18, scale: 6 }),
  
  // Source account information (bank/source account)
  sourceAccountId: varchar('source_account_id', { length: 255 }), // Provider's account ID
  sourceAccountName: varchar('source_account_name', { length: 255 }), // Human readable account name
  sourceAccountType: varchar('source_account_type', { length: 100 }), // checking, savings, credit, etc.
  
  // Banking specific fields
  balanceAfter: decimal('balance_after', { precision: 18, scale: 6 }), // Account balance after transaction
  transactionFee: decimal('transaction_fee', { precision: 18, scale: 6 }), // Bank fees applied
  
  // Transaction details (raw from provider)
  rawDescription: text('raw_description'), // Original description from provider/bank
  transactionReference: varchar('transaction_reference', { length: 255 }), // Transaction reference/number
  memo: text('memo'), // Additional memo/notes
  
  // Enhanced Coding Fields
  accountId: uuid('account_id'), // GL account reference
  accountCode: varchar('account_code', { length: 50 }), // Denormalized GL code
  supplierId: uuid('supplier_id'), // Linked supplier
  supplierName: varchar('supplier_name', { length: 500 }), // Denormalized for history
  sourceInvoiceId: uuid('source_invoice_id'), // Linked invoice
  
  // Payment Information
  paymentMethod: varchar('payment_method', { length: 50 }), // CHECK, WIRE, ACH, CARD, CASH
  checkNumber: varchar('check_number', { length: 50 }), // For check payments
  
  // Xero-specific References
  overpaymentId: varchar('overpayment_id', { length: 255 }), // Link to overpayment record
  prepaymentId: varchar('prepayment_id', { length: 255 }), // Link to prepayment record
  url: varchar('url', { length: 500 }), // Source document URL
  
  // Bank Statement Matching
  statementDate: date('statement_date'), // When on statement
  statementDescription: text('statement_description'), // Exact bank text
  statementBalance: decimal('statement_balance', { precision: 18, scale: 6 }), // Balance on statement
  bankStatementId: uuid('bank_statement_id'), // Source statement
  
  // AI Enhancement Fields
  enrichedDescription: text('enriched_description'), // Cleaned description
  merchantName: varchar('merchant_name', { length: 500 }), // Extracted merchant
  merchantCategory: varchar('merchant_category', { length: 100 }), // Business category
  location: varchar('location', { length: 255 }), // Transaction location
  
  // Categorization
  autoCategorized: boolean('auto_categorized').default(false), // AI categorized
  categoryConfidence: decimal('category_confidence', { precision: 3, scale: 2 }), // AI confidence
  suggestedAccountId: uuid('suggested_account_id'), // AI suggestion
  suggestedSupplierId: uuid('suggested_supplier_id'), // AI suggestion
  
  // Split Transaction Support
  isSplit: boolean('is_split').default(false), // Has multiple parts
  parentTransactionId: uuid('parent_transaction_id'), // Parent if split
  splitCount: integer('split_count').default(0), // Number of splits
  
  // Multi-currency Enhancement
  originalCurrency: varchar('original_currency', { length: 3 }), // Currency on statement
  originalAmount: decimal('original_amount', { precision: 18, scale: 6 }), // Amount in original
  exchangeRateDate: date('exchange_rate_date'), // Rate date used
  
  // Document Management
  relatedDocumentIds: uuid('related_document_ids').array(), // Linked documents
  attachmentCount: integer('attachment_count').default(0), // Number of attachments
  hasReceipt: boolean('has_receipt').default(false), // Receipt attached
  
  // Quality Flags
  needsReview: boolean('needs_review').default(false), // Requires attention
  reviewReason: varchar('review_reason', { length: 255 }), // Why review needed
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }), // Overall confidence
  
  // Custom Metadata
  metadata: jsonb('metadata').default('{}'), // Arbitrary key-value pairs for integrations
  
  // Reconciliation status
  isReconciled: boolean('is_reconciled').default(false).notNull(),
  reconciledAt: timestamp('reconciled_at'),
  reconciledBy: uuid('reconciled_by'), // User who reconciled
  
  // Status tracking
  status: transactionStatusEnum('status').default('pending').notNull(),
  
  // Provider-specific raw data (for audit trail and provider-specific features)
  providerData: jsonb('provider_data').default('{}').notNull(),
  
  // Enrichment pipeline (simplified for MVP)
  enrichmentStatus: enrichmentStatusEnum('enrichment_status').default('pending').notNull(),
  
  // Audit trail
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  syncedAt: timestamp('synced_at'), // When last synced from provider
}, (table) => ({
  // Primary indexes for performance
  tenantDateIdx: index('transactions_tenant_date_idx').on(table.tenantId, table.transactionDate.desc()),
  tenantStatusIdx: index('transactions_tenant_status_idx').on(table.tenantId, table.status),
  integrationSyncIdx: index('transactions_integration_sync_idx').on(table.integrationId, table.syncedAt),
  reconciledIdx: index('transactions_reconciled_idx').on(table.tenantId, table.isReconciled),
  supplierIdx: index('transactions_supplier_idx').on(table.tenantId, table.supplierId),
  accountIdx: index('transactions_account_idx').on(table.tenantId, table.accountId),
  invoiceIdx: index('transactions_invoice_idx').on(table.sourceInvoiceId),
  needsReviewIdx: index('transactions_needs_review_idx').on(table.tenantId, table.needsReview),
  
  // Unique constraint to prevent duplicate imports
  uniqueProviderTransaction: unique('transactions_unique_provider').on(
    table.tenantId,
    table.integrationId,
    table.providerTransactionId
  ),
}))

// Line items table - stores reconciliation and coding data
export const transactionLineItems = pgTable('transaction_line_items', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Account classification (added during reconciliation)
  expenseAccountId: varchar('expense_account_id', { length: 255 }), // Expense/Income account ID
  expenseAccountName: varchar('expense_account_name', { length: 255 }), // Account name
  expenseAccountCode: varchar('expense_account_code', { length: 50 }), // Account code
  expenseAccountType: varchar('expense_account_type', { length: 100 }), // expense, income, asset, liability
  
  // Line item financial details
  lineAmount: decimal('line_amount', { precision: 18, scale: 6 }).notNull(), // Net amount
  lineDescription: varchar('line_description', { length: 255 }), // Line item description
  
  // Item/inventory support (simplified)
  itemId: varchar('item_id', { length: 255 }), // Inventory item ID
  quantity: decimal('quantity', { precision: 10, scale: 4 }), // Item quantity
  unitAmount: decimal('unit_amount', { precision: 18, scale: 6 }), // Price per unit
  
  // Tax information (added during reconciliation)
  taxType: varchar('tax_type', { length: 50 }), // INPUT, OUTPUT, NONE, etc.
  taxAmount: decimal('tax_amount', { precision: 18, scale: 6 }), // Tax amount
  taxRate: decimal('tax_rate', { precision: 5, scale: 4 }), // Tax rate percentage
  taxCode: varchar('tax_code', { length: 50 }), // Tax code/classification
  isTaxInclusive: boolean('is_tax_inclusive').default(false), // Whether amount includes tax
  
  // Contact/Supplier information (matched during reconciliation)
  contactId: varchar('contact_id', { length: 255 }), // Supplier/customer ID
  contactName: varchar('contact_name', { length: 255 }), // Supplier/customer name
  contactType: varchar('contact_type', { length: 50 }), // supplier, customer, employee
  
  // Flexible tracking categories (for future extensions)
  trackingCategories: jsonb('tracking_categories').default('{}').notNull(),
  
  // Audit trail
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for line item queries
  transactionIdx: index('line_items_transaction_idx').on(table.transactionId),
  tenantAccountIdx: index('line_items_tenant_account_idx').on(table.tenantId, table.expenseAccountId),
  contactIdx: index('line_items_contact_idx').on(table.tenantId, table.contactId),
}))

// Type definitions for TypeScript
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type TransactionLineItem = typeof transactionLineItems.$inferSelect
export type NewTransactionLineItem = typeof transactionLineItems.$inferInsert


// Utility types for transaction states
export type TransactionWithLineItems = Transaction & {
  lineItems: TransactionLineItem[]
}

export type UnreconciledTransaction = Transaction & {
  isReconciled: false
  lineItems: []
}

export type ReconciledTransaction = Transaction & {
  isReconciled: true
  lineItems: TransactionLineItem[]
}