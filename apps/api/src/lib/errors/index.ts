// Base error
export { BaseError } from './base.error'

// Authentication & Authorization errors
export {
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  InsufficientPermissionsError,
  TenantAccessDeniedError
} from './auth.errors'

// Business logic errors
export {
  ResourceNotFoundError,
  DuplicateResourceError,
  InvalidOperationError,
  BusinessRuleViolationError,
  ExternalServiceError,
  RateLimitExceededError
} from './business.errors'

// Validation errors
export {
  ValidationError,
  InvalidInputError,
  RequiredFieldError,
  InvalidFormatError,
  type ValidationErrorDetail
} from './validation.errors'

// Integration specific errors
export {
  IntegrationNotFoundError,
  IntegrationNotActiveError,
  ProviderNotSupportedError,
  OAuthError,
  OAuthStateValidationError,
  ProviderConnectionError,
  SyncError,
  TokenRefreshError
} from './integration.errors'

// Import BaseError for type guards
import { BaseError } from './base.error'
import { AuthenticationError, InvalidCredentialsError, TokenExpiredError, InvalidTokenError, InsufficientPermissionsError, TenantAccessDeniedError } from './auth.errors'
import { ValidationError } from './validation.errors'

// Error type guards
export function isOperationalError(error: unknown): error is BaseError {
  return error instanceof BaseError && error.isOperational
}

export function isAuthError(error: unknown): boolean {
  return error instanceof AuthenticationError ||
    error instanceof InvalidCredentialsError ||
    error instanceof TokenExpiredError ||
    error instanceof InvalidTokenError ||
    error instanceof InsufficientPermissionsError ||
    error instanceof TenantAccessDeniedError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

// Error handler utility
export function handleError(error: unknown): {
  code: string
  message: string
  statusCode: number
  details?: Record<string, unknown>
} {
  if (error instanceof BaseError) {
    const result: {
      code: string
      message: string
      statusCode: number
      details?: Record<string, unknown>
    } = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode
    }
    
    if (error.context) {
      result.details = error.context
    }
    
    return result
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as any
    const errors = zodError.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
      constraint: issue.code
    }))
    
    const validationError = new ValidationError(errors)
    return {
      code: validationError.code,
      message: validationError.message,
      statusCode: validationError.statusCode,
      details: { errors }
    }
  }

  // Default error response
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    statusCode: 500
  }
}