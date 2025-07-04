import { BaseError } from './base.error'

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_REQUIRED', 401, true, context)
  }
}

export class InvalidCredentialsError extends BaseError {
  constructor(message: string = 'Invalid credentials provided') {
    super(message, 'INVALID_CREDENTIALS', 401, true)
  }
}

export class TokenExpiredError extends BaseError {
  constructor(message: string = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401, true)
  }
}

export class InvalidTokenError extends BaseError {
  constructor(message: string = 'Invalid token provided') {
    super(message, 'INVALID_TOKEN', 401, true)
  }
}

export class InsufficientPermissionsError extends BaseError {
  constructor(
    resource: string,
    action: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Insufficient permissions to ${action} ${resource}`,
      'INSUFFICIENT_PERMISSIONS',
      403,
      true,
      { resource, action, ...context }
    )
  }
}

export class TenantAccessDeniedError extends BaseError {
  constructor(tenantId: string, userId: string) {
    super(
      'Access denied to tenant',
      'TENANT_ACCESS_DENIED',
      403,
      true,
      { tenantId, userId }
    )
  }
}