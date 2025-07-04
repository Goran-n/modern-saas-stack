import { BaseError } from './base.error'

export class ResourceNotFoundError extends BaseError {
  constructor(
    resource: string,
    identifier: string | Record<string, unknown>
  ) {
    const id = typeof identifier === 'string' ? identifier : JSON.stringify(identifier)
    super(
      `${resource} not found: ${id}`,
      'RESOURCE_NOT_FOUND',
      404,
      true,
      { resource, identifier }
    )
  }
}

export class DuplicateResourceError extends BaseError {
  constructor(
    resource: string,
    field: string,
    value: string
  ) {
    super(
      `${resource} with ${field} '${value}' already exists`,
      'DUPLICATE_RESOURCE',
      409,
      true,
      { resource, field, value }
    )
  }
}

export class InvalidOperationError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'INVALID_OPERATION', 400, true, context)
  }
}

export class BusinessRuleViolationError extends BaseError {
  constructor(
    rule: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, true, { rule, ...context })
  }
}

export class ExternalServiceError extends BaseError {
  constructor(
    service: string,
    message: string,
    originalError?: Error
  ) {
    super(
      `External service error (${service}): ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      true,
      { service, originalError: originalError?.message }
    )
  }
}

export class RateLimitExceededError extends BaseError {
  constructor(
    limit: number,
    window: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      true,
      { limit, window, ...context }
    )
  }
}