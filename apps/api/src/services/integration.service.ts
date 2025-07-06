import type { IntegrationRepository } from '../core/ports/integration.repository'
import type { IntegrationEntity, IntegrationProvider, IntegrationType, IntegrationSettings } from '../core/domain/integration'
import { IntegrationEntity as IntegrationEntityClass, PROVIDER_CAPABILITIES } from '../core/domain/integration'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'
import { container, TOKENS } from '../shared/utils/container'

export interface CreateIntegrationData {
  tenantId: string
  provider: IntegrationProvider
  integrationType: IntegrationType
  name: string
  authData: Record<string, unknown>
  settings?: IntegrationSettings
  metadata?: Record<string, unknown>
}

export interface UpdateIntegrationData {
  name?: string
  authData?: Record<string, unknown>
  settings?: Partial<IntegrationSettings>
  metadata?: Record<string, unknown>
  status?: 'active' | 'disabled' | 'error' | 'setup_pending'
}

export class IntegrationService {
  constructor() {}

  async getById(id: string): Promise<IntegrationEntity | null> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    return repository.findById(EntityId.from(id))
  }

  async getByTenant(tenantId: string): Promise<IntegrationEntity[]> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    return repository.findByTenant(tenantId)
  }

  async findById(id: string): Promise<IntegrationEntity | null> {
    return this.getById(id)
  }

  async findByTenantId(tenantId: string): Promise<IntegrationEntity[]> {
    return this.getByTenant(tenantId)
  }

  async create(data: CreateIntegrationData): Promise<IntegrationEntity> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    
    // Check if integration already exists
    const existing = await repository.findByTenantAndProvider(data.tenantId, data.provider)
    if (existing) {
      throw new Error(`Integration with provider ${data.provider} already exists for this tenant`)
    }

    // Get provider capabilities
    const capabilities = PROVIDER_CAPABILITIES[data.provider]
    if (!capabilities) {
      throw new Error(`Unknown provider: ${data.provider}`)
    }

    // Create integration entity
    const integration = IntegrationEntityClass.create({
      tenantId: data.tenantId,
      provider: data.provider,
      integrationType: data.integrationType,
      name: data.name,
      status: 'setup_pending',
      authData: data.authData,
      settings: data.settings || {},
      metadata: data.metadata || {},
      capabilities
    })

    return repository.create(integration)
  }

  async update(id: string, data: UpdateIntegrationData): Promise<IntegrationEntity> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    
    const integration = await repository.findById(EntityId.from(id))
    if (!integration) {
      throw new Error(`Integration with id ${id} not found`)
    }

    // Update fields
    if (data.name) {
      integration.updateName(data.name)
    }
    if (data.authData) {
      integration.updateAuthData(data.authData)
    }
    if (data.settings) {
      integration.updateSettings(data.settings)
    }
    if (data.metadata) {
      integration.updateMetadata(data.metadata)
    }
    if (data.status) {
      switch (data.status) {
        case 'active':
          integration.activate()
          break
        case 'disabled':
          integration.disable()
          break
        case 'setup_pending':
          integration.markAsSetupPending()
          break
        case 'error':
          // Status will be set by recordSyncError
          break
      }
    }

    return repository.save(integration)
  }

  async save(integration: IntegrationEntity): Promise<IntegrationEntity> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    return repository.save(integration)
  }

  async delete(id: string): Promise<void> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    return repository.delete(id)
  }

  async testConnection(integrationId: string): Promise<boolean> {
    const integration = await this.getById(integrationId)
    if (!integration) {
      throw new Error(`Integration with id ${integrationId} not found`)
    }

    // Check if integration has valid auth
    if (!integration.hasValidAuth()) {
      throw new Error('Integration does not have valid authentication data')
    }

    // TODO: Implement actual connection testing based on provider
    // This would involve calling the external API with the auth data
    // For now, we'll simulate the test based on status
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For now, return true if integration is active
      // In real implementation, this would make actual API calls
      if (integration.isActive()) {
        return true
      }
      
      // If not active but has valid auth, try to activate
      if (integration.hasValidAuth()) {
        integration.activate()
        await this.save(integration)
        return true
      }
      
      return false
    } catch (error) {
      // Record error and return false
      integration.recordSyncError(error instanceof Error ? error.message : 'Connection test failed')
      await this.save(integration)
      return false
    }
  }

  async getActiveIntegrations(): Promise<IntegrationEntity[]> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    return repository.findActive()
  }

  async getIntegrationsWithErrors(): Promise<IntegrationEntity[]> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    return repository.findWithErrors()
  }

  async getIntegrationsDueForSync(): Promise<IntegrationEntity[]> {
    const repository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    return repository.findDueForSync()
  }

  async recordSuccessfulSync(integrationId: string): Promise<void> {
    const integration = await this.getById(integrationId)
    if (!integration) {
      throw new Error(`Integration with id ${integrationId} not found`)
    }

    integration.recordSuccessfulSync()
    await this.save(integration)
  }

  async recordSyncError(integrationId: string, errorMessage: string): Promise<void> {
    const integration = await this.getById(integrationId)
    if (!integration) {
      throw new Error(`Integration with id ${integrationId} not found`)
    }

    integration.recordSyncError(errorMessage)
    await this.save(integration)
  }

  async completeAuthWithOrganisation(params: {
    integrationId: string
    code: string
    state: string
    tenantId: string
    organisationId: string
  }): Promise<IntegrationEntity> {
    // This would handle the final step of OAuth for providers with multiple organisations
    // For now, return the existing integration or create a new one
    const existing = await this.getById(params.integrationId)
    if (existing) {
      existing.updateMetadata({ organisationId: params.organisationId })
      return this.save(existing)
    }
    
    // Create new integration if it doesn't exist
    return this.create({
      tenantId: params.tenantId,
      provider: 'xero' as any, // This should be determined from state
      integrationType: 'accounting' as any,
      name: 'Xero Integration',
      authData: { organisationId: params.organisationId },
      settings: {}
    })
  }
}