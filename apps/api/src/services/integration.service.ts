import { IntegrationEntity } from '../core/domain/integration'
import { IntegrationCrudService } from './integration-crud.service'
import type { CreateIntegrationData, UpdateIntegrationData } from './integration-crud.service'
import { OAuthService } from './oauth.service'
import { ProviderService } from './provider.service'
import type { ProviderInfo } from './provider.service'
import { SyncManagementService } from './sync-management.service'
import type { TriggerSyncOptions, SyncLogEntry } from './sync-management.service'
import type { Logger } from 'pino'

export interface AuthCompleteData {
  integrationId: string
  code: string
  state: string
  scope?: string
}

export interface AuthWithOrganisationData extends AuthCompleteData {
  tenantId: string
  organisationId?: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  details?: Record<string, unknown>
}

export interface SyncFilters {
  status?: string[]
  dateFrom?: Date
  dateTo?: Date
}

/**
 * Main Integration Service facade that provides a unified interface
 * for all integration-related operations
 */
export class IntegrationService {
  constructor(
    private crudService: IntegrationCrudService,
    private oauthService: OAuthService,
    private providerService: ProviderService,
    private syncService: SyncManagementService,
    private logger: Logger
  ) {}

  // CRUD Operations
  async create(data: CreateIntegrationData): Promise<IntegrationEntity> {
    return this.crudService.create(data)
  }

  async getById(id: string): Promise<IntegrationEntity | null> {
    return this.crudService.getById(id)
  }

  async getByTenant(tenantId: string): Promise<IntegrationEntity[]> {
    return this.crudService.getByTenant(tenantId)
  }

  async update(id: string, data: UpdateIntegrationData): Promise<IntegrationEntity> {
    return this.crudService.update(id, data)
  }

  async delete(id: string): Promise<void> {
    return this.crudService.delete(id)
  }

  // OAuth Operations
  async getAuthUrl(
    provider: string,
    redirectUri: string,
    tenantId: string
  ): Promise<{ authUrl: string; state: string }> {
    return this.oauthService.getAuthUrl(provider, redirectUri, tenantId)
  }

  async completeAuth(data: AuthCompleteData): Promise<IntegrationEntity> {
    return this.crudService.completeOAuthSetup(
      'xero', // provider - will need to be parameterized
      data.code,
      data.state,
      '', // organisationId - will be set later
      'Xero Integration', // name - default
      {}, // settings - default
      '', // tenantId - will need to be provided
      undefined // existingTokens
    )
  }

  async completeAuthWithOrganisation(data: AuthWithOrganisationData): Promise<IntegrationEntity> {
    return this.crudService.completeOAuthSetup(
      'xero', // provider
      data.code,
      data.state,
      data.organisationId || '', // organisationId
      'Xero Integration', // name
      {}, // settings
      data.tenantId, // tenantId
      undefined // existingTokens
    )
  }

  async getAvailableOrganisations(
    provider: string,
    code: string,
    tenantId: string
  ): Promise<Array<{ id: string; name: string; type?: string }>> {
    return this.oauthService.getAvailableOrganisations(provider, code, tenantId)
  }

  // Connection Testing
  async testConnection(integrationId: string): Promise<TestConnectionResult> {
    return this.crudService.testConnection(integrationId)
  }

  async validateProviderConnection(
    provider: string,
    authData: Record<string, unknown>
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      this.logger.info('Validating provider connection', { provider, hasAuthData: !!authData })
      
      switch (provider) {
        case 'xero':
          return this.validateXeroConnection(authData)
        case 'quickbooks':
          return this.validateQuickBooksConnection(authData)
        default:
          return { 
            isValid: false, 
            error: `Provider '${provider}' is not supported for validation` 
          }
      }
    } catch (error) {
      this.logger.error('Provider validation failed', { provider, error })
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      }
    }
  }

  private async validateXeroConnection(authData: Record<string, unknown>): Promise<{ isValid: boolean; error?: string }> {
    const requiredFields = ['accessToken', 'refreshToken', 'tenantId']
    const missingFields = requiredFields.filter(field => !authData[field])
    
    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required Xero auth fields: ${missingFields.join(', ')}`
      }
    }

    // Check token expiry
    const expiresAt = authData.expiresAt
    if (expiresAt) {
      const expiryDate = new Date(expiresAt as string)
      const now = new Date()
      if (expiryDate <= now) {
        return {
          isValid: false,
          error: 'Xero access token has expired'
        }
      }
    }

    // Validate token format (basic check)
    const accessToken = authData.accessToken as string
    if (!accessToken || accessToken.length < 10) {
      return {
        isValid: false,
        error: 'Invalid Xero access token format'
      }
    }

    return { isValid: true }
  }

  private async validateQuickBooksConnection(authData: Record<string, unknown>): Promise<{ isValid: boolean; error?: string }> {
    const requiredFields = ['accessToken', 'refreshToken', 'realmId']
    const missingFields = requiredFields.filter(field => !authData[field])
    
    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required QuickBooks auth fields: ${missingFields.join(', ')}`
      }
    }

    return { isValid: true }
  }

  // Provider Information
  getSupportedProviders(): ProviderInfo[] {
    return this.providerService.getSupportedProviders()
  }

  // Sync Operations
  async triggerSync(
    integrationId: string,
    options: TriggerSyncOptions
  ): Promise<{ syncJobId: string; message: string }> {
    const syncJob = await this.syncService.triggerSync(integrationId, options)
    return {
      syncJobId: syncJob.id,
      message: 'Sync triggered successfully'
    }
  }

  async getSyncLogs(
    integrationId: string,
    filters?: SyncFilters
  ): Promise<SyncLogEntry[]> {
    this.logger.debug('Getting sync logs', { integrationId, filters })
    
    // Get the raw logs from sync service
    const result = await this.syncService.getSyncLogs(integrationId)
    let filteredLogs = result.logs
    
    // Apply filters if provided
    if (filters) {
      filteredLogs = this.applySyncFilters(filteredLogs, filters)
    }
    
    return filteredLogs
  }

  private applySyncFilters(logs: SyncLogEntry[], filters: SyncFilters): SyncLogEntry[] {
    let filtered = logs

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(log => filters.status!.includes(log.status))
    }

    // Filter by date range (using startedAt or completedAt)
    if (filters.dateFrom) {
      filtered = filtered.filter(log => {
        const logDate = log.completedAt || log.startedAt
        return logDate ? logDate >= filters.dateFrom! : false
      })
    }

    if (filters.dateTo) {
      filtered = filtered.filter(log => {
        const logDate = log.completedAt || log.startedAt
        return logDate ? logDate <= filters.dateTo! : false
      })
    }

    return filtered
  }

  // Health and Status
  async getIntegrationHealth(integrationId: string): Promise<{
    status: 'healthy' | 'warning' | 'error'
    lastSync?: Date
    nextSync?: Date
    issues?: string[]
  }> {
    try {
      const integration = await this.getById(integrationId)
      if (!integration) {
        return {
          status: 'error',
          issues: ['Integration not found']
        }
      }

      const connectionTest = await this.testConnection(integrationId)
      const syncLogs = await this.getSyncLogs(integrationId, {
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      })

      const recentErrors = syncLogs.filter(log => 
        log.status === 'failed' && 
        log.completedAt && 
        log.completedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      )

      let status: 'healthy' | 'warning' | 'error' = 'healthy'
      const issues: string[] = []

      if (!connectionTest.success) {
        status = 'error'
        issues.push(`Connection test failed: ${connectionTest.message}`)
      }

      if (recentErrors.length > 0) {
        status = status === 'error' ? 'error' : 'warning'
        issues.push(`${recentErrors.length} sync errors in the last 24 hours`)
      }

      const healthResponse: {
        status: 'healthy' | 'warning' | 'error'
        lastSync?: Date
        nextSync?: Date
        issues?: string[]
      } = {
        status
      }
      
      if (integration.lastSyncAt) {
        healthResponse.lastSync = integration.lastSyncAt
      }
      
      if (integration.nextScheduledSync) {
        healthResponse.nextSync = integration.nextScheduledSync
      }
      
      if (issues.length > 0) {
        healthResponse.issues = issues
      }
      
      return healthResponse
    } catch (error) {
      this.logger.error('Failed to get integration health', { integrationId, error })
      return {
        status: 'error',
        issues: ['Failed to check integration health']
      }
    }
  }
}