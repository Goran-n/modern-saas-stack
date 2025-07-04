import { BaseError } from '../../shared/errors/base.error'

/**
 * Base class for all sync-related errors
 */
export abstract class SyncError extends BaseError {
  readonly code: string
  readonly statusCode: number
  readonly isOperational: boolean

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message, context)
    this.name = 'SyncError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
  }
}

/**
 * Error thrown when authentication is required or tokens are invalid
 */
export class AuthenticationRequiredError extends SyncError {
  constructor(
    provider: string,
    integrationId: string,
    reason: string = 'Authentication tokens are invalid or expired'
  ) {
    super(
      `${provider} authentication required: ${reason}`,
      'AUTH_REQUIRED',
      401,
      true,
      { provider, integrationId, reason }
    )
    this.name = 'AuthenticationRequiredError'
  }
}

/**
 * Error thrown when token refresh fails
 */
export class TokenRefreshError extends SyncError {
  constructor(
    provider: string,
    integrationId: string,
    attemptNumber: number,
    originalError?: Error
  ) {
    super(
      `Failed to refresh ${provider} tokens (attempt ${attemptNumber})`,
      'TOKEN_REFRESH_FAILED',
      401,
      true,
      { 
        provider, 
        integrationId, 
        attemptNumber,
        originalError: originalError?.message 
      }
    )
    this.name = 'TokenRefreshError'
  }
}

/**
 * Error thrown when API rate limits are exceeded
 */
export class RateLimitError extends SyncError {
  public readonly retryAfter: number
  
  constructor(
    provider: string,
    retryAfter: number,
    limit?: string,
    remaining?: string
  ) {
    super(
      `${provider} API rate limit exceeded. Retry after ${retryAfter} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429,
      true,
      { provider, retryAfter, limit, remaining }
    )
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Error thrown when provider API returns an error
 */
export class ProviderApiError extends SyncError {
  constructor(
    provider: string,
    operation: string,
    apiErrorCode?: string,
    apiErrorMessage?: string,
    statusCode: number = 500
  ) {
    super(
      `${provider} API error during ${operation}: ${apiErrorMessage || 'Unknown error'}`,
      'PROVIDER_API_ERROR',
      statusCode,
      true,
      { provider, operation, apiErrorCode, apiErrorMessage }
    )
    this.name = 'ProviderApiError'
  }
}

/**
 * Error thrown when data validation fails
 */
export class DataValidationError extends SyncError {
  constructor(
    entity: string,
    field: string,
    value: unknown,
    reason: string
  ) {
    super(
      `Invalid ${entity} data: ${field} ${reason}`,
      'DATA_VALIDATION_ERROR',
      400,
      true,
      { entity, field, value, reason }
    )
    this.name = 'DataValidationError'
  }
}

/**
 * Error thrown when sync job fails
 */
export class SyncJobError extends SyncError {
  constructor(
    jobId: string,
    jobType: string,
    reason: string,
    isRetryable: boolean = false
  ) {
    super(
      `Sync job ${jobId} failed: ${reason}`,
      'SYNC_JOB_FAILED',
      500,
      true,
      { jobId, jobType, reason, isRetryable }
    )
    this.name = 'SyncJobError'
  }
}

/**
 * Error thrown when entity linking fails
 */
export class EntityLinkingError extends SyncError {
  constructor(
    sourceEntity: string,
    targetEntity: string,
    sourceId: string,
    reason: string
  ) {
    super(
      `Failed to link ${sourceEntity} to ${targetEntity}: ${reason}`,
      'ENTITY_LINKING_FAILED',
      422,
      true,
      { sourceEntity, targetEntity, sourceId, reason }
    )
    this.name = 'EntityLinkingError'
  }
}

/**
 * Error thrown when duplicate detection fails
 */
export class DuplicateDetectionError extends SyncError {
  constructor(
    entity: string,
    criteria: Record<string, unknown>,
    matchCount: number
  ) {
    super(
      `Multiple ${entity} matches found for duplicate detection`,
      'DUPLICATE_DETECTION_AMBIGUOUS',
      409,
      true,
      { entity, criteria, matchCount }
    )
    this.name = 'DuplicateDetectionError'
  }
}

/**
 * Generic sync error for unknown errors
 */
export class GenericSyncError extends SyncError {
  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, isOperational, context)
    this.name = 'GenericSyncError'
  }
}

/**
 * Helper to determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof RateLimitError) return true
  if (error instanceof TokenRefreshError) return true
  if (error instanceof ProviderApiError) {
    // Retry on 5xx errors and specific 4xx errors
    const retryableStatusCodes = [500, 502, 503, 504, 408, 429]
    return retryableStatusCodes.includes(error.statusCode)
  }
  if (error instanceof SyncJobError) {
    return (error.context as any)?.isRetryable === true
  }
  return false
}

/**
 * Helper to get retry delay based on error type
 */
export function getRetryDelay(error: Error, attemptNumber: number): number {
  if (error instanceof RateLimitError) {
    return error.retryAfter * 1000 // Convert to milliseconds
  }
  
  // Exponential backoff with jitter
  const baseDelay = 1000 // 1 second
  const maxDelay = 60000 // 60 seconds
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay)
  const jitter = Math.random() * 0.3 * exponentialDelay // 30% jitter
  
  return Math.floor(exponentialDelay + jitter)
}

/**
 * Type guard for sync errors
 */
export function isSyncError(error: unknown): error is SyncError {
  return error instanceof SyncError
}

/**
 * Convert any error to a standardized sync error
 */
export function toSyncError(error: unknown, context?: { provider?: string; operation?: string }): SyncError {
  if (isSyncError(error)) {
    return error
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Check for authentication errors
    if (message.includes('auth') || message.includes('token') || message.includes('401')) {
      return new AuthenticationRequiredError(
        context?.provider || 'unknown',
        'unknown',
        error.message
      )
    }
    
    // Check for rate limit errors
    if (message.includes('rate limit') || message.includes('429')) {
      return new RateLimitError(
        context?.provider || 'unknown',
        60 // Default retry after 60 seconds
      )
    }
    
    // Default to provider API error
    return new ProviderApiError(
      context?.provider || 'unknown',
      context?.operation || 'unknown',
      undefined,
      error.message
    )
  }
  
  // Unknown error
  return new GenericSyncError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    false,
    { originalError: String(error) }
  )
}