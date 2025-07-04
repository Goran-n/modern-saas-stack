import { BaseError } from './base.error'

export class IntegrationNotFoundError extends BaseError {
  constructor(integrationId: string) {
    super(
      'Integration not found',
      'INTEGRATION_NOT_FOUND',
      404,
      true,
      { integrationId }
    )
  }
}

export class IntegrationNotActiveError extends BaseError {
  constructor(integrationId: string, status: string) {
    super(
      'Integration is not active',
      'INTEGRATION_NOT_ACTIVE',
      400,
      true,
      { integrationId, status }
    )
  }
}

export class ProviderNotSupportedError extends BaseError {
  constructor(provider: string) {
    super(
      `Provider '${provider}' is not supported`,
      'PROVIDER_NOT_SUPPORTED',
      400,
      true,
      { provider }
    )
  }
}

export class OAuthError extends BaseError {
  constructor(
    message: string,
    provider: string,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      'OAUTH_ERROR',
      400,
      true,
      { provider, ...details }
    )
  }
}

export class OAuthStateValidationError extends BaseError {
  constructor(message: string = 'Invalid OAuth state parameter') {
    super(message, 'OAUTH_STATE_INVALID', 400, true)
  }
}

export class ProviderConnectionError extends BaseError {
  constructor(
    provider: string,
    message: string,
    originalError?: Error
  ) {
    super(
      `Provider connection failed (${provider}): ${message}`,
      'PROVIDER_CONNECTION_ERROR',
      502,
      true,
      { provider, originalError: originalError?.message }
    )
  }
}

export class SyncError extends BaseError {
  constructor(
    integrationId: string,
    syncType: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      'SYNC_ERROR',
      500,
      true,
      { integrationId, syncType, ...details }
    )
  }
}

export class TokenRefreshError extends BaseError {
  constructor(
    integrationId: string,
    provider: string,
    originalError?: Error
  ) {
    super(
      'Failed to refresh access token',
      'TOKEN_REFRESH_ERROR',
      401,
      true,
      { integrationId, provider, originalError: originalError?.message }
    )
  }
}