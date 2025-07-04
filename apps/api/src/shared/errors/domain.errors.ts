import { BaseError } from './base.error'

export class DomainError extends BaseError {
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

export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>
  ) {
    super('VALIDATION_ERROR', 400, message, { field, ...context })
  }
}

export class NotFoundError extends DomainError {
  constructor(
    resource: string,
    identifier?: string,
    context?: Record<string, unknown>
  ) {
    super(
      'RESOURCE_NOT_FOUND',
      404,
      `${resource} not found${identifier ? `: ${identifier}` : ''}`,
      { resource, identifier, ...context }
    )
  }
}

export class ConflictError extends DomainError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super('RESOURCE_CONFLICT', 409, message, context)
  }
}

export class BusinessRuleError extends DomainError {
  constructor(
    rule: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super('BUSINESS_RULE_VIOLATION', 422, message, { rule, ...context })
  }
}