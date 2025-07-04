export interface User {
  id: number
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface Post {
  id: number
  title: string
  content?: string
  published: boolean
  authorId: number
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message: string
  details?: Record<string, unknown>
}

export interface TestConnectionResponse {
  success: boolean
  message: string
  requiresReauth?: boolean
  error?: string
  details?: Record<string, unknown>
}

export interface TriggerSyncResponse {
  success: boolean
  message: string
  syncJob: SyncJob
  jobId: string
}

export interface OAuthUrlResponse {
  authUrl: string
  state: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Integration types (simplified to Xero only)
export type IntegrationProvider = 'xero'
export type IntegrationType = 'accounting'
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'setup_pending'
export type SyncType = 'full' | 'incremental' | 'manual' | 'webhook'
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly'

export interface IntegrationCapabilities {
  read: string[]
  write: string[]
  webhook: boolean
  realtime: boolean
  fileUpload: boolean
  batchOperations: boolean
}

export interface IntegrationSettings {
  syncFrequency?: SyncFrequency
  enabledEntities?: string[]
  customFields?: Record<string, unknown>
  webhookUrl?: string
  notifications?: {
    onSync?: boolean
    onError?: boolean
  }
}

export interface IntegrationHealthIssue {
  type: string
  message: string
  severity: 'low' | 'medium' | 'high'
}

export interface IntegrationHealth {
  score: number
  lastCheck: string
  issues: IntegrationHealthIssue[]
}

export interface IntegrationAuthData {
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  scope?: string[]
}

export interface Integration {
  id: string
  tenantId: string
  provider: IntegrationProvider
  integrationType: IntegrationType
  name: string
  status: IntegrationStatus
  settings: IntegrationSettings
  capabilities: IntegrationCapabilities
  authData?: IntegrationAuthData
  metadata?: Record<string, unknown>
  health?: IntegrationHealth
  lastSyncAt?: string
  syncCount?: number
  errorCount?: number
  lastError?: string
  syncStatus?: {
    status: SyncJobStatus
  }
  createdAt: string
  updatedAt: string
}

export interface SupportedProvider {
  provider: IntegrationProvider
  type: IntegrationType
  name: string
  description: string
  logoUrl: string
  capabilities: IntegrationCapabilities
  isAvailable: boolean
}

export interface OAuthFlowData {
  authUrl: string
  state: string
  redirectUrl: string
}

export interface SyncJobSummary {
  id: string
  integrationId: string
  tenantId: string
  type: SyncType
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startedAt?: string
  completedAt?: string
  results?: {
    imported: number
    updated: number
    skipped: number
    errors: number
  }
  error?: string
}

// Additional types needed by the applications
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type Role = 'admin' | 'member' | 'viewer'

export interface SyncJob {
  id: string
  integrationId: string
  tenantId: string
  type: SyncType
  status: SyncJobStatus
  progress: number
  startedAt?: string
  completedAt?: string
  error?: string
  result?: {
    imported: number
    updated: number
    skipped: number
    errors: number
  }
  metadata?: Record<string, unknown>
}

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  createdAt: string
  updatedAt: string
}

export interface TenantMember {
  id: string
  tenantId: string
  userId: string
  role: Role
  permissions: MemberPermissions
  invitedAt?: string
  joinedAt?: string
  createdAt: string
  updatedAt: string
}

export interface MemberPermissions {
  read: boolean
  write: boolean
  admin: boolean
  integrations: boolean
  billing: boolean
}

export interface SyncStatistics {
  totalJobs: number
  pendingJobs: number
  runningJobs: number
  completedJobs: number
  failedJobs: number
  successfulJobs: number
  averageProcessingTime: number
  totalRecordsProcessed: number
  jobsByStatus: Record<SyncJobStatus, number>
  recentJobs: SyncJob[]
  recentActivity: SyncJob[]
  queueStatistics: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }
}

export interface TransactionSummary {
  lastSyncAt: string | null
  totalTransactions: number
  totalCount: number
  syncedCount: number
  errorCount: number
  reconciledCount: number
  pendingCount: number
  currencies: Record<string, number>
  byStatus: Record<string, number>
  byType: Record<string, number>
}