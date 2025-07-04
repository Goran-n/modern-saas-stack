import type { Context } from 'hono'
import { handleError, isOperationalError, BaseError } from '../lib/errors'
import log from '../config/logger'

export function errorHandler(err: Error, c: Context) {
  const requestId = c.get('requestId')
  const userId = c.get('user')?.id
  const tenantId = c.get('tenantContext')?.tenantId

  // Log error with context
  const errorContext = {
    requestId,
    userId,
    tenantId,
    path: c.req.path,
    method: c.req.method,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err instanceof BaseError && { code: err.code, context: err.context })
    }
  }

  // Log based on error type
  if (isOperationalError(err)) {
    log.warn(errorContext, 'Operational error occurred')
  } else {
    log.error(errorContext, 'Unexpected error occurred')
  }

  // Convert to response
  const errorResponse = handleError(err)

  return c.json(
    {
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        ...(process.env.NODE_ENV === 'development' && { details: errorResponse.details }),
        requestId
      }
    },
    errorResponse.statusCode as any
  )
}

// tRPC error formatter that uses our custom errors
export function trpcErrorFormatter({ shape, error }: any) {
  let code = 'INTERNAL_SERVER_ERROR'
  let statusCode = 500
  let details: Record<string, unknown> | undefined

  // Handle our custom errors
  if (error.cause instanceof BaseError) {
    const customError = error.cause
    code = customError.code
    statusCode = customError.statusCode
    details = customError.context

    // Map to tRPC error codes
    if (statusCode === 400) error.code = 'BAD_REQUEST'
    else if (statusCode === 401) error.code = 'UNAUTHORIZED'
    else if (statusCode === 403) error.code = 'FORBIDDEN'
    else if (statusCode === 404) error.code = 'NOT_FOUND'
    else if (statusCode === 409) error.code = 'CONFLICT'
    else if (statusCode === 429) error.code = 'TOO_MANY_REQUESTS'
    else if (statusCode >= 500) error.code = 'INTERNAL_SERVER_ERROR'
  }

  return {
    ...shape,
    data: {
      ...shape.data,
      code,
      details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
}