import { BaseError } from './base.error'

export class InfrastructureError extends BaseError {
  readonly isOperational = true
  readonly statusCode = 500

  constructor(
    public readonly code: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context)
  }
}

export class DatabaseError extends InfrastructureError {
  constructor(
    message: string,
    public readonly operation?: string,
    context?: Record<string, unknown>
  ) {
    super('DATABASE_ERROR', message, { operation, ...context })
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(
    message: string = 'Database connection failed',
    context?: Record<string, unknown>
  ) {
    super(message, 'connection', context)
  }
}

export class ExternalServiceError extends BaseError {
  readonly isOperational = true
  readonly code = 'EXTERNAL_SERVICE_ERROR'

  constructor(
    public readonly service: string,
    message: string,
    public readonly statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message, { service, statusCode, ...context })
  }
}

export class IntegrationError extends ExternalServiceError {
  constructor(
    provider: string,
    message: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(provider, message, statusCode, { provider, ...context })
  }
}