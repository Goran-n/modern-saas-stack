import { pgTable, text, varchar, integer, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { integrations } from './integrations';
import { users } from './users';

export const importBatches = pgTable('import_batches', {
  // Primary Keys
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Batch Information
  batchType: varchar('batch_type', { length: 50 }).notNull(),
  importSource: varchar('import_source', { length: 50 }).notNull(),
  integrationId: uuid('integration_id').references(() => integrations.id),
  
  // File Information (if applicable)
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  fileHash: varchar('file_hash', { length: 64 }),
  
  // Import Statistics
  totalRecords: integer('total_records').default(0),
  processedRecords: integer('processed_records').default(0),
  failedRecords: integer('failed_records').default(0),
  duplicateRecords: integer('duplicate_records').default(0),
  
  // Status Tracking
  status: varchar('status', { length: 50 }).default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Configuration
  importConfig: jsonb('import_config').default({}).$type<{
    columnMappings?: Record<string, string>;
    dateFormat?: string;
    decimalSeparator?: string;
    skipDuplicates?: boolean;
  }>(),
  
  // Results
  importResults: jsonb('import_results').default({}).$type<{
    created?: number;
    updated?: number;
    errors?: Array<{ message: string; record?: any }>;
    warnings?: Array<{ message: string; record?: any }>;
  }>(),
  
  // Error Tracking
  errorLog: jsonb('error_log').default([]).$type<Array<{
    line?: number;
    error: string;
    data?: Record<string, any>;
  }>>(),
  
  // User Information
  importedBy: uuid('imported_by').references(() => users.id),
  notes: text('notes'),
  
  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes
  tenantIdx: index('idx_import_batches_tenant').on(table.tenantId, table.createdAt),
  statusIdx: index('idx_import_batches_status').on(table.tenantId, table.status),
  typeIdx: index('idx_import_batches_type').on(table.tenantId, table.batchType),
}));

// Relations
export const importBatchesRelations = relations(importBatches, ({ one }) => ({
  tenant: one(tenants, {
    fields: [importBatches.tenantId],
    references: [tenants.id],
  }),
  integration: one(integrations, {
    fields: [importBatches.integrationId],
    references: [integrations.id],
  }),
  importedByUser: one(users, {
    fields: [importBatches.importedBy],
    references: [users.id],
  }),
}));

// Types
export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;

// Enums
export const BATCH_TYPE = {
  SUPPLIERS: 'suppliers',
  INVOICES: 'invoices',
  TRANSACTIONS: 'transactions',
  ACCOUNTS: 'accounts',
  STATEMENTS: 'statements',
  MANUAL_JOURNALS: 'manual_journals',
} as const;

export const IMPORT_SOURCE = {
  XERO: 'xero',
  QUICKBOOKS: 'quickbooks',
  SAGE: 'sage',
  CSV: 'csv',
  OFX: 'ofx',
  MANUAL: 'manual',
} as const;

export const BATCH_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;