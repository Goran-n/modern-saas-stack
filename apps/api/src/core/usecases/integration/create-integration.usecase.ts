import { IntegrationEntity, IntegrationProvider, IntegrationType } from '../../domain/integration'
import { EntityId } from '../../domain/shared/value-objects/entity-id'
import { NotFoundError, ConflictError, BusinessRuleError } from '../../../shared/errors'
import type { TenantRepository, IntegrationRepository, TenantMemberRepository } from '../../ports'
import { INTEGRATION } from '../../../shared/constants'
import { SyncService } from '../../../services/sync.service'
import log from '../../../config/logger'

export interface CreateIntegrationInput {
  tenantId: string
  userId: string
  provider: IntegrationProvider
  integrationType: IntegrationType
  name: string
  authData: Record<string, unknown>
  settings?: Record<string, unknown>
}

export interface CreateIntegrationOutput {
  integration: IntegrationEntity
}

export class CreateIntegrationUseCase {
  constructor(
    private tenantRepository: TenantRepository,
    private integrationRepository: IntegrationRepository,
    private tenantMemberRepository: TenantMemberRepository,
    private syncService: SyncService
  ) {}

  async execute(input: CreateIntegrationInput): Promise<CreateIntegrationOutput> {
    // Validate business rules
    await this.validateBusinessRules(input)

    // Create integration entity
    const integration = IntegrationEntity.create({
      tenantId: input.tenantId,
      provider: input.provider,
      integrationType: input.integrationType,
      name: input.name,
      status: 'setup_pending',
      authData: input.authData,
      settings: input.settings || {},
    })

    // Validate auth data
    this.validateAuthData(integration)

    // Activate integration if auth data is valid
    if (integration.hasValidAuth()) {
      log.info('Integration has valid auth data, activating immediately', {
        integrationId: integration.id,
        provider: integration.provider,
        tenantId: integration.tenantId
      })
      integration.activate()
    } else {
      log.info('Integration created with setup_pending status - requires activation', {
        integrationId: integration.id,
        provider: integration.provider,
        tenantId: integration.tenantId,
        hasAuthData: Object.keys(integration.authData).length > 0
      })
    }

    // Save to repository
    const savedIntegration = await this.integrationRepository.save(integration)

    // Trigger initial sync if integration is active
    if (savedIntegration.isActive()) {
      await this.triggerInitialSync(savedIntegration, input.userId)
    }

    return {
      integration: savedIntegration,
    }
  }

  private async validateBusinessRules(input: CreateIntegrationInput): Promise<void> {
    // Check if tenant exists and is active
    const tenant = await this.tenantRepository.findById(EntityId.from(input.tenantId))
    if (!tenant) {
      throw new NotFoundError('Tenant', input.tenantId)
    }

    if (!tenant.isActive()) {
      throw new BusinessRuleError(
        'TENANT_NOT_ACTIVE',
        'Cannot create integrations for inactive tenant'
      )
    }

    // Check if user has permission
    const membership = await this.tenantMemberRepository.findByUserAndTenant(
      input.userId,
      input.tenantId
    )

    if (!membership || !membership.isActive()) {
      throw new BusinessRuleError(
        'USER_NOT_MEMBER',
        'User must be an active member of the tenant'
      )
    }

    if (!membership.hasPermission('providers', 'connect')) {
      throw new BusinessRuleError(
        'INSUFFICIENT_PERMISSIONS',
        'User does not have permission to connect integrations'
      )
    }

    // Check if integration already exists for this provider
    const existingIntegration = await this.integrationRepository.findByTenantAndProvider(
      input.tenantId,
      input.provider
    )

    if (existingIntegration && existingIntegration.isActive()) {
      throw new ConflictError(
        `Integration with ${input.provider} already exists for this tenant`
      )
    }

    // Check tenant integration limits
    const currentIntegrationCount = await this.integrationRepository.countByTenant(input.tenantId)
    if (currentIntegrationCount >= INTEGRATION.MAX_PER_TENANT) {
      throw new BusinessRuleError(
        'INTEGRATION_LIMIT_EXCEEDED',
        `Tenant has reached the maximum number of integrations (${INTEGRATION.MAX_PER_TENANT})`
      )
    }

    // Validate integration name
    if (input.name.length < 1 || input.name.length > 100) {
      throw new BusinessRuleError(
        'INVALID_INTEGRATION_NAME',
        'Integration name must be between 1 and 100 characters'
      )
    }

    // Validate provider and type compatibility
    this.validateProviderTypeCompatibility(input.provider, input.integrationType)
  }

  private validateProviderTypeCompatibility(
    provider: IntegrationProvider,
    type: IntegrationType
  ): void {
    const compatibilityMap: Record<IntegrationProvider, IntegrationType[]> = {
      xero: ['accounting'],
      quickbooks: ['accounting'],
      sage: ['accounting'],
      freshbooks: ['accounting'],
    }

    const supportedTypes = compatibilityMap[provider]
    if (!supportedTypes?.includes(type)) {
      throw new BusinessRuleError(
        'INCOMPATIBLE_PROVIDER_TYPE',
        `Provider ${provider} does not support integration type ${type}`
      )
    }
  }

  private validateAuthData(integration: IntegrationEntity): void {
    const requiredFields: Record<IntegrationProvider, string[]> = {
      xero: ['accessToken', 'refreshToken', 'tenantId'],
      quickbooks: ['accessToken', 'refreshToken', 'companyId'],
      sage: ['apiKey', 'baseUrl'],
      freshbooks: ['accessToken', 'refreshToken', 'accountId'],
    }

    const required = requiredFields[integration.provider]
    const authData = integration.authData

    for (const field of required) {
      if (!authData[field]) {
        throw new BusinessRuleError(
          'MISSING_AUTH_DATA',
          `Missing required authentication field: ${field}`
        )
      }
    }

    // Validate token formats if needed
    if (integration.provider === 'xero' || integration.provider === 'quickbooks') {
      if (typeof authData.accessToken !== 'string' || authData.accessToken.length < 10) {
        throw new BusinessRuleError(
          'INVALID_ACCESS_TOKEN',
          'Access token must be a valid string'
        )
      }
    }
  }

  private async triggerInitialSync(
    integration: IntegrationEntity, 
    userId: string
  ): Promise<void> {
    try {
      log.info('Triggering initial sync for new integration', {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        provider: integration.provider,
        userId,
      })

      const syncJob = await this.syncService.triggerSync(
        integration.id.toString(),
        integration.tenantId,
        userId,
        'full', // Use 'full' sync type for first sync
        {
          priority: 10, // Higher priority for initial sync
        }
      )

      log.info('Initial sync triggered successfully', {
        integrationId: integration.id,
        syncJobId: syncJob.id,
        syncJobStatus: syncJob.status,
      })

      // Integration will be updated by the sync job when it completes
      // No need to update status here as the job will handle status updates

    } catch (error) {
      log.error('Failed to trigger initial sync', {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Log error but don't update integration status here
      // The sync job itself will handle status updates when it runs

      // Don't throw error to prevent integration creation from failing
      // Initial sync failure shouldn't block integration creation
    }
  }
}