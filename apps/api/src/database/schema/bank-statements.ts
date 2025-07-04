import { pgTable, text, varchar, boolean, decimal, integer, timestamp, uuid, jsonb, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { integrations } from './integrations';
import { transactions } from './transactions';
import { accounts } from './accounts';
import { suppliers } from './suppliers';
import { reconciliations } from './reconciliations';

export const bankStatements = pgTable('bank_statements', {
  // Primary Keys
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Import Source
  importSource: varchar('import_source', { length: 50 }).notNull(),
  importBatchId: uuid('import_batch_id'),
  integrationId: uuid('integration_id').references(() => integrations.id),
  
  // Bank Account Identification
  institutionName: varchar('institution_name', { length: 255 }),
  accountIdentifier: varchar('account_identifier', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 50 }),
  accountCurrency: varchar('account_currency', { length: 3 }).default('USD'),
  
  // Core Transaction Data
  transactionDate: date('transaction_date').notNull(),
  postedDate: date('posted_date'),
  description: text('description').notNull(),
  
  // Amounts
  amount: decimal('amount', { precision: 18, scale: 6 }).notNull(),
  balance: decimal('balance', { precision: 18, scale: 6 }),
  
  // Transaction Classification (From Bank)
  bankCategory: varchar('bank_category', { length: 100 }),
  transactionType: varchar('transaction_type', { length: 50 }),
  
  // Check Information
  checkNumber: varchar('check_number', { length: 50 }),
  
  // Enhanced Description Fields (AI Extraction)
  merchantName: varchar('merchant_name', { length: 500 }),
  merchantCleanName: varchar('merchant_clean_name', { length: 500 }),
  location: varchar('location', { length: 255 }),
  merchantCategoryCode: varchar('merchant_category_code', { length: 10 }),
  
  // Additional Bank Data
  referenceNumber: varchar('reference_number', { length: 100 }),
  transactionId: varchar('transaction_id', { length: 100 }),
  
  // Reconciliation Status
  matchStatus: varchar('match_status', { length: 20 }).default('unmatched'),
  matchedTransactionId: uuid('matched_transaction_id').references(() => transactions.id),
  matchConfidence: decimal('match_confidence', { precision: 3, scale: 2 }),
  matchedAt: timestamp('matched_at'),
  matchedBy: varchar('matched_by', { length: 50 }),
  
  // AI Categorization
  suggestedAccountId: uuid('suggested_account_id').references(() => accounts.id),
  suggestedSupplierId: uuid('suggested_supplier_id').references(() => suppliers.id),
  categoryConfidence: decimal('category_confidence', { precision: 3, scale: 2 }),
  entityExtraction: jsonb('entity_extraction').default({}).$type<{
    vendor?: string;
    invoiceNumber?: string;
    purpose?: string;
    confidenceScores?: Record<string, number>;
  }>(),
  
  // Duplicate Prevention
  dedupKey: varchar('dedup_key', { length: 255 }),
  isDuplicate: boolean('is_duplicate').default(false),
  duplicateOfId: uuid('duplicate_of_id'),
  
  // Pattern Recognition
  transactionPattern: varchar('transaction_pattern', { length: 255 }),
  isRecurring: boolean('is_recurring').default(false),
  recurrenceFrequency: varchar('recurrence_frequency', { length: 50 }),
  expectedNextDate: date('expected_next_date'),
  
  // Raw Data Storage
  rawData: jsonb('raw_data').default({}).$type<Record<string, any>>(),
  parsingMetadata: jsonb('parsing_metadata').default({}).$type<{
    parserVersion?: string;
    parseRulesApplied?: string[];
    extractionConfidence?: Record<string, number>;
  }>(),
  
  // Processing
  processed: boolean('processed').default(false),
  processingErrors: jsonb('processing_errors').default([]).$type<Array<{
    error: string;
    timestamp: string;
    field?: string;
  }>>(),
  requiresManualReview: boolean('requires_manual_review').default(false),
  reviewReason: varchar('review_reason', { length: 255 }),
  
  // Import Tracking
  fileName: varchar('file_name', { length: 255 }),
  fileLineNumber: integer('file_line_number'),
  
  // Custom Metadata
  metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
  
  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  // Indexes
  tenantDateIdx: index('idx_bank_statements_tenant_date').on(table.tenantId, table.transactionDate),
  unmatchedIdx: index('idx_bank_statements_unmatched').on(table.tenantId, table.matchStatus),
  accountIdx: index('idx_bank_statements_account').on(table.tenantId, table.accountIdentifier),
  amountIdx: index('idx_bank_statements_amount').on(table.tenantId, table.amount),
  merchantIdx: index('idx_bank_statements_merchant').on(table.tenantId, table.merchantCleanName),
  duplicateIdx: index('idx_bank_statements_duplicate').on(table.tenantId, table.isDuplicate),
  reviewIdx: index('idx_bank_statements_review').on(table.tenantId, table.requiresManualReview),
  uniqueTransactionIdx: uniqueIndex('unique_bank_transaction').on(
    table.tenantId,
    table.accountIdentifier,
    table.transactionDate,
    table.amount,
    table.dedupKey
  ),
}));

// Relations
export const bankStatementsRelations = relations(bankStatements, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [bankStatements.tenantId],
    references: [tenants.id],
  }),
  integration: one(integrations, {
    fields: [bankStatements.integrationId],
    references: [integrations.id],
  }),
  matchedTransaction: one(transactions, {
    fields: [bankStatements.matchedTransactionId],
    references: [transactions.id],
  }),
  suggestedAccount: one(accounts, {
    fields: [bankStatements.suggestedAccountId],
    references: [accounts.id],
  }),
  suggestedSupplier: one(suppliers, {
    fields: [bankStatements.suggestedSupplierId],
    references: [suppliers.id],
  }),
  duplicateOf: one(bankStatements, {
    fields: [bankStatements.duplicateOfId],
    references: [bankStatements.id],
  }),
  reconciliations: many(reconciliations),
}));

// Types
export type BankStatement = typeof bankStatements.$inferSelect;
export type NewBankStatement = typeof bankStatements.$inferInsert;

// Enums
export const IMPORT_SOURCE = {
  PLAID: 'plaid',
  YODLEE: 'yodlee',
  CSV: 'csv',
  OFX: 'ofx',
  QIF: 'qif',
  MANUAL: 'manual',
} as const;

export const MATCH_STATUS = {
  UNMATCHED: 'unmatched',
  SUGGESTED: 'suggested',
  MATCHED: 'matched',
  IGNORED: 'ignored',
} as const;

export const TRANSACTION_TYPE = {
  DEBIT: 'debit',
  CREDIT: 'credit',
  CHECK: 'check',
  FEE: 'fee',
  INTEREST: 'interest',
  TRANSFER: 'transfer',
} as const;

export const MATCH_METHOD = {
  AI: 'ai',
  RULE: 'rule',
  MANUAL: 'manual',
} as const;