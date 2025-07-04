import logger from '@vepler/logger'
import type { IntegrationEntity } from '../domain/integration/integration.entity'
import type { IntegrationRepository } from '../ports/integration.repository'
import { 
  type OAuth2AuthData, 
  type XeroAuthData,
  extractAuthData,
  parseAuthData 
} from '../domain/integration/auth-data.types'
import { XeroProvider } from '../../integrations/accounting/xero/xero.provider'
import { RequestContextManager } from '../context/request-context'
import { IntegrationError } from '../../shared/errors/infrastructure.errors'

export interface TokenRefreshResult {
  success: boolean
  tokens?: OAuth2AuthData
  error?: string
  needsReauth?: boolean
}

export interface TokenHealthStatus {
  isValid: boolean
  expiresAt?: Date
  secondsUntilExpiry?: number
  needsRefresh: boolean
  consecutiveRefreshFailures: number
  lastRefreshError?: string
  lastRefreshAttempt?: Date
}

/**
 * Unified token management service that handles token lifecycle for all providers
 * This replaces the fragmented token handling in XeroTokenService and XeroProvider
 */
export class TokenManagementService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly xeroProvider: XeroProvider
  ) {}

  /**
   * Check the health status of tokens for an integration
   */
  async checkTokenHealth(integration: IntegrationEntity): Promise<TokenHealthStatus> {
    try {
      // Extract auth data based on provider type
      let authData: OAuth2AuthData
      
      switch (integration.provider) {
        case 'xero':
          authData = extractAuthData<XeroAuthData>(integration.provider, integration.authData)
          break
        default:
          throw new Error(`Unsupported provider: ${integration.provider}`)
      }
      
      const now = Date.now()
      const issuedAt = authData.issuedAt ? new Date(authData.issuedAt).getTime() : now
      const expiresAt = authData.expiresAt 
        ? new Date(authData.expiresAt)
        : new Date(issuedAt + (authData.expiresIn * 1000))
      
      const secondsUntilExpiry = Math.floor((expiresAt.getTime() - now) / 1000)
      const needsRefresh = secondsUntilExpiry <= 300 // 5 minute buffer
      
      // Check for consecutive refresh failures
      const metadata = integration.metadata as any || {}
      const consecutiveRefreshFailures = metadata.consecutiveRefreshFailures || 0
      
      const result: TokenHealthStatus = {
        isValid: !authData.accessToken ? false : secondsUntilExpiry > 0,
        expiresAt,
        secondsUntilExpiry,
        needsRefresh,
        consecutiveRefreshFailures,
        lastRefreshError: metadata.lastRefreshError
      }
      
      if (metadata.lastRefreshAttempt) {
        result.lastRefreshAttempt = new Date(metadata.lastRefreshAttempt)
      }
      
      return result
    } catch (error) {
      logger.error('Failed to check token health', {
        integrationId: integration.id,
        provider: integration.provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        isValid: false,
        needsRefresh: true,
        consecutiveRefreshFailures: 0
      }
    }
  }

  /**
   * Refresh tokens for an integration if needed
   */
  async refreshTokensIfNeeded(integration: IntegrationEntity): Promise<TokenRefreshResult> {
    const health = await this.checkTokenHealth(integration)
    
    if (!health.needsRefresh) {
      return { success: true }
    }
    
    logger.info('Tokens need refresh', {
      integrationId: integration.id,
      provider: integration.provider,
      secondsUntilExpiry: health.secondsUntilExpiry,
      consecutiveFailures: health.consecutiveRefreshFailures
    })
    
    return this.refreshTokens(integration)
  }

  /**
   * Force refresh tokens for an integration
   */
  async refreshTokens(integration: IntegrationEntity): Promise<TokenRefreshResult> {
    const startTime = Date.now()
    
    try {
      let newTokens: OAuth2AuthData
      
      switch (integration.provider) {
        case 'xero':
          newTokens = await this.refreshXeroTokens(integration)
          break
        case 'quickbooks':
          // TODO: Implement QuickBooks refresh
          throw new Error('QuickBooks token refresh not implemented')
        case 'freshbooks':
          // TODO: Implement FreshBooks refresh
          throw new Error('FreshBooks token refresh not implemented')
        default:
          throw new Error(`Token refresh not supported for provider: ${integration.provider}`)
      }
      
      // Update integration with new tokens
      await this.updateIntegrationTokens(integration, newTokens)
      
      // Clear any error state
      await this.clearTokenErrorState(integration)
      
      logger.info('Token refresh successful', {
        integrationId: integration.id,
        provider: integration.provider,
        duration: Date.now() - startTime
      })
      
      return { success: true, tokens: newTokens }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logger.error('Token refresh failed', {
        integrationId: integration.id,
        provider: integration.provider,
        error: errorMessage,
        duration: Date.now() - startTime
      })
      
      // Record the failure
      await this.recordTokenRefreshFailure(integration, errorMessage)
      
      // Check if re-authentication is needed
      const needsReauth = this.isReauthRequired(errorMessage, integration)
      
      return {
        success: false,
        error: errorMessage,
        needsReauth
      }
    }
  }

  /**
   * Refresh Xero tokens
   */
  private async refreshXeroTokens(integration: IntegrationEntity): Promise<OAuth2AuthData> {
    const authData = extractAuthData<XeroAuthData>(integration.provider, integration.authData)
    
    if (!authData.refreshToken) {
      throw new Error('No refresh token available')
    }
    
    // Create a context for the refresh operation
    const context = RequestContextManager.createXeroContext(integration)
    
    return RequestContextManager.run(context, async () => {
      const credentials = await this.xeroProvider.refreshAccessToken(authData.refreshToken)
      
      const now = new Date()
      const expiresAt = new Date(now.getTime() + (credentials.expiresIn * 1000))
      
      return {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresIn: credentials.expiresIn,
        tokenType: credentials.tokenType,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      }
    })
  }

  /**
   * Update integration with new tokens
   */
  private async updateIntegrationTokens(
    integration: IntegrationEntity,
    newTokens: OAuth2AuthData
  ): Promise<void> {
    // Merge new tokens with existing auth data
    const updatedAuthData = {
      ...integration.authData,
      ...newTokens
    }
    
    // Validate the merged data
    parseAuthData(integration.provider, updatedAuthData)
    
    // Update the integration
    integration.updateAuthData(updatedAuthData)
    await this.integrationRepository.save(integration)
  }

  /**
   * Clear token error state after successful refresh
   */
  private async clearTokenErrorState(integration: IntegrationEntity): Promise<void> {
    const metadata = integration.metadata || {}
    
    const updatedMetadata = {
      ...metadata,
      consecutiveRefreshFailures: 0,
      lastRefreshError: null,
      lastSuccessfulRefresh: new Date().toISOString()
    }
    
    integration.updateMetadata(updatedMetadata)
    await this.integrationRepository.save(integration)
  }

  /**
   * Record a token refresh failure
   */
  private async recordTokenRefreshFailure(
    integration: IntegrationEntity,
    errorMessage: string
  ): Promise<void> {
    const metadata = integration.metadata as any || {}
    const currentFailures = metadata.consecutiveRefreshFailures || 0
    
    const updatedMetadata = {
      ...metadata,
      consecutiveRefreshFailures: currentFailures + 1,
      lastRefreshError: errorMessage,
      lastRefreshAttempt: new Date().toISOString()
    }
    
    integration.updateMetadata(updatedMetadata)
    
    // Mark integration as error if too many failures
    if (currentFailures + 1 >= 10) {
      integration.recordSyncError(`Token refresh failed ${currentFailures + 1} times: ${errorMessage}`)
    }
    
    await this.integrationRepository.save(integration)
  }

  /**
   * Check if re-authentication is required based on error
   */
  private isReauthRequired(errorMessage: string, integration: IntegrationEntity): boolean {
    const reAuthKeywords = [
      'invalid_grant',
      'refresh_token',
      'expired',
      'revoked',
      'invalid token',
      'authentication required'
    ]
    
    const hasReAuthKeyword = reAuthKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    )
    
    const metadata = integration.metadata as any || {}
    const consecutiveFailures = metadata.consecutiveRefreshFailures || 0
    
    return hasReAuthKeyword || consecutiveFailures >= 10
  }

  /**
   * Validate that an integration has valid auth data for API calls
   */
  async validateAuthData(integration: IntegrationEntity): Promise<void> {
    const health = await this.checkTokenHealth(integration)
    
    if (!health.isValid) {
      throw new IntegrationError(
        integration.provider,
        'Invalid or expired authentication tokens',
        401,
        { integrationId: integration.id, needsRefresh: health.needsRefresh }
      )
    }
    
    if (health.consecutiveRefreshFailures >= 10) {
      throw new IntegrationError(
        integration.provider,
        'Authentication tokens cannot be refreshed - re-authentication required',
        401,
        { integrationId: integration.id, consecutiveFailures: health.consecutiveRefreshFailures }
      )
    }
  }

  /**
   * Get a provider client configured with valid tokens
   * This includes automatic refresh if needed
   */
  async getConfiguredClient(integration: IntegrationEntity): Promise<any> {
    // Validate and refresh if needed
    await this.validateAuthData(integration)
    
    const refreshResult = await this.refreshTokensIfNeeded(integration)
    if (!refreshResult.success) {
      throw new IntegrationError(
        integration.provider,
        refreshResult.error || 'Failed to refresh tokens',
        401,
        { integrationId: integration.id, needsReauth: refreshResult.needsReauth }
      )
    }
    
    // Re-fetch integration to get updated tokens
    const updatedIntegration = await this.integrationRepository.findById(integration.id)
    if (!updatedIntegration) {
      throw new Error('Integration not found after token refresh')
    }
    
    // Return provider-specific client
    switch (updatedIntegration.provider) {
      case 'xero':
        return this.getXeroClient(updatedIntegration)
      default:
        throw new Error(`Provider ${updatedIntegration.provider} not supported`)
    }
  }

  /**
   * Get configured Xero client with context
   */
  private getXeroClient(integration: IntegrationEntity): any {
    const context = RequestContextManager.createXeroContext(integration)
    
    return {
      provider: this.xeroProvider,
      context,
      executeInContext: <T>(fn: () => T | Promise<T>) => {
        return RequestContextManager.run(context, fn)
      }
    }
  }
}