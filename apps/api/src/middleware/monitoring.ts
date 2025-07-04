/**
 * Monitoring middleware for API requests
 * Tracks performance, errors, and usage patterns
 */

import type { Context, Next } from 'hono'
import { telemetry } from '../shared/monitoring/telemetry'
import logger from '../config/logger'

export interface MonitoringOptions {
  trackPerformance?: boolean
  trackErrors?: boolean
  trackResourceUsage?: boolean
  excludePaths?: string[]
}

/**
 * Monitoring middleware that tracks API performance and errors
 */
export function monitoring(options: MonitoringOptions = {}) {
  const {
    trackPerformance = true,
    trackErrors = true,
    trackResourceUsage = false,
    excludePaths = ['/health', '/metrics']
  } = options

  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const method = c.req.method
    const path = c.req.path
    const userAgent = c.req.header('user-agent')
    const requestId = c.req.header('x-request-id') || crypto.randomUUID()
    const tenantId = c.req.header('x-tenant-id')
    const userId = c.req.header('x-user-id')

    // Skip monitoring for excluded paths
    if (excludePaths.some(excludePath => path.startsWith(excludePath))) {
      return await next()
    }

    const context: any = {
      requestId,
      operation: `${method} ${path}`
    }
    
    if (tenantId) context.tenantId = tenantId
    if (userId) context.userId = userId

    try {
      // Execute the request
      await next()

      const duration = Date.now() - startTime
      const statusCode = c.res.status

      // Track performance metrics
      if (trackPerformance) {
        const perfMetrics: any = {
          operation: `${method} ${path}`,
          duration,
          success: statusCode < 400,
          context
        }
        if (statusCode >= 400) {
          perfMetrics.errorCode = statusCode.toString()
        }
        telemetry.trackPerformance(perfMetrics)
      }

      // Track business metrics
      const businessContext = {
        ...context,
        method,
        statusCode: statusCode.toString(),
        userAgent
      }
      telemetry.trackBusinessMetric('api_request_completed', 1, businessContext)

      // Log request completion
      logger.info('Request completed', {
        method,
        path,
        statusCode,
        duration,
        requestId,
        tenantId,
        userId,
        userAgent
      })

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Track error telemetry
      if (trackErrors) {
        telemetry.trackError({
          error: error instanceof Error ? error : new Error(errorMessage),
          severity: 'medium',
          category: 'api',
          context,
          metadata: {
            method,
            path,
            duration,
            userAgent
          }
        })
      }

      // Track failed request metrics
      const failureContext = {
        ...context,
        method,
        errorType: error instanceof Error ? error.name : 'Unknown',
        userAgent
      }
      telemetry.trackBusinessMetric('api_request_failed', 1, failureContext)

      // Log error
      logger.error('Request failed', {
        method,
        path,
        duration,
        requestId,
        tenantId,
        userId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userAgent
      })

      throw error
    }

    // Track resource usage periodically
    if (trackResourceUsage && Math.random() < 0.01) { // 1% sampling
      telemetry.trackResourceUsage()
    }
  }
}

/**
 * Rate limiting monitoring for specific providers
 */
export function trackProviderRateLimit(
  provider: string,
  endpoint: string,
  response: Response,
  context?: any
) {
  const rateLimitRemaining = response.headers.get('x-rate-limit-remaining')
  const rateLimitReset = response.headers.get('x-rate-limit-reset')

  if (rateLimitRemaining && rateLimitReset) {
    const remaining = parseInt(rateLimitRemaining, 10)
    const resetTime = new Date(parseInt(rateLimitReset, 10) * 1000)

    telemetry.trackRateLimit(provider, endpoint, remaining, resetTime, context)
  }
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(
  query: string,
  duration: number,
  success: boolean,
  context?: any
) {
  telemetry.trackPerformance({
    operation: `db_query_${query.split(' ')[0].toLowerCase()}`,
    duration,
    success,
    context
  })

  // Track slow queries separately
  if (duration > 1000) {
    telemetry.trackError({
      error: `Slow database query: ${query.substring(0, 100)}...`,
      severity: 'medium',
      category: 'database',
      context,
      metadata: { duration, query: query.substring(0, 200) }
    })
  }
}

/**
 * Create a monitoring decorator for service methods
 */
export function monitorServiceMethod(serviceName: string, methodName: string) {
  return function(_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const timer = telemetry.createTimer(`${serviceName}.${methodName}`)

      try {
        const result = await method.apply(this, args)
        timer.stop(true)
        return result
      } catch (error) {
        timer.stop(false, error instanceof Error ? error.name : 'UnknownError')
        
        const errorContext = {
          service: serviceName,
          method: methodName
        }
        telemetry.trackError({
          error: error instanceof Error ? error : new Error(String(error)),
          severity: 'medium',
          category: 'business',
          context: errorContext
        })
        
        throw error
      }
    }
  }
}