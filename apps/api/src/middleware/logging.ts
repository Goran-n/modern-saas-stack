import type { Context, Next } from 'hono'
import { requestLogger } from '../config/logger'

export interface RequestLogData {
  requestId: string
  method: string
  url: string
  userAgent?: string
  ip?: string
  userId?: string
  tenantId?: string
  duration?: number
  status?: number
  contentLength?: number
  error?: string
}

/**
 * Custom request logging middleware using Pino
 * Logs incoming requests, completed requests, and errors with structured data
 */
export async function requestLoggingMiddleware(c: Context, next: Next) {
  const startTime = Date.now()
  const requestId = c.get('requestId') || crypto.randomUUID()
  
  // Log incoming request
  const logData: RequestLogData = {
    requestId,
    method: c.req.method,
    url: c.req.url,
  }
  
  const userAgent = c.req.header('user-agent')
  if (userAgent) {
    logData.userAgent = userAgent
  }
  
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
  if (ip) {
    logData.ip = ip
  }

  // Add user context if available (set by auth middleware)
  const user = c.get('user')
  if (user?.id) {
    logData.userId = user.id
  }

  // Add tenant context if available (set by tenant middleware)
  const tenantContext = c.get('tenantContext')
  if (tenantContext?.tenantId) {
    logData.tenantId = tenantContext.tenantId
  }

  requestLogger.debug({
    method: logData.method,
    url: logData.url,
    requestId: logData.requestId,
  }, `→ ${logData.method} ${logData.url}`)

  try {
    // Process request
    await next()
    
    // Log successful completion
    const duration = Date.now() - startTime

    if (c.res.status >= 400) {
      requestLogger.warn({
        method: logData.method,
        url: logData.url,
        status: c.res.status,
        duration,
        requestId: logData.requestId,
      }, `✗ ${logData.method} ${logData.url} - ${c.res.status} (${duration}ms)`)
    } else {
      requestLogger.info({
        method: logData.method,
        url: logData.url,
        status: c.res.status,
        duration,
        requestId: logData.requestId,
      }, `✓ ${logData.method} ${logData.url} - ${c.res.status} (${duration}ms)`)
    }
  } catch (error) {
    // Log error
    const duration = Date.now() - startTime
    const errorData: RequestLogData = {
      ...logData,
      duration,
      status: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    requestLogger.error({
      method: logData.method,
      url: logData.url,
      duration,
      requestId: logData.requestId,
      error: errorData.error,
    }, `✗ ${logData.method} ${logData.url} - ERROR (${duration}ms): ${errorData.error}`)

    // Re-throw the error
    throw error
  }
}

/**
 * Simplified request logger for health checks and internal endpoints
 */
export async function simpleRequestLoggingMiddleware(c: Context, next: Next) {
  const startTime = Date.now()
  
  try {
    await next()
    const duration = Date.now() - startTime
    
    // Only log if it's not a health check or if there's an error
    if (!c.req.url.includes('/health') || c.res.status >= 400) {
      requestLogger.debug({
        method: c.req.method,
        url: c.req.url,
        status: c.res.status,
        duration,
        requestId: c.get('requestId'),
      }, `${c.req.method} ${c.req.url} - ${c.res.status} (${duration}ms)`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    requestLogger.error({
      method: c.req.method,
      url: c.req.url,
      duration,
      requestId: c.get('requestId'),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, `${c.req.method} ${c.req.url} - ERROR (${duration}ms)`)
    throw error
  }
}