/**
 * Xero-specific type definitions
 * Used across multiple Xero integration services
 */

export interface XeroAuthData {
  accessToken: string
  refreshToken: string
  expiresAt: string | Date
  scope: string | string[]
  tenantId: string
  tenantName?: string
  tenantType?: string
  consecutiveFailures?: number
  lastRefreshAt?: string | Date
}

export interface XeroTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope: string[]
  tenantId?: string
  tenantName?: string
  tenantType?: string
}

export interface XeroTokenHealthCheck {
  isValid: boolean
  isExpired: boolean
  expiresIn: number // seconds until expiry
  needsRefresh: boolean
  consecutiveFailures: number
  lastChecked: Date
  error?: string
}

export interface XeroTokenRefreshResult {
  success: boolean
  tokens?: XeroTokens
  error?: string
  needsReauth?: boolean
}

export interface XeroConnectionInfo {
  tenantId: string
  tenantName: string
  tenantType: 'COMPANY' | 'PARTNER'
  authEventId?: string
  updatedDateUtc?: string
}

export interface XeroApiCallOptions {
  retries?: number
  timeout?: number
  rateLimit?: {
    maxRequestsPerSecond: number
    maxRequestsPerMinute: number
  }
}