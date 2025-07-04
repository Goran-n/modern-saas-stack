import { Injectable, Inject } from '../lib/di/decorators'
import { XeroClient } from 'xero-node'
import { IntegrationEntity } from '../core/domain/integration'
import type { IntegrationRepository } from '../core/ports/integration.repository'
import type { Logger } from 'pino'
import { generateStateHash } from '../utils/crypto'
import { getTokenConfig } from '../config/sync.config'

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope: string[]
  tokenType: string
}

export interface OAuthOrganisation {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

@Injectable('OAuthService')
export class OAuthService {
  constructor(
    @Inject('IntegrationRepository') private integrationRepository: IntegrationRepository,
    @Inject('XeroClientFactory') private xeroClientFactory: (tenantId?: string) => XeroClient,
    @Inject('Logger') private logger: Logger
  ) {}

  async getAuthUrl(provider: string, _redirectUri: string, tenantId: string): Promise<{ authUrl: string; state: string }> {
    if (provider !== 'xero') {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    const xeroClient = this.xeroClientFactory(tenantId)
    const state = generateStateHash(tenantId)
    
    try {
      const authUrl = await xeroClient.buildConsentUrl()
      this.logger.info({ provider, tenantId }, 'Generated OAuth authorization URL')
      
      return { authUrl, state }
    } catch (error) {
      this.logger.error({ error, provider, tenantId }, 'Failed to generate authorization URL')
      throw new Error('Failed to generate authorization URL')
    }
  }

  async exchangeCodeForTokens(
    provider: string, 
    code: string, 
    tenantId: string
  ): Promise<OAuthTokens> {
    if (provider !== 'xero') {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    const xeroClient = this.xeroClientFactory(tenantId)

    try {
      const tokenSet = await xeroClient.apiCallback(code)
      
      if (!tokenSet.access_token) {
        throw new Error('No access token received from provider')
      }

      const tokens: OAuthTokens = {
        accessToken: tokenSet.access_token,
        expiresAt: new Date(Date.now() + (tokenSet.expires_in || getTokenConfig().defaultExpirySeconds) * 1000),
        scope: tokenSet.scope?.split(' ') || [],
        tokenType: tokenSet.token_type || 'Bearer'
      }
      
      if (tokenSet.refresh_token) {
        tokens.refreshToken = tokenSet.refresh_token
      }

      this.logger.info({ provider, tenantId }, 'Successfully exchanged code for tokens')
      return tokens
    } catch (error) {
      this.logger.error({ error, provider, tenantId }, 'Failed to exchange code for tokens')
      throw new Error('Failed to exchange authorization code')
    }
  }

  async refreshTokens(integration: IntegrationEntity): Promise<OAuthTokens> {
    if (integration.provider !== 'xero') {
      throw new Error(`Unsupported provider: ${integration.provider}`)
    }

    if (!integration.authData?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const xeroClient = this.xeroClientFactory(integration.tenantId)

    try {
      const tokenSet = await xeroClient.refreshWithRefreshToken(
        process.env.XERO_CLIENT_ID!,
        process.env.XERO_CLIENT_SECRET!,
        integration.authData.refreshToken
      )

      const tokens: OAuthTokens = {
        accessToken: tokenSet.access_token!,
        expiresAt: new Date(Date.now() + (tokenSet.expires_in || getTokenConfig().defaultExpirySeconds) * 1000),
        scope: tokenSet.scope?.split(' ') || [],
        tokenType: tokenSet.token_type || 'Bearer'
      }
      
      if (tokenSet.refresh_token) {
        tokens.refreshToken = tokenSet.refresh_token
      }

      // Update integration with new tokens
      const updatedAuthData: any = {
        ...integration.authData,
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt.toISOString(),
        scope: tokens.scope
      }
      
      if (tokens.refreshToken) {
        updatedAuthData.refreshToken = tokens.refreshToken
      }
      
      const updatedIntegration = IntegrationEntity.fromDatabase({
        ...integration.toDatabase(),
        authData: updatedAuthData,
        updatedAt: new Date()
      })
      
      await this.integrationRepository.save(updatedIntegration)

      this.logger.info({ integrationId: integration.id }, 'Successfully refreshed tokens')
      return tokens
    } catch (error) {
      this.logger.error({ error, integrationId: integration.id }, 'Failed to refresh tokens')
      throw new Error('Failed to refresh access token')
    }
  }

  async getAvailableOrganisations(
    provider: string,
    code: string,
    tenantId: string
  ): Promise<OAuthOrganisation[]> {
    if (provider !== 'xero') {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    const xeroClient = this.xeroClientFactory(tenantId)

    try {
      // Exchange code for tokens first
      const tokenSet = await xeroClient.apiCallback(code)
      await xeroClient.setTokenSet(tokenSet)

      // Get tenants/organisations
      const tenants = await xeroClient.updateTenants()
      
      return tenants.map(tenant => ({
        id: tenant.tenantId,
        name: tenant.tenantName || 'Unknown Organisation',
        metadata: {
          tenantType: tenant.tenantType,
          createdDateUtc: tenant.createdDateUtc,
          updatedDateUtc: tenant.updatedDateUtc
        }
      }))
    } catch (error) {
      this.logger.error({ error, provider, tenantId }, 'Failed to get available organisations')
      throw new Error('Failed to retrieve available organisations')
    }
  }

  async revokeTokens(integration: IntegrationEntity): Promise<void> {
    if (!integration.authData?.refreshToken) {
      this.logger.warn({ integrationId: integration.id }, 'No refresh token to revoke')
      return
    }

    if (integration.provider !== 'xero') {
      throw new Error(`Unsupported provider: ${integration.provider}`)
    }

    const xeroClient = this.xeroClientFactory(integration.tenantId)

    try {
      await (xeroClient as any).revokeToken(integration.authData.refreshToken as string)

      this.logger.info({ integrationId: integration.id }, 'Successfully revoked tokens')
    } catch (error) {
      // Log but don't throw - token might already be invalid
      this.logger.warn({ error, integrationId: integration.id }, 'Failed to revoke tokens')
    }
  }

  async validateTokens(integration: IntegrationEntity): Promise<boolean> {
    if (!integration.authData?.accessToken) {
      return false
    }

    // Check if token is expired
    if (integration.authData.expiresAt) {
      const expiresAt = new Date(integration.authData.expiresAt as string)
      if (expiresAt <= new Date()) {
        this.logger.debug({ integrationId: integration.id }, 'Access token is expired')
        return false
      }
    }

    return true
  }
}