import { Injectable, Inject } from '../lib/di/decorators'
import { XeroClient } from 'xero-node'
import type { IntegrationEntity } from '../core/domain/integration'
import type { Logger } from 'pino'
import { OAuthService } from './oauth.service'

export interface ProviderCapabilities {
  read: string[]
  write: string[]
  webhook: boolean
  realtime: boolean
  fileUpload: boolean
  batchOperations: boolean
}

export interface ProviderInfo {
  provider: string
  type: string
  name: string
  description: string
  logoUrl: string
  capabilities: ProviderCapabilities
  isAvailable: boolean
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  details?: Record<string, unknown>
}

@Injectable('ProviderService')
export class ProviderService {
  constructor(
    @Inject('XeroClientFactory') private xeroClientFactory: (tenantId?: string) => XeroClient,
    @Inject('OAuthService') private oauthService: OAuthService,
    @Inject('Logger') private logger: Logger
  ) {}

  getSupportedProviders(): ProviderInfo[] {
    return [
      {
        provider: 'xero',
        type: 'accounting',
        name: 'Xero',
        description: 'Cloud-based accounting software for small and medium businesses',
        logoUrl: 'https://www.xero.com/content/dam/xero/pilot-images/brand-assets/app-icon/xero-app-icon-512x512.png',
        capabilities: {
          read: ['invoices', 'customers', 'suppliers', 'accounts', 'transactions', 'items'],
          write: ['invoices', 'customers', 'suppliers', 'items'],
          webhook: true,
          realtime: false,
          fileUpload: true,
          batchOperations: true
        },
        isAvailable: true
      }
    ]
  }

  async testConnection(integration: IntegrationEntity): Promise<ConnectionTestResult> {
    // Debug the integration object
    this.logger.info({
      integrationId: integration?.id,
      provider: integration?.provider,
      hasAuthData: !!integration?.authData,
      hasMetadata: !!integration?.metadata,
      integrationKeys: integration ? Object.keys(integration) : [],
    }, 'Starting testConnection with integration data')

    if (!integration) {
      return {
        success: false,
        message: 'Integration object is null or undefined'
      }
    }

    if (integration.provider !== 'xero') {
      return {
        success: false,
        message: `Unsupported provider: ${integration.provider}`
      }
    }

    try {
      this.logger.info({ integrationId: integration.id, step: 'starting' }, 'Starting connection test')
      
      // Validate tokens first
      this.logger.info({ integrationId: integration.id, step: 'validate_tokens' }, 'Validating tokens')
      const tokensValid = await this.oauthService.validateTokens(integration)
      
      if (!tokensValid) {
        this.logger.info({ integrationId: integration.id, step: 'refresh_tokens' }, 'Refreshing tokens')
        // Try to refresh tokens
        await this.oauthService.refreshTokens(integration)
      }

      this.logger.info({ integrationId: integration.id, step: 'create_client' }, 'Creating Xero client')
      const xeroClient = this.xeroClientFactory(integration.tenantId)
      
      // Set tokens
      this.logger.info({ integrationId: integration.id, step: 'set_tokens' }, 'Setting tokens')
      await xeroClient.setTokenSet({
        access_token: integration.authData?.accessToken as string,
        refresh_token: integration.authData?.refreshToken as string,
        scope: integration.authData?.scope as string,
        token_type: (integration.authData?.tokenType as string) || 'Bearer'
      })

      // Test by getting organisation info
      this.logger.info({ 
        integrationId: integration.id, 
        step: 'get_organisations',
        hasMetadata: !!integration.metadata,
        metadataKeys: integration.metadata ? Object.keys(integration.metadata) : [],
        xeroTenantId: integration.metadata?.xeroTenantId,
        authDataTenantId: integration.authData?.tenantId
      }, 'Getting organisations')
      
      // Use tenantId from authData if not in metadata
      const xeroTenantId = integration.metadata?.xeroTenantId || integration.authData?.tenantId
      
      if (!xeroTenantId) {
        throw new Error('No Xero tenant ID found in integration metadata or auth data')
      }
      
      const orgResponse = await xeroClient.accountingApi.getOrganisations(xeroTenantId as string)

      if (orgResponse.body.organisations?.[0]) {
        const org = orgResponse.body.organisations[0]
        return {
          success: true,
          message: 'Connection successful',
          details: {
            organisationName: org.name,
            organisationId: org.organisationID,
            version: org.version,
            status: org.organisationStatus
          }
        }
      }

      return {
        success: false,
        message: 'No organisation found'
      }
    } catch (error) {
      this.logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        integrationId: integration?.id || 'unknown',
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        integrationProvider: integration?.provider || 'unknown'
      }, 'Connection test failed')
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  async validateProviderConnection(integration: IntegrationEntity): Promise<void> {
    const result = await this.testConnection(integration)
    
    if (!result.success) {
      throw new Error(`Provider connection validation failed: ${result.message}`)
    }
  }

  getProviderClient(integration: IntegrationEntity): XeroClient {
    if (integration.provider !== 'xero') {
      throw new Error(`Unsupported provider: ${integration.provider}`)
    }

    const xeroClient = this.xeroClientFactory(integration.tenantId)
    
    // Set tokens
    xeroClient.setTokenSet({
      access_token: integration.authData?.accessToken as string,
      refresh_token: integration.authData?.refreshToken as string,
      scope: integration.authData?.scope as string,
      token_type: (integration.authData?.tokenType as string) || 'Bearer'
    })

    return xeroClient
  }

  async getProviderMetadata(provider: string, organisationId: string, tokens: any): Promise<Record<string, unknown>> {
    if (provider !== 'xero') {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    try {
      const xeroClient = this.xeroClientFactory()
      await xeroClient.setTokenSet(tokens)

      const orgResponse = await xeroClient.accountingApi.getOrganisations(organisationId)
      const org = orgResponse.body.organisations?.[0]

      return {
        xeroTenantId: organisationId,
        organisationName: org?.name,
        organisationId: org?.organisationID,
        version: org?.version,
        status: org?.organisationStatus,
        baseCurrency: org?.baseCurrency,
        countryCode: org?.countryCode,
        isDemoCompany: org?.isDemoCompany,
        organisationType: org?.organisationType
      }
    } catch (error) {
      this.logger.error({ error, provider, organisationId }, 'Failed to get provider metadata')
      throw new Error('Failed to retrieve provider metadata')
    }
  }
}