import { pgTable, text, varchar, boolean, decimal, timestamp, uuid, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { bankStatements } from './bank-statements';
import { transactions } from './transactions';
import { users } from './users';

export const reconciliations = pgTable('reconciliations', {
  // Primary Keys
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Reconciliation Details
  bankStatementId: uuid('bank_statement_id').notNull().references(() => bankStatements.id),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  
  // Match Information
  matchType: varchar('match_type', { length: 50 }).notNull(),
  matchConfidence: decimal('match_confidence', { precision: 3, scale: 2 }),
  matchAmount: decimal('match_amount', { precision: 18, scale: 6 }).notNull(),
  
  // For split reconciliations (multiple transactions to one statement)
  isSplit: boolean('is_split').default(false),
  splitGroupId: uuid('split_group_id'),
  
  // AI/Rule Details
  matchMethod: varchar('match_method', { length: 100 }),
  matchRules: jsonb('match_rules').default({}).$type<{
    amountMatch?: boolean;
    dateToleranceDays?: number;
    descriptionSimilarity?: number;
    merchantMatch?: boolean;
  }>(),
  
  // User Override
  userConfirmed: boolean('user_confirmed').default(false),
  confirmedBy: uuid('confirmed_by').references(() => users.id),
  confirmedAt: timestamp('confirmed_at'),
  overrideReason: text('override_reason'),
  
  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
  
  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 50 }),
}, (table) => ({
  // Indexes
  statementIdx: index('idx_reconciliations_statement').on(table.bankStatementId),
  transactionIdx: index('idx_reconciliations_transaction').on(table.transactionId),
  splitGroupIdx: index('idx_reconciliations_split_group').on(table.splitGroupId),
  tenantDateIdx: index('idx_reconciliations_tenant_date').on(table.tenantId, table.createdAt),
  statementReconciliationUnique: uniqueIndex('unique_statement_reconciliation').on(table.bankStatementId, table.transactionId),
}));

// Relations
export const reconciliationsRelations = relations(reconciliations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [reconciliations.tenantId],
    references: [tenants.id],
  }),
  bankStatement: one(bankStatements, {
    fields: [reconciliations.bankStatementId],
    references: [bankStatements.id],
  }),
  transaction: one(transactions, {
    fields: [reconciliations.transactionId],
    references: [transactions.id],
  }),
  confirmedByUser: one(users, {
    fields: [reconciliations.confirmedBy],
    references: [users.id],
  }),
}));

// Types
export type Reconciliation = typeof reconciliations.$inferSelect;
export type NewReconciliation = typeof reconciliations.$inferInsert;

// Enums
export const MATCH_TYPE = {
  EXACT: 'exact',
  PARTIAL: 'partial',
  MANUAL: 'manual',
  RULE_BASED: 'rule_based',
} as const;

export const MATCH_METHOD = {
  AI_ML: 'ai_ml',
  EXACT_MATCH: 'exact_match',
  RULE_ENGINE: 'rule_engine',
  MANUAL: 'manual',
} as const;

export const CREATED_BY = {
  SYSTEM: 'system',
  USER: 'user',
  AI: 'ai',
} as const;