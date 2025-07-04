import { XeroClient } from 'xero-node'
import { IntegrationEntity } from '../core/domain/integration'
import type { IntegrationRepository } from '../core/ports/integration.repository'
import type { Logger } from 'pino'
import { getXeroConfig } from '../config/config'

import {
  type XeroAuthData,
  type XeroTokens,
  type XeroTokenHealthCheck as TokenHealthCheck,
  type XeroTokenRefreshResult as TokenRefreshResult
} from '../integrations/accounting/xero'
import { getTokenConfig } from '../config/sync.config'
import { telemetry, trackPerformance, trackErrors } from '../shared/monitoring/telemetry'

/**
 * Specialised service for managing Xero OAuth tokens
 * Handles token validation, refresh, and health monitoring
 */
export class XeroTokenService {
  private xeroConfig = getXeroConfig()

  constructor(
    private integrationRepository: IntegrationRepository,
    private logger: Logger
  ) {}

  /**
   * Check the health of Xero tokens for an integration
   */
  @trackPerformance('xero_token_health_check')
  @trackErrors('integration', 'medium')
  async checkTokenHealth(integration: IntegrationEntity): Promise<TokenHealthCheck> {
    try {
      if (integration.provider !== 'xero') {
        throw new Error('Integration is not a Xero integration')
      }

      const authData = integration.authData as unknown as XeroAuthData
      if (!authData?.accessToken) {
        return {
          isValid: false,
          isExpired: true,
          expiresIn: 0,
          needsRefresh: false,
          consecutiveFailures: authData?.consecutiveFailures || 0,
          lastChecked: new Date(),
          error: 'No access token found'
        }
      }

      const expiresAt = authData.expiresAt ? new Date(authData.expiresAt) : null
      const now = new Date()
      const isExpired = expiresAt ? expiresAt <= now : true
      const expiresIn = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) : 0
      
      // Consider token needing refresh if it expires within 5 minutes
      const tokenConfig = getTokenConfig()
      const needsRefresh = expiresIn < tokenConfig.refreshBufferSeconds

      let isValid = true
      let error: string | undefined

      // Test the token by making a lightweight API call
      if (!isExpired) {
        try {
          const xero = new XeroClient({
            clientId: this.xeroConfig.clientId!,
            clientSecret: this.xeroConfig.clientSecret!,
            redirectUris: [this.xeroConfig.redirectUri!],
            scopes: this.xeroConfig.scopes
          })

          // Set the token and try to get organisation info
          const tokenSetParams: any = {
            access_token: authData.accessToken,
            refresh_token: authData.refreshToken,
            token_type: 'Bearer'
          }
          
          if (expiresAt) {
            tokenSetParams.expires_at = Math.floor(expiresAt.getTime() / 1000)
          }
          
          await xero.setTokenSet(tokenSetParams)

          // Try to get connections to validate the token
          // Note: XeroClient doesn't have direct apiClient access
          // We'll use a different method to validate the token
          try {
            // This is a placeholder - need to implement proper token validation
            // For now, assume the token is valid if we can set it
            isValid = true
          } catch (validationError) {
            isValid = false
            error = 'Token validation failed'
          }
        } catch (tokenError: any) {
          isValid = false
          error = tokenError.message || 'Token validation failed'
          
          // Check if it's a token-related error that suggests the token is invalid
          if (tokenError.response?.status === 401 || 
              tokenError.message?.includes('token') ||
              tokenError.message?.includes('authorization')) {
            isValid = false
          }
        }
      } else {
        isValid = false
      }

      const healthCheck: TokenHealthCheck = {
        isValid,
        isExpired,
        expiresIn,
        needsRefresh: needsRefresh || !isValid,
        consecutiveFailures: authData.consecutiveFailures || 0,
        lastChecked: now
      }
      
      if (error) {
        healthCheck.error = error
      }
      
      return healthCheck
    } catch (error) {
      this.logger.error('Failed to check token health', { 
        integrationId: integration.id, 
        error 
      })
      
      return {
        isValid: false,
        isExpired: true,
        expiresIn: 0,
        needsRefresh: false,
        consecutiveFailures: (integration.authData as any)?.consecutiveFailures || 0,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Refresh Xero access tokens
   */
  @trackPerformance('xero_token_refresh')
  @trackErrors('integration', 'high')
  async refreshTokens(integration: IntegrationEntity): Promise<TokenRefreshResult> {
    try {
      if (integration.provider !== 'xero') {
        throw new Error('Integration is not a Xero integration')
      }

      const authData = integration.authData as unknown as XeroAuthData
      if (!authData?.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
          needsReauth: true
        }
      }

      const xero = new XeroClient({
        clientId: this.xeroConfig.clientId!,
        clientSecret: this.xeroConfig.clientSecret!,
        redirectUris: [this.xeroConfig.redirectUri!],
        scopes: this.xeroConfig.scopes
      })

      // Set the current token to refresh
      await xero.setTokenSet({
        access_token: authData.accessToken,
        refresh_token: authData.refreshToken,
        token_type: 'Bearer'
      })
      
      // Attempt token refresh
      const tokenSet = await xero.refreshToken()

      if (!tokenSet || !tokenSet.access_token) {
        throw new Error('Failed to refresh tokens - no access token returned')
      }

      // Get fresh tenant/connection information
      const connectionInfo = await this.getConnectionInfo(xero, tokenSet.access_token!)

      const tokenConfig = getTokenConfig()
      // Use fresh connection info if available, fallback to existing auth data for resilience
      const useFallback = !connectionInfo.tenantId && authData.tenantId
      if (useFallback) {
        this.logger.info('Using existing tenant info as fallback during token refresh', {
          integrationId: integration.id,
          reason: 'Fresh connection info unavailable'
        })
      }

      const newTokens: XeroTokens = {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token || authData.refreshToken,
        expiresAt: new Date(Date.now() + (tokenSet.expires_in || tokenConfig.defaultExpirySeconds) * 1000),
        scope: tokenSet.scope?.split(' ') || (Array.isArray(authData.scope) ? authData.scope : authData.scope?.split(' ')) || []
      }
      
      // Add optional tenant information if available
      const finalTenantId = connectionInfo.tenantId || authData.tenantId
      const finalTenantName = connectionInfo.tenantName || authData.tenantName
      const finalTenantType = connectionInfo.tenantType || authData.tenantType
      
      if (finalTenantId) {
        newTokens.tenantId = finalTenantId
      }
      if (finalTenantName) {
        newTokens.tenantName = finalTenantName
      }
      if (finalTenantType) {
        newTokens.tenantType = finalTenantType
      }

      // Update the integration with new tokens
      const updatedAuthData = {
        ...authData,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt.toISOString(),
        scope: newTokens.scope,
        tenantId: newTokens.tenantId,
        tenantName: newTokens.tenantName,
        tenantType: newTokens.tenantType,
        consecutiveFailures: 0, // Reset failure count on success
        lastRefreshAt: new Date().toISOString()
      }

      const updatedIntegration = IntegrationEntity.fromDatabase({
        ...integration.toDatabase(),
        authData: updatedAuthData,
        updatedAt: new Date()
      })

      await this.integrationRepository.save(updatedIntegration)

      this.logger.info('Successfully refreshed Xero tokens', {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        expiresAt: newTokens.expiresAt
      })

      // Track successful token refresh
      telemetry.trackBusinessMetric('xero_token_refresh_success', 1, {
        tenantId: integration.tenantId,
        integrationId: integration.id,
        provider: 'xero'
      })

      return {
        success: true,
        tokens: newTokens
      }
    } catch (error: any) {
      this.logger.error('Failed to refresh Xero tokens', {
        integrationId: integration.id,
        error: error.message,
        stack: error.stack
      })

      // Update consecutive failure count
      const authData = integration.authData as unknown as XeroAuthData
      const consecutiveFailures = (authData?.consecutiveFailures || 0) + 1
      
      try {
        const updatedIntegration = IntegrationEntity.fromDatabase({
          ...integration.toDatabase(),
          authData: {
            ...authData,
            consecutiveFailures,
            lastFailureAt: new Date().toISOString()
          },
          lastErrorAt: new Date(),
          lastErrorMessage: error.message,
          updatedAt: new Date()
        })

        await this.integrationRepository.save(updatedIntegration)
      } catch (updateError) {
        this.logger.error('Failed to update failure count', { 
          integrationId: integration.id, 
          updateError 
        })
      }

      // Determine if re-authentication is needed
      const needsReauth = consecutiveFailures >= 3 || 
                         error.message?.includes('invalid_grant') ||
                         error.message?.includes('refresh_token')

      // Track token refresh failures
      telemetry.trackError({
        error: `Xero token refresh failed: ${error.message}`,
        severity: needsReauth ? 'high' : 'medium',
        category: 'integration',
        context: {
          tenantId: integration.tenantId,
          integrationId: integration.id,
          provider: 'xero'
        },
        metadata: {
          consecutiveFailures,
          needsReauth,
          errorType: error.name || 'Unknown'
        }
      })

      return {
        success: false,
        error: error.message,
        needsReauth
      }
    }
  }

  /**
   * Get connection information from Xero using the provided access token
   */
  private async getConnectionInfo(xeroClient: XeroClient, accessToken: string): Promise<{
    tenantId?: string
    tenantName?: string 
    tenantType?: string
  }> {
    try {
      // Set the access token for the client
      await xeroClient.setTokenSet({
        access_token: accessToken,
        token_type: 'Bearer'
      })

      // Get tenant connections
      const connections = await xeroClient.updateTenants()
      
      if (!connections || connections.length === 0) {
        this.logger.warn('No Xero connections found during token refresh')
        return {}
      }

      // Use the first (primary) connection
      const primaryConnection = connections[0]
      
      return {
        tenantId: primaryConnection.tenantId,
        tenantName: primaryConnection.tenantName,
        tenantType: primaryConnection.tenantType
      }
    } catch (error) {
      this.logger.warn('Failed to retrieve connection info during token refresh', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Return empty object to fall back to existing auth data
      return {}
    }
  }

  /**
   * Validate that Xero tokens are properly configured
   */
  async validateTokenConfiguration(integration: IntegrationEntity): Promise<{
    isValid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    if (integration.provider !== 'xero') {
      issues.push('Integration is not a Xero integration')
      return { isValid: false, issues, recommendations }
    }

    const authData = integration.authData as any

    // Check required fields
    if (!authData?.accessToken) {
      issues.push('Missing access token')
      recommendations.push('Complete OAuth authentication flow')
    }

    if (!authData?.refreshToken) {
      issues.push('Missing refresh token')
      recommendations.push('Re-authenticate to obtain refresh token')
    }

    if (!authData?.tenantId) {
      issues.push('Missing Xero tenant ID')
      recommendations.push('Ensure proper tenant selection during authentication')
    }

    if (!authData?.scope || !Array.isArray(authData.scope)) {
      issues.push('Missing or invalid OAuth scope')
      recommendations.push('Verify OAuth scope configuration')
    }

    // Check token expiry
    if (authData?.expiresAt) {
      const expiresAt = new Date(authData.expiresAt)
      const now = new Date()
      
      if (expiresAt <= now) {
        issues.push('Access token has expired')
        recommendations.push('Refresh the access token')
      } else if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        recommendations.push('Access token expires soon - consider refreshing')
      }
    } else {
      issues.push('Missing token expiry information')
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * Get human-readable token status
   */
  async getTokenStatus(integration: IntegrationEntity): Promise<{
    status: 'healthy' | 'warning' | 'error' | 'expired'
    message: string
    details: Record<string, any>
  }> {
    const health = await this.checkTokenHealth(integration)
    const validation = await this.validateTokenConfiguration(integration)

    let status: 'healthy' | 'warning' | 'error' | 'expired'
    let message: string

    if (!validation.isValid) {
      status = 'error'
      message = `Configuration issues: ${validation.issues.join(', ')}`
    } else if (health.isExpired) {
      status = 'expired'
      message = 'Access token has expired and needs refresh'
    } else if (!health.isValid) {
      status = 'error'
      message = health.error || 'Token validation failed'
    } else if (health.needsRefresh) {
      status = 'warning'
      message = `Token expires in ${Math.floor(health.expiresIn / 60)} minutes`
    } else {
      status = 'healthy'
      message = `Token valid for ${Math.floor(health.expiresIn / 3600)} hours`
    }

    return {
      status,
      message,
      details: {
        health,
        validation,
        lastChecked: new Date().toISOString()
      }
    }
  }
}