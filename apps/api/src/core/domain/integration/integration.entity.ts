import { z } from 'zod'

export const integrationProviderSchema = z.enum(['xero', 'quickbooks', 'sage', 'freshbooks'])
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>

export const integrationTypeSchema = z.enum(['accounting', 'file_storage', 'communication', 'banking'])
export type IntegrationType = z.infer<typeof integrationTypeSchema>

export const integrationStatusSchema = z.enum(['active', 'disabled', 'error', 'setup_pending'])
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>

export const integrationSettingsSchema = z.object({
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).optional(),
  enabledEntities: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  webhookUrl: z.string().optional(),
  notifications: z.object({
    onSync: z.boolean().optional(),
    onError: z.boolean().optional(),
  }).optional(),
  lastSync: z.record(z.string(), z.string()).optional(), // Track last sync time per entity type
}).strict()

export const integrationCapabilitiesSchema = z.object({
  read: z.array(z.string()),
  write: z.array(z.string()),
  webhook: z.boolean(),
  realtime: z.boolean(),
  fileUpload: z.boolean(),
  batchOperations: z.boolean(),
}).strict()

export type IntegrationSettings = z.infer<typeof integrationSettingsSchema>
export type IntegrationCapabilities = z.infer<typeof integrationCapabilitiesSchema>

export const PROVIDER_CAPABILITIES: Record<IntegrationProvider, IntegrationCapabilities> = {
  xero: {
    read: ['contacts', 'invoices', 'payments', 'accounts', 'items', 'reports'],
    write: ['contacts', 'invoices', 'payments', 'items'],
    webhook: true,
    realtime: true,
    fileUpload: true,
    batchOperations: true,
  },
  quickbooks: {
    read: ['customers', 'invoices', 'payments', 'accounts', 'items', 'reports'],
    write: ['customers', 'invoices', 'payments', 'items'],
    webhook: true,
    realtime: false,
    fileUpload: false,
    batchOperations: true,
  },
  sage: {
    read: ['contacts', 'invoices', 'payments', 'accounts'],
    write: ['contacts', 'invoices'],
    webhook: false,
    realtime: false,
    fileUpload: false,
    batchOperations: false,
  },
  freshbooks: {
    read: ['clients', 'invoices', 'payments', 'expenses'],
    write: ['clients', 'invoices', 'expenses'],
    webhook: true,
    realtime: false,
    fileUpload: true,
    batchOperations: false,
  },
}

export interface IntegrationEntityProps {
  id: string
  tenantId: string
  provider: IntegrationProvider
  integrationType: IntegrationType
  name: string
  status: IntegrationStatus
  authData: Record<string, unknown>
  settings: IntegrationSettings
  metadata?: Record<string, unknown>
  capabilities?: IntegrationCapabilities
  health?: {
    score: number
    lastCheck: string
    issues: string[]
  }
  lastSyncAt: Date | null
  lastErrorAt: Date | null
  lastErrorMessage: string | null
  nextScheduledSync: Date | null
  syncHealth: 'healthy' | 'warning' | 'error' | 'unknown'
  syncCount: number
  errorCount: number
  createdAt: Date
  updatedAt: Date
}

export class IntegrationEntity {
  private constructor(private props: IntegrationEntityProps) {}

  static create(props: Omit<IntegrationEntityProps, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'lastErrorAt' | 'lastErrorMessage' | 'nextScheduledSync' | 'syncHealth' | 'syncCount' | 'errorCount'>): IntegrationEntity {
    const now = new Date()
    return new IntegrationEntity({
      ...props,
      id: crypto.randomUUID(),
      lastSyncAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      nextScheduledSync: null,
      syncHealth: 'unknown',
      syncCount: 0,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    })
  }

  static fromDatabase(props: IntegrationEntityProps): IntegrationEntity {
    return new IntegrationEntity(props)
  }

  get id(): string { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get provider(): IntegrationProvider { return this.props.provider }
  get integrationType(): IntegrationType { return this.props.integrationType }
  get name(): string { return this.props.name }
  get status(): IntegrationStatus { return this.props.status }
  get authData(): Record<string, unknown> { return this.props.authData }
  get settings(): IntegrationSettings { return this.props.settings }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata }
  get capabilities(): IntegrationCapabilities | undefined { return this.props.capabilities }
  get health(): { score: number; lastCheck: string; issues: string[] } | undefined { return this.props.health }
  get lastSyncAt(): Date | null { return this.props.lastSyncAt }
  get lastErrorAt(): Date | null { return this.props.lastErrorAt }
  get lastErrorMessage(): string | null { return this.props.lastErrorMessage }
  get nextScheduledSync(): Date | null { return this.props.nextScheduledSync }
  get syncHealth(): 'healthy' | 'warning' | 'error' | 'unknown' { return this.props.syncHealth }
  get syncCount(): number { return this.props.syncCount }
  get errorCount(): number { return this.props.errorCount }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  isActive(): boolean {
    return this.props.status === 'active'
  }

  isDisabled(): boolean {
    return this.props.status === 'disabled'
  }

  isInError(): boolean {
    return this.props.status === 'error'
  }

  isSetupPending(): boolean {
    return this.props.status === 'setup_pending'
  }

  hasValidAuth(): boolean {
    // Check if we have auth data with required fields
    const authData = this.props.authData
    if (!authData || Object.keys(authData).length === 0) {
      return false
    }

    // Validate required fields based on provider
    const requiredFields: Record<IntegrationProvider, string[]> = {
      xero: ['accessToken', 'refreshToken', 'tenantId'],
      quickbooks: ['accessToken', 'refreshToken', 'companyId'],
      sage: ['apiKey', 'baseUrl'],
      freshbooks: ['accessToken', 'refreshToken', 'accountId'],
    }

    const required = requiredFields[this.provider]
    if (!required) return false

    // Check all required fields are present and non-empty
    return required.every(field => 
      authData[field] && 
      typeof authData[field] === 'string' && 
      (authData[field] as string).trim().length > 0
    )
  }

  canRead(entity: string): boolean {
    return this.capabilities?.read.includes(entity) ?? false
  }

  canWrite(entity: string): boolean {
    return this.capabilities?.write.includes(entity) ?? false
  }

  supportsWebhooks(): boolean {
    return this.capabilities?.webhook ?? false
  }

  supportsRealtime(): boolean {
    return this.capabilities?.realtime ?? false
  }

  getHealthScore(): number {
    const totalOperations = this.props.syncCount + this.props.errorCount
    if (totalOperations === 0) return 100
    
    const successRate = (this.props.syncCount / totalOperations) * 100
    return Math.round(successRate)
  }

  isHealthy(): boolean {
    return this.getHealthScore() >= 90
  }

  updateName(name: string): void {
    this.props.name = name
    this.touch()
  }

  updateAuthData(authData: Record<string, unknown>): void {
    this.props.authData = { ...this.props.authData, ...authData }
    this.touch()
  }

  updateSettings(settings: Partial<IntegrationSettings>): void {
    this.props.settings = { ...this.props.settings, ...settings }
    this.touch()
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
    this.touch()
  }

  activate(): void {
    this.props.status = 'active'
    this.touch()
  }

  disable(): void {
    this.props.status = 'disabled'
    this.touch()
  }

  markAsSetupPending(): void {
    this.props.status = 'setup_pending'
    this.touch()
  }

  recordSuccessfulSync(): void {
    this.props.lastSyncAt = new Date()
    this.props.syncCount += 1
    this.props.status = 'active'
    this.props.lastErrorAt = null
    this.props.lastErrorMessage = null
    this.updateSyncHealth()
    this.touch()
  }

  recordSyncError(errorMessage: string): void {
    this.props.lastErrorAt = new Date()
    this.props.lastErrorMessage = errorMessage
    this.props.errorCount += 1
    this.props.status = 'error'
    this.updateSyncHealth()
    this.touch()
  }

  resetErrorState(): void {
    this.props.lastErrorAt = null
    this.props.lastErrorMessage = null
    this.props.status = 'active'
    this.updateSyncHealth()
    this.touch()
  }

  clearSyncError(): void {
    if (this.props.status === 'error') {
      this.props.status = 'active'
      this.updateSyncHealth()
      this.touch()
    }
  }

  updateSyncHealth(): void {
    const healthScore = this.getHealthScore()
    if (healthScore >= 95) {
      this.props.syncHealth = 'healthy'
    } else if (healthScore >= 80) {
      this.props.syncHealth = 'warning'
    } else {
      this.props.syncHealth = 'error'
    }
  }

  scheduleNextSync(nextSyncDate: Date): void {
    this.props.nextScheduledSync = nextSyncDate
    this.touch()
  }

  clearScheduledSync(): void {
    this.props.nextScheduledSync = null
    this.touch()
  }

  isDueForSync(): boolean {
    if (!this.props.nextScheduledSync) return false
    return new Date() >= this.props.nextScheduledSync
  }

  getTimeSinceLastSync(): number | null {
    if (!this.props.lastSyncAt) return null
    return Date.now() - this.props.lastSyncAt.getTime()
  }

  getTimeUntilNextSync(): number | null {
    if (!this.props.nextScheduledSync) return null
    return this.props.nextScheduledSync.getTime() - Date.now()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }

  toDatabase(): IntegrationEntityProps {
    return { ...this.props }
  }

  toPublic(): Omit<IntegrationEntityProps, 'authData'> {
    const { authData, ...publicProps } = this.props
    return {
      ...publicProps,
      capabilities: this.capabilities,
      healthScore: this.getHealthScore(),
    } as any
  }
}