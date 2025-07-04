import logger from '@vepler/logger'
import { RequestContextManager } from '../context/request-context'
import { BaseError } from '../../shared/errors/base.error'
import { ApplicationError } from '../../shared/errors/application.errors'
import { 
  toSyncError,
  isRetryableError,
  getRetryDelay 
} from './sync-errors'

export interface ErrorContext {
  requestId?: string
  tenantId?: string
  integrationId?: string
  operation?: string
  provider?: string
  [key: string]: unknown
}

export interface ErrorHandlerOptions {
  logErrors?: boolean
  includeStackTrace?: boolean
  maxRetries?: number
}

/**
 * Centralized error handler for the sync system
 */
export class ErrorHandler {
  private readonly options: Required<ErrorHandlerOptions>

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      logErrors: options.logErrors ?? true,
      includeStackTrace: options.includeStackTrace ?? process.env.NODE_ENV !== 'production',
      maxRetries: options.maxRetries ?? 3
    }
  }

  /**
   * Handle an error with proper logging and context
   */
  handle(error: unknown, additionalContext?: ErrorContext): BaseError {
    const context = this.buildErrorContext(additionalContext)
    const standardError = this.standardizeError(error, context)
    
    if (this.options.logErrors) {
      this.logError(standardError, context)
    }
    
    return standardError
  }

  /**
   * Handle an error and determine if it should be retried
   */
  handleWithRetry(
    error: unknown,
    attemptNumber: number,
    additionalContext?: ErrorContext
  ): { error: BaseError; shouldRetry: boolean; retryDelay?: number } {
    const standardError = this.handle(error, additionalContext)
    
    if (attemptNumber >= this.options.maxRetries) {
      return { error: standardError, shouldRetry: false }
    }
    
    const shouldRetry = isRetryableError(standardError)
    const retryDelay = shouldRetry ? getRetryDelay(standardError, attemptNumber) : undefined
    
    if (shouldRetry) {
      logger.info('Error is retryable', {
        error: standardError.message,
        attemptNumber,
        maxRetries: this.options.maxRetries,
        retryDelay
      })
    }
    
    const result: { error: BaseError; shouldRetry: boolean; retryDelay?: number } = { 
      error: standardError, 
      shouldRetry 
    }
    
    if (retryDelay !== undefined) {
      result.retryDelay = retryDelay
    }
    
    return result
  }

  /**
   * Build error context from request context and additional context
   */
  private buildErrorContext(additionalContext?: ErrorContext): ErrorContext {
    const requestContext = RequestContextManager.get()
    
    const errorContext: ErrorContext = {}
    
    // Only add properties if they exist
    if (requestContext?.requestId) {
      errorContext.requestId = requestContext.requestId
    }
    if (requestContext?.tenantId) {
      errorContext.tenantId = requestContext.tenantId
    }
    if (requestContext?.integrationId) {
      errorContext.integrationId = requestContext.integrationId
    }
    
    // Merge with additional context, ensuring we don't add undefined values
    if (additionalContext) {
      Object.entries(additionalContext).forEach(([key, value]) => {
        if (value !== undefined) {
          (errorContext as any)[key] = value
        }
      })
    }
    
    return errorContext
  }

  /**
   * Standardize any error to a BaseError
   */
  private standardizeError(error: unknown, context: ErrorContext): BaseError {
    if (error instanceof BaseError) {
      // Already a base error, just add context if needed
      if (context && Object.keys(context).length > 0) {
        // Create a new error with merged context since context is readonly
        const updatedContext = { ...error.context, ...context }
        return new ApplicationError(error.code, error.statusCode, error.message, updatedContext)
      }
      return error
    }
    
    // Convert to sync error if it's sync-related
    if (context.provider || context.operation) {
      const syncContext: any = {}
      if (context.provider) {
        syncContext.provider = context.provider
      }
      if (context.operation) {
        syncContext.operation = context.operation
      }
      return toSyncError(error, syncContext)
    }
    
    // Generic error conversion
    if (error instanceof Error) {
      const baseError = new ApplicationError('GENERIC_ERROR', 500, error.message, context)
      if (error.stack) {
        (baseError as any).stack = error.stack
      }
      return baseError
    }
    
    // Unknown error
    return new ApplicationError('UNKNOWN_ERROR', 500, String(error), context)
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(error: BaseError, context: ErrorContext): void {
    const logData: any = {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context,
      requestContext: context
    }
    
    if (this.options.includeStackTrace && error.stack) {
      logData.stack = error.stack
    }
    
    // Choose log level based on error type
    if (!error.isOperational) {
      logger.error('Non-operational error occurred', logData)
    } else if (error.statusCode >= 500) {
      logger.error('Server error occurred', logData)
    } else if (error.statusCode >= 400) {
      logger.warn('Client error occurred', logData)
    } else {
      logger.info('Error occurred', logData)
    }
  }

  /**
   * Create a wrapped function that handles errors
   */
  wrap<T extends (...args: any[]) => any>(
    fn: T,
    context?: ErrorContext
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        const result = await fn(...args)
        return result
      } catch (error) {
        throw this.handle(error, context)
      }
    }
  }

  /**
   * Create a wrapped function with retry logic
   */
  wrapWithRetry<T extends (...args: any[]) => any>(
    fn: T,
    context?: ErrorContext
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let lastError: BaseError | undefined
      
      for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
        try {
          const result = await fn(...args)
          return result
        } catch (error) {
          const { error: standardError, shouldRetry, retryDelay } = this.handleWithRetry(
            error,
            attempt,
            context
          )
          
          lastError = standardError
          
          if (!shouldRetry || attempt === this.options.maxRetries) {
            throw standardError
          }
          
          if (retryDelay) {
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }
      }
      
      throw lastError || new ApplicationError('MAX_RETRIES_EXCEEDED', 500, 'Max retries exceeded')
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler()

// Export convenience functions
export const handleError = errorHandler.handle.bind(errorHandler)
export const handleErrorWithRetry = errorHandler.handleWithRetry.bind(errorHandler)
export const wrapWithErrorHandling = errorHandler.wrap.bind(errorHandler)
export const wrapWithRetry = errorHandler.wrapWithRetry.bind(errorHandler)