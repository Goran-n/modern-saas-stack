import type { Context } from 'hono'
import { ZodError } from 'zod'
import { TRPCError } from '@trpc/server'
import { BaseError } from './base.error'
import log from '../../config/logger'

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
    requestId?: string
    timestamp: string
  }
}

export function handleError(error: unknown, context?: Context): ErrorResponse {
  const requestId = context?.get('requestId')
  const timestamp = new Date().toISOString()

  // Log error
  logError(error, requestId)

  // Handle known error types
  if (error instanceof BaseError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.context,
        ...(requestId && { requestId }),
        timestamp,
      },
    }
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        ...(requestId && { requestId }),
        timestamp,
      },
    }
  }

  // Handle tRPC errors
  if (error instanceof TRPCError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.cause,
        ...(requestId && { requestId }),
        timestamp,
      },
    }
  }

  // Handle unexpected errors
  const errorResponse: {
    code: string
    message: string
    details?: unknown
    requestId?: string
    timestamp: string
  } = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    timestamp,
  }
  
  if (requestId) {
    errorResponse.requestId = requestId
  }
  
  return {
    error: errorResponse,
  }
}

export function getStatusCodeFromError(error: unknown): number {
  if (error instanceof BaseError) {
    return error.statusCode
  }

  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof TRPCError) {
    switch (error.code) {
      case 'BAD_REQUEST':
        return 400
      case 'UNAUTHORIZED':
        return 401
      case 'FORBIDDEN':
        return 403
      case 'NOT_FOUND':
        return 404
      case 'CONFLICT':
        return 409
      case 'PRECONDITION_FAILED':
        return 412
      case 'PAYLOAD_TOO_LARGE':
        return 413
      case 'UNPROCESSABLE_CONTENT':
        return 422
      case 'TOO_MANY_REQUESTS':
        return 429
      case 'CLIENT_CLOSED_REQUEST':
        return 499
      case 'INTERNAL_SERVER_ERROR':
      default:
        return 500
    }
  }

  return 500
}

function logError(error: unknown, requestId?: string): void {
  const errorContext = { requestId }

  if (error instanceof BaseError) {
    const logLevel = error.isOperational ? 'warn' : 'error'
    log[logLevel]({
      event: 'application_error',
      code: error.code,
      message: error.message,
      context: error.context,
      stack: error.stack,
      ...errorContext,
    }, `${error.constructor.name}: ${error.message}`)
    return
  }

  if (error instanceof ZodError) {
    log.warn({
      event: 'validation_error',
      errors: error.errors,
      ...errorContext,
    }, 'Validation failed')
    return
  }

  if (error instanceof TRPCError) {
    log.warn({
      event: 'trpc_error',
      code: error.code,
      message: error.message,
      cause: error.cause,
      ...errorContext,
    }, `tRPC error: ${error.message}`)
    return
  }

  // Log unexpected errors as critical
  log.error({
    event: 'unexpected_error',
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    error: error,
    ...errorContext,
  }, 'Unexpected error occurred')
}

export function isOperationalError(error: unknown): boolean {
  return error instanceof BaseError && error.isOperational
}