import { pgTable, text, varchar, boolean, decimal, timestamp, uuid, jsonb, date, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { integrations } from './integrations';
import { users } from './users';

export const manualJournals = pgTable('manual_journals', {
  // Primary Keys
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Source Tracking
  integrationId: uuid('integration_id').references(() => integrations.id),
  providerJournalId: varchar('provider_journal_id', { length: 255 }),
  
  // Journal Identification
  journalNumber: varchar('journal_number', { length: 100 }),
  journalDate: date('journal_date').notNull(),
  
  // Journal Details
  narration: text('narration'),
  status: varchar('status', { length: 50 }).default('draft'),
  
  // Line Items (Must balance to zero)
  journalLines: jsonb('journal_lines').notNull().default([]).$type<Array<{
    lineNumber: number;
    accountId: string;
    accountCode: string;
    description: string;
    debitAmount: number;
    creditAmount: number;
    taxType?: string;
    taxAmount?: number;
    trackingCategories?: Record<string, any>;
    contactId?: string;
    contactName?: string;
  }>>(),
  
  // Totals (for validation)
  totalDebits: decimal('total_debits', { precision: 18, scale: 6 }).notNull().default('0'),
  totalCredits: decimal('total_credits', { precision: 18, scale: 6 }).notNull().default('0'),
  
  // Currency Support
  currencyCode: varchar('currency_code', { length: 3 }).default('USD'),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 10 }),
  
  // Provider Data
  providerData: jsonb('provider_data').default({}).$type<Record<string, any>>(),
  hasAttachments: boolean('has_attachments').default(false),
  attachmentIds: text('attachment_ids').array(),
  
  // Posting Information
  postedDate: date('posted_date'),
  postedBy: uuid('posted_by').references(() => users.id),
  
  // Audit Fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 50 }),
  lastSyncedAt: timestamp('last_synced_at'),
}, (table) => ({
  // Constraints
  checkJournalBalance: check('check_journal_balance', sql`${table.totalDebits} = ${table.totalCredits}`),
  
  // Indexes
  tenantDateIdx: index('idx_journals_tenant_date').on(table.tenantId, table.journalDate),
  tenantStatusIdx: index('idx_journals_tenant_status').on(table.tenantId, table.status),
  tenantNumberIdx: index('idx_journals_tenant_number').on(table.tenantId, table.journalNumber),
  providerJournalUnique: uniqueIndex('unique_provider_journal').on(table.tenantId, table.integrationId, table.providerJournalId),
}));

// Relations
export const manualJournalsRelations = relations(manualJournals, ({ one }) => ({
  tenant: one(tenants, {
    fields: [manualJournals.tenantId],
    references: [tenants.id],
  }),
  integration: one(integrations, {
    fields: [manualJournals.integrationId],
    references: [integrations.id],
  }),
  postedByUser: one(users, {
    fields: [manualJournals.postedBy],
    references: [users.id],
  }),
}));

// Types
export type ManualJournal = typeof manualJournals.$inferSelect;
export type NewManualJournal = typeof manualJournals.$inferInsert;

// Enums
export const JOURNAL_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
  ARCHIVED: 'archived',
  VOIDED: 'voided',
} as const;