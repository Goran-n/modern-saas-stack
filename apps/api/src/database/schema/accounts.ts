import { pgTable, text, varchar, boolean, decimal, integer, timestamp, uuid, jsonb, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';

export const accounts = pgTable('accounts', {
  // Primary Keys
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Account Identification
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  displayName: varchar('display_name', { length: 500 }),
  description: text('description'),
  
  // Account Classification (Standard)
  accountType: varchar('account_type', { length: 50 }).notNull(),
  accountSubtype: varchar('account_subtype', { length: 100 }),
  accountClass: varchar('account_class', { length: 100 }),
  
  // Hierarchy Support (Flexible depth)
  parentAccountId: uuid('parent_account_id'),
  hierarchyLevel: integer('hierarchy_level').default(0),
  hierarchyPath: text('hierarchy_path'),
  isParent: boolean('is_parent').default(false),
  
  // Tax Configuration
  defaultTaxCode: varchar('default_tax_code', { length: 50 }),
  taxType: varchar('tax_type', { length: 50 }),
  taxLocked: boolean('tax_locked').default(false),
  
  // Account Properties
  isActive: boolean('is_active').default(true),
  isSystemAccount: boolean('is_system_account').default(false),
  isBankAccount: boolean('is_bank_account').default(false),
  bankAccountType: varchar('bank_account_type', { length: 50 }),
  currencyCode: varchar('currency_code', { length: 3 }),
  
  // Xero-specific Properties
  enablePaymentsToAccount: boolean('enable_payments_to_account').default(false),
  showInExpenseClaims: boolean('show_in_expense_claims').default(false),
  addToWatchlist: boolean('add_to_watchlist').default(false),
  
  // Reporting
  reportingCode: varchar('reporting_code', { length: 50 }),
  reportingCategory: varchar('reporting_category', { length: 100 }),
  excludeFromReports: boolean('exclude_from_reports').default(false),
  
  // AI Categorization Support
  categoryKeywords: text('category_keywords').array(),
  typicalVendors: text('typical_vendors').array(),
  spendingPatterns: jsonb('spending_patterns').default({}).$type<{
    averageMonthly?: number;
    seasonality?: Record<string, any>;
    commonAmounts?: number[];
  }>(),
  
  // Provider Mappings
  providerAccountIds: jsonb('provider_account_ids').default({}).$type<Record<string, string>>(),
  providerSyncData: jsonb('provider_sync_data').default({}).$type<Record<string, any>>(),
  
  // Usage Tracking
  transactionCount: integer('transaction_count').default(0),
  lastUsedDate: date('last_used_date'),
  totalDebits: decimal('total_debits', { precision: 18, scale: 2 }).default('0'),
  totalCredits: decimal('total_credits', { precision: 18, scale: 2 }).default('0'),
  
  // Budget Integration
  budgetTracking: boolean('budget_tracking').default(false),
  budgetOwner: varchar('budget_owner', { length: 255 }),
  
  // Custom Fields
  customFields: jsonb('custom_fields').default({}).$type<Record<string, any>>(),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
  
  // Audit Fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 50 }).default('system'),
  lastSyncedAt: timestamp('last_synced_at'),
}, (table) => ({
  // Indexes
  accountCodeUnique: uniqueIndex('unique_account_code').on(table.tenantId, table.code),
  providerAccountUnique: uniqueIndex('unique_provider_account').on(table.tenantId, table.providerAccountIds),
  tenantTypeIdx: index('idx_accounts_tenant_type').on(table.tenantId, table.accountType),
  parentIdx: index('idx_accounts_parent').on(table.parentAccountId),
  activeIdx: index('idx_accounts_active').on(table.tenantId, table.isActive),
  hierarchyIdx: index('idx_accounts_hierarchy').on(table.tenantId, table.hierarchyPath),
}));

// Self-referencing relation for hierarchy
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [accounts.tenantId],
    references: [tenants.id],
  }),
  parentAccount: one(accounts, {
    fields: [accounts.parentAccountId],
    references: [accounts.id],
    relationName: 'parentChild',
  }),
  childAccounts: many(accounts, {
    relationName: 'parentChild',
  }),
}));

// Types
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// Enums
export const ACCOUNT_TYPE = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  EXPENSE: 'EXPENSE',
} as const;

export const ACCOUNT_SUBTYPE = {
  // Assets
  CURRENT_ASSET: 'CURRENT_ASSET',
  FIXED_ASSET: 'FIXED_ASSET',
  NON_CURRENT_ASSET: 'NON_CURRENT_ASSET',
  
  // Liabilities
  CURRENT_LIABILITY: 'CURRENT_LIABILITY',
  NON_CURRENT_LIABILITY: 'NON_CURRENT_LIABILITY',
  
  // Specific types
  BANK: 'BANK',
  ACCOUNTS_RECEIVABLE: 'ACCOUNTS_RECEIVABLE',
  ACCOUNTS_PAYABLE: 'ACCOUNTS_PAYABLE',
  INVENTORY: 'INVENTORY',
  
  // Expense types
  DIRECT_COSTS: 'DIRECT_COSTS',
  OVERHEAD: 'OVERHEAD',
  OTHER_EXPENSE: 'OTHER_EXPENSE',
  
  // Revenue types
  SALES: 'SALES',
  OTHER_INCOME: 'OTHER_INCOME',
} as const;

export const BANK_ACCOUNT_TYPE = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  CREDITCARD: 'CREDITCARD',
  LOAN: 'LOAN',
  OTHER: 'OTHER',
} as const;

export const TAX_TYPE = {
  NONE: 'NONE',
  INPUT: 'INPUT',
  OUTPUT: 'OUTPUT',
  BASEXCLUDED: 'BASEXCLUDED',
} as const;