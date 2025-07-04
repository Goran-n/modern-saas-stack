import { IntegrationEntity } from '../core/domain/integration'
import type { IntegrationRepository } from '../core/ports/integration.repository'
import type { Logger } from 'pino'
import { OAuthService } from './oauth.service'
import { ProviderService } from './provider.service'
import { validateStateHash } from '../utils/crypto'

export interface CreateIntegrationData {
  tenantId: string
  provider: string
  name: string
  integrationType: string
  settings?: Record<string, unknown>
}

export interface UpdateIntegrationData {
  name?: string
  settings?: Record<string, unknown>
  status?: 'active' | 'error' | 'disabled' | 'setup_pending'
}

export class IntegrationCrudService {
  constructor(
    private integrationRepository: IntegrationRepository,
    private oauthService: OAuthService,
    private providerService: ProviderService,
    private logger: Logger
  ) {
    // Runtime validation for dependency injection
    if (!this.integrationRepository) {
      throw new Error('IntegrationCrudService: IntegrationRepository dependency not injected')
    }
    if (!this.oauthService) {
      throw new Error('IntegrationCrudService: OAuthService dependency not injected')
    }
    if (!this.providerService) {
      throw new Error('IntegrationCrudService: ProviderService dependency not injected')
    }
    if (!this.logger) {
      throw new Error('IntegrationCrudService: Logger dependency not injected')
    }
    
    this.logger.info('IntegrationCrudService successfully instantiated with all dependencies')
  }

  async create(data: CreateIntegrationData): Promise<IntegrationEntity> {
    // Validate provider is supported
    const supportedProviders = this.providerService.getSupportedProviders()
    const providerInfo = supportedProviders.find(p => p.provider === data.provider)
    
    if (!providerInfo) {
      throw new Error(`Unsupported provider: ${data.provider}`)
    }

    // Create integration entity
    const integration = IntegrationEntity.create({
      tenantId: data.tenantId,
      provider: data.provider as any,
      integrationType: data.integrationType as any,
      name: data.name,
      status: 'setup_pending',
      authData: {},
      settings: data.settings || {},
      capabilities: providerInfo.capabilities,
      metadata: {}
    })

    // Save to repository
    const created = await this.integrationRepository.create(integration)
    
    this.logger.info(
      { integrationId: created.id, provider: data.provider, tenantId: data.tenantId },
      'Integration created'
    )

    return created
  }

  async getById(id: string): Promise<IntegrationEntity | null> {
    return this.integrationRepository.findById(id)
  }

  async getByTenant(tenantId: string): Promise<IntegrationEntity[]> {
    return this.integrationRepository.findByTenant(tenantId)
  }

  async update(id: string, data: UpdateIntegrationData): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findById(id)
    if (!integration) {
      throw new Error('Integration not found')
    }

    // Update fields
    const updates: Partial<IntegrationEntity> = {
      ...data,
      updatedAt: new Date()
    }

    const updated = await this.integrationRepository.update(id, updates)
    
    this.logger.info({ integrationId: id, updates: Object.keys(data) }, 'Integration updated')
    
    return updated
  }

  async delete(id: string): Promise<void> {
    const integration = await this.integrationRepository.findById(id)
    if (!integration) {
      throw new Error('Integration not found')
    }

    // Revoke OAuth tokens if present
    try {
      await this.oauthService.revokeTokens(integration)
    } catch (error) {
      this.logger.warn({ error, integrationId: id }, 'Failed to revoke tokens during deletion')
    }

    await this.integrationRepository.delete(id)
    
    this.logger.info({ integrationId: id }, 'Integration deleted')
  }

  async completeOAuthSetup(
    provider: string,
    code: string,
    state: string,
    organisationId: string,
    name: string,
    settings: Record<string, unknown>,
    tenantId: string,
    existingTokens?: any
  ): Promise<IntegrationEntity> {
    // Validate state
    const validState = validateStateHash(state, tenantId)
    if (!validState) {
      throw new Error('Invalid OAuth state')
    }

    // Get tokens if not provided
    const tokens = existingTokens || await this.oauthService.exchangeCodeForTokens(provider, code, tenantId)

    // Get provider metadata
    const metadata = await this.providerService.getProviderMetadata(provider, organisationId, tokens)

    // Check if integration already exists
    const existingIntegrations = await this.integrationRepository.findByTenant(tenantId)
    const existing = existingIntegrations.find(
      i => i.provider === provider && i.metadata?.xeroTenantId === organisationId
    )

    if (existing) {
      // Update existing integration
      return this.update(existing.id, {
        name,
        settings,
        status: 'active'
      })
    }

    // Create new integration
    const providerInfo = this.providerService.getSupportedProviders()
      .find(p => p.provider === provider)!

    const integration = IntegrationEntity.create({
      tenantId,
      provider: provider as any,
      integrationType: providerInfo.type as any,
      name,
      status: 'active',
      settings,
      capabilities: providerInfo.capabilities,
      authData: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
        scope: tokens.scope,
        tokenType: tokens.tokenType
      },
      metadata
    })

    const created = await this.integrationRepository.create(integration)
    
    this.logger.info(
      { integrationId: created.id, provider, organisationId },
      'OAuth setup completed'
    )

    return created
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string; requiresReauth?: boolean }> {
    const integration = await this.integrationRepository.findById(id)
    if (!integration) {
      throw new Error('Integration not found')
    }

    this.logger.info({ integrationId: id, provider: integration.provider }, 'Testing integration connection')

    try {
      this.logger.info({ integrationId: id, step: 'calling_provider_service' }, 'Calling provider service')
      const result = await this.providerService.testConnection(integration)
      
      // Safely handle the result
      if (!result) {
        this.logger.error({ integrationId: id }, 'Provider service returned undefined result')
        return { success: false, message: 'Provider service returned no result' }
      }
      
      if (result.success) {
        this.logger.info({ integrationId: id }, 'Connection test successful')
        return { success: true, message: result.message || 'Connection successful' }
      } else {
        const errorMessage = result.message || 'Connection test failed'
        this.logger.warn({ integrationId: id, error: errorMessage }, 'Connection test failed')
        return { success: false, message: errorMessage }
      }
    } catch (error) {
      // Log the full error object for debugging
      this.logger.error({ 
        integrationId: id, 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorKeys: error ? Object.keys(error) : [],
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      }, 'Connection test error - full details')
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const isAuthError = errorMessage.includes('refresh') || 
                         errorMessage.includes('token') || 
                         errorMessage.includes('authentication')
      
      return {
        success: false,
        message: errorMessage,
        requiresReauth: isAuthError
      }
    }
  }

  async updateIntegrationHealth(
    id: string, 
    health: { score: number; issues: string[] }
  ): Promise<void> {
    await this.integrationRepository.update(id, {
      health: {
        score: health.score,
        lastCheck: new Date().toISOString(),
        issues: health.issues
      }
    })
  }
}