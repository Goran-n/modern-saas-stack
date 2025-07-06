import { IntegrationService } from '../../services/integration.service'
import { OAuthService } from '../../services/oauth.service'
import { SyncManagementService } from '../../services/sync-management.service'
import { ProviderService } from '../../services/provider.service'
import { IntegrationNotFoundError } from '../../lib/errors'

export interface CreateIntegrationCommand {
  tenantId: string
  provider: string
  name: string
  integrationType: 'accounting' | 'file_storage' | 'communication' | 'banking'
  settings?: Record<string, unknown>
}

export interface UpdateIntegrationCommand {
  integrationId: string
  tenantId: string
  name?: string
  settings?: Record<string, unknown>
  status?: 'active' | 'error' | 'disabled' | 'setup_pending'
}

export interface TestConnectionCommand {
  integrationId: string
  tenantId: string
}

export interface GetAuthUrlCommand {
  provider: string
  redirectUri: string
  tenantId: string
}

export interface CompleteAuthCommand {
  provider: string
  code: string
  state: string
  tenantId: string
}

export interface GetSyncLogsCommand {
  integrationId: string
  tenantId: string
  limit: number
  offset: number
}

export interface TriggerSyncCommand {
  integrationId: string
  tenantId: string
  syncType: 'full' | 'incremental'
}

export interface GetAvailableOrganisationsCommand {
  provider: string
  code: string
  state: string
  tenantId: string
}

export interface CompleteAuthWithOrganisationCommand {
  provider: string
  code: string
  state: string
  organisationId: string
  name: string
  tenantId: string
  settings?: Record<string, unknown>
  tokens?: {
    accessToken: string
    refreshToken?: string
    expiresAt: string
    scope: string[]
    tokenType: string
  }
}

export class IntegrationApplicationService {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly oauthService: OAuthService,
    private readonly syncManagementService: SyncManagementService,
    private readonly providerService: ProviderService
  ) {}

  async listIntegrations(tenantId: string) {
    return await this.integrationService.getByTenant(tenantId)
  }

  async getIntegration(integrationId: string, tenantId: string) {
    const integration = await this.integrationService.getById(integrationId)
    
    if (!integration || integration.tenantId !== tenantId) {
      throw new IntegrationNotFoundError(integrationId)
    }
    
    return integration
  }

  async createIntegration(command: CreateIntegrationCommand) {
    const createData: any = {
      provider: command.provider,
      name: command.name,
      integrationType: command.integrationType,
      tenantId: command.tenantId,
    }
    
    // Only add settings if provided
    if (command.settings !== undefined) {
      createData.settings = command.settings
    }
    
    return await this.integrationService.create(createData)
  }

  async updateIntegration(command: UpdateIntegrationCommand) {
    // Verify integration belongs to tenant
    const integration = await this.integrationService.getById(command.integrationId)
    if (!integration || integration.tenantId !== command.tenantId) {
      throw new IntegrationNotFoundError(command.integrationId)
    }
    
    const updateData: any = {}
    if (command.name !== undefined) updateData.name = command.name
    if (command.status !== undefined) updateData.status = command.status
    if (command.settings !== undefined) updateData.settings = command.settings
    
    return await this.integrationService.update(command.integrationId, updateData)
  }

  async deleteIntegration(integrationId: string, tenantId: string) {
    // Verify integration belongs to tenant
    const integration = await this.integrationService.getById(integrationId)
    if (!integration || integration.tenantId !== tenantId) {
      throw new IntegrationNotFoundError(integrationId)
    }
    
    await this.integrationService.delete(integrationId)
    return { success: true }
  }

  async testConnection(command: TestConnectionCommand) {
    // Verify integration belongs to tenant
    const integration = await this.integrationService.getById(command.integrationId)
    if (!integration || integration.tenantId !== command.tenantId) {
      throw new IntegrationNotFoundError(command.integrationId)
    }
    
    return await this.integrationService.testConnection(command.integrationId)
  }

  async getAuthUrl(command: GetAuthUrlCommand) {
    return await this.oauthService.getAuthUrl(
      command.provider,
      command.redirectUri,
      command.tenantId
    )
  }

  async completeAuth(command: CompleteAuthCommand) {
    // Exchange code for tokens
    const tokens = await this.oauthService.exchangeCodeForTokens(
      command.provider,
      command.code,
      command.tenantId
    )
    
    // Create integration with the tokens
    const createData: any = {
      provider: command.provider,
      name: `${command.provider} Integration`,
      integrationType: 'accounting',
      tenantId: command.tenantId,
      authData: tokens,
      status: 'active'
    }
    
    return await this.integrationService.create(createData)
  }

  async getSyncLogs(command: GetSyncLogsCommand) {
    // Verify integration belongs to tenant
    const integration = await this.integrationService.getById(command.integrationId)
    if (!integration || integration.tenantId !== command.tenantId) {
      throw new IntegrationNotFoundError(command.integrationId)
    }
    
    return await this.syncManagementService.getSyncLogs(command.integrationId, command.limit, command.offset)
  }

  async triggerSync(command: TriggerSyncCommand) {
    // Verify integration belongs to tenant
    const integration = await this.integrationService.getById(command.integrationId)
    if (!integration || integration.tenantId !== command.tenantId) {
      throw new IntegrationNotFoundError(command.integrationId)
    }
    
    return await this.syncManagementService.triggerSync(command.integrationId, {
      syncType: command.syncType,
      priority: 5
    })
  }

  async getSupportedProviders() {
    return await this.providerService.getSupportedProviders()
  }

  async getAvailableOrganisations(command: GetAvailableOrganisationsCommand) {
    return await this.oauthService.getAvailableOrganisations(
      command.provider,
      command.code,
      command.tenantId
    )
  }

  async completeAuthWithOrganisation(command: CompleteAuthWithOrganisationCommand) {
    return await this.integrationService.completeAuthWithOrganisation({
      integrationId: 'temp-id', // This should be generated properly
      code: command.code,
      state: command.state,
      tenantId: command.tenantId,
      organisationId: command.organisationId
    })
  }
}