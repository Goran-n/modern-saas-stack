import { BaseError } from './base.error'

export class ApplicationError extends BaseError {
  readonly isOperational = true

  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context)
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    super('AUTHENTICATION_REQUIRED', 401, message, context)
  }
}

export class AuthorisationError extends ApplicationError {
  constructor(
    message: string = 'Insufficient permissions',
    context?: Record<string, unknown>
  ) {
    super('INSUFFICIENT_PERMISSIONS', 403, message, context)
  }
}

export class RateLimitError extends ApplicationError {
  constructor(
    message: string = 'Rate limit exceeded',
    context?: Record<string, unknown>
  ) {
    super('RATE_LIMIT_EXCEEDED', 429, message, context)
  }
}

export class ConfigurationError extends BaseError {
  readonly isOperational = false
  readonly statusCode = 500
  readonly code = 'CONFIGURATION_ERROR'

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context)
  }
}