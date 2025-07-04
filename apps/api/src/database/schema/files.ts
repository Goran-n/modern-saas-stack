import { pgTable, uuid, varchar, text, jsonb, timestamp, bigint, boolean, pgEnum, index, unique, integer } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { integrations } from './integrations'

// Enums for file management
export const fileSourceEnum = pgEnum('file_source', [
  'dropbox',
  'google_drive',
  'onedrive',
  'office365',
  'whatsapp',
  'manual'
])

export const fileStatusEnum = pgEnum('file_status', [
  'uploaded',    // File has been uploaded to storage
  'processing',  // File is being processed
  'ready',       // File is ready for use
  'failed',      // Processing failed
  'deleted'      // Soft deleted
])

export const reviewStatusEnum = pgEnum('review_status', [
  'not_reviewed',  // Not yet reviewed
  'ignored',       // Reviewed and ignored
  'reviewed',      // Reviewed and accepted
  'duplicate',     // Marked as duplicate
  'processing'     // Currently being reviewed
])

// Main files table - tracks all files in the system
export const files: any = pgTable('files', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  integrationId: uuid('integration_id').references(() => integrations.id, { onDelete: 'set null' }),
  
  // File information
  filename: varchar('filename', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  sha256Hash: varchar('sha256_hash', { length: 64 }).notNull(),
  
  // Storage
  storageKey: varchar('storage_key', { length: 500 }).notNull(), // S3 key
  storageBucket: varchar('storage_bucket', { length: 100 }).notNull(),
  
  // Source tracking
  source: fileSourceEnum('source').notNull(),
  sourceId: varchar('source_id', { length: 255 }), // External file ID
  sourcePath: text('source_path'), // Original path in source system
  sourceModifiedAt: timestamp('source_modified_at', { mode: 'date' }),
  sourceMetadata: jsonb('source_metadata').default({}).notNull(),
  
  // Status
  status: fileStatusEnum('status').notNull().default('uploaded'),
  reviewStatus: reviewStatusEnum('review_status').notNull().default('not_reviewed'),
  rejectionReason: text('rejection_reason'),
  
  // Deduplication
  isDuplicate: boolean('is_duplicate').default(false).notNull(),
  duplicateOf: uuid('duplicate_of').references(() => files.id, { onDelete: 'set null' }),
  
  // Metadata
  metadata: jsonb('metadata').default({}).notNull(),
  
  // Security
  virusScanned: boolean('virus_scanned').default(false).notNull(),
  virusScanResult: jsonb('virus_scan_result'),
  
  // Audit fields
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(), // Supabase user ID
  updatedBy: varchar('updated_by', { length: 255 }), // Supabase user ID
  version: integer('version').default(1).notNull()
}, (table): any => {
  return {
    // Performance indexes
    tenantIdIdx: index('idx_files_tenant').on(table.tenantId),
    hashIdx: index('idx_files_hash').on(table.sha256Hash),
    statusIdx: index('idx_files_status').on(table.status),
    sourceIdx: index('idx_files_source').on(table.source),
    duplicateIdx: index('idx_files_duplicate').on(table.duplicateOf),
    integrationIdx: index('idx_files_integration').on(table.integrationId),
    
    // Unique constraints
    uniqueSourceFile: unique('unique_source_file').on(
      table.tenantId,
      table.source,
      table.sourceId
    ),
    
    // Composite indexes
    tenantStatusIdx: index('idx_files_tenant_status').on(
      table.tenantId,
      table.status
    ),
    tenantReviewIdx: index('idx_files_tenant_review').on(
      table.tenantId,
      table.reviewStatus
    )
  }
})

// File versions table for tracking changes
export const fileVersions = pgTable('file_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }).notNull(),
  versionNumber: integer('version_number').notNull(),
  
  // Version data
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  sha256Hash: varchar('sha256_hash', { length: 64 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  
  // Change tracking
  changeReason: text('change_reason'),
  changedBy: varchar('changed_by', { length: 255 }), // Supabase user ID
  
  // Metadata
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
}, (table) => {
  return {
    fileIdIdx: index('idx_file_versions_file').on(table.fileId),
    uniqueFileVersion: unique('unique_file_version').on(
      table.fileId,
      table.versionNumber
    )
  }
})

// Type exports
export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
export type FileVersion = typeof fileVersions.$inferSelect
export type NewFileVersion = typeof fileVersions.$inferInsert