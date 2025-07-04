import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const integrationTypeEnum = pgEnum('integration_type', ['accounting', 'file_storage', 'communication', 'banking'])
export const integrationStatusEnum = pgEnum('integration_status', ['active', 'error', 'disabled', 'setup_pending'])

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Tenant relationship
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Integration details
  integrationType: integrationTypeEnum('integration_type').notNull(),
  provider: varchar('provider', { length: 100 }).notNull(), // 'xero', 'quickbooks', 'google_drive', 'dropbox', etc.
  name: varchar('name', { length: 255 }).notNull(), // User-friendly name "Main Xero Account"
  
  // Provider-specific configuration (encrypted)
  authData: jsonb('auth_data').notNull(), // Encrypted tokens, credentials
  settings: jsonb('settings').default('{}').notNull(), // Provider-specific settings
  
  // Status and monitoring
  status: integrationStatusEnum('status').default('setup_pending').notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  lastError: text('last_error'),
  nextScheduledSync: timestamp('next_scheduled_sync'),
  syncHealth: varchar('sync_health', { length: 20 }).default('unknown'), // 'healthy', 'warning', 'error', 'unknown'
  
  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Integration = typeof integrations.$inferSelect
export type NewIntegration = typeof integrations.$inferInsert

// Provider-specific auth data structures
export interface XeroAuthData {
  accessToken: string
  refreshToken: string
  expiresAt: string
  tenantId: string // Xero tenant ID
  scope: string[]
}

export interface QuickBooksAuthData {
  accessToken: string
  refreshToken: string
  expiresAt: string
  companyId: string // QuickBooks company ID
  scope: string[]
}

export interface GoogleDriveAuthData {
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope: string[]
}

export interface DropboxAuthData {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
}

// Provider-specific settings
export interface XeroSettings {
  syncFrequency?: 'realtime' | 'hourly' | 'daily'
  syncContacts?: boolean
  syncBankTransactions?: boolean
  syncInvoices?: boolean
  syncBills?: boolean
  defaultCurrency?: string
  webhookUrl?: string
}

export interface QuickBooksSettings {
  syncFrequency?: 'realtime' | 'hourly' | 'daily'
  syncVendors?: boolean
  syncBankTransactions?: boolean
  syncBills?: boolean
  syncPayments?: boolean
  sandbox?: boolean
}

export interface GoogleDriveSettings {
  folderId?: string
  watchChanges?: boolean
  fileTypes?: string[] // ['pdf', 'jpg', 'png']
  autoProcess?: boolean
}

export interface DropboxSettings {
  folderPath?: string
  watchChanges?: boolean
  fileTypes?: string[]
  autoProcess?: boolean
}

// Integration capabilities
export const PROVIDER_CAPABILITIES = {
  xero: {
    type: 'accounting' as const,
    features: ['transactions', 'contacts', 'invoices', 'bills', 'webhooks', 'attachments'],
    authType: 'oauth2',
    webhookSupport: true,
    attachmentSupport: true,
  },
  quickbooks: {
    type: 'accounting' as const,
    features: ['transactions', 'vendors', 'bills', 'payments'],
    authType: 'oauth2',
    webhookSupport: false,
    attachmentSupport: true,
  },
  google_drive: {
    type: 'file_storage' as const,
    features: ['file_sync', 'folder_watch', 'webhooks'],
    authType: 'oauth2',
    webhookSupport: true,
    attachmentSupport: false,
  },
  dropbox: {
    type: 'file_storage' as const,
    features: ['file_sync', 'folder_watch'],
    authType: 'oauth2',
    webhookSupport: true,
    attachmentSupport: false,
  },
  slack: {
    type: 'communication' as const,
    features: ['notifications', 'file_sharing'],
    authType: 'oauth2',
    webhookSupport: true,
    attachmentSupport: false,
  },
} as const

export type ProviderType = keyof typeof PROVIDER_CAPABILITIES

// Integration sync logs
export const integrationSyncLogs = pgTable('integration_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Relationships
  integrationId: uuid('integration_id').references(() => integrations.id, { onDelete: 'cascade' }).notNull(),
  
  // Sync details
  syncType: varchar('sync_type', { length: 100 }).notNull(), // 'full', 'incremental', 'manual'
  status: varchar('status', { length: 50 }).notNull(), // 'success', 'error', 'partial'
  
  // Results
  recordsProcessed: jsonb('records_processed').default('{}').notNull(),
  errors: jsonb('errors').default('[]').notNull(),
  warnings: jsonb('warnings').default('[]').notNull(),
  
  // Timing
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  
  // Metadata
  metadata: jsonb('metadata').default('{}').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type IntegrationSyncLog = typeof integrationSyncLogs.$inferSelect
export type NewIntegrationSyncLog = typeof integrationSyncLogs.$inferInsert