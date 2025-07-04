import { pgTable, uuid, varchar, jsonb, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { integrations } from './integrations'

export const syncJobStatusEnum = pgEnum('sync_job_status', ['pending', 'running', 'completed', 'failed', 'cancelled'])
export const syncJobTypeEnum = pgEnum('sync_job_type', ['full', 'incremental', 'manual', 'webhook'])

export const syncJobs = pgTable('sync_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Relationships
  integrationId: uuid('integration_id').references(() => integrations.id, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Job details
  jobType: syncJobTypeEnum('job_type').notNull(),
  status: syncJobStatusEnum('status').default('pending').notNull(),
  priority: integer('priority').default(0).notNull(), // Higher numbers = higher priority
  progress: integer('progress').default(0).notNull(), // 0-100
  
  // Results and errors
  result: jsonb('result'), // SyncJobResult when completed
  error: varchar('error', { length: 1000 }), // Error message if failed
  
  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Metadata
  metadata: jsonb('metadata').default('{}').notNull(),
  
  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for job queue processing
  statusPriorityIdx: index('sync_jobs_status_priority_idx').on(table.status, table.priority.desc(), table.createdAt),
  integrationIdx: index('sync_jobs_integration_idx').on(table.integrationId, table.createdAt.desc()),
  tenantIdx: index('sync_jobs_tenant_idx').on(table.tenantId, table.createdAt.desc()),
  statusIdx: index('sync_jobs_status_idx').on(table.status),
}))

export type SyncJob = typeof syncJobs.$inferSelect
export type NewSyncJob = typeof syncJobs.$inferInsert