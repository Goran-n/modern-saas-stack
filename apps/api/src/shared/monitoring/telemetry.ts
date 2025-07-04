/**
 * Telemetry and monitoring utilities for the platform
 * Provides structured logging, metrics, and error tracking
 */

import logger from '../../config/logger'
import { getSyncConfig } from '../../config/sync.config'

export interface TelemetryContext {
  tenantId?: string
  userId?: string
  integrationId?: string
  requestId?: string
  correlationId?: string
  operation?: string
  provider?: string
  syncJobId?: string
  method?: string
  service?: string
  [key: string]: unknown
}

export interface PerformanceMetrics {
  operation: string
  duration: number
  success: boolean
  errorCode?: string
  context?: TelemetryContext
}

export interface ErrorTelemetry {
  error: Error | string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'api' | 'database' | 'integration' | 'business' | 'security'
  context?: TelemetryContext
  metadata?: Record<string, unknown>
}

export interface SyncTelemetry {
  integrationId: string
  tenantId: string
  provider: string
  operation: string
  status: 'started' | 'progress' | 'completed' | 'failed'
  metrics?: {
    recordsProcessed?: number
    recordsImported?: number
    recordsUpdated?: number
    recordsSkipped?: number
    errorCount?: number
    duration?: number
  }
  context?: TelemetryContext
}

class TelemetryService {
  private config = getSyncConfig()

  /**
   * Track performance metrics for operations
   */
  trackPerformance(metrics: PerformanceMetrics): void {
    const { operation, duration, success, errorCode, context } = metrics
    
    logger.info('Performance metric', {
      metric: 'performance',
      operation,
      duration,
      success,
      errorCode,
      isSlowOperation: duration > this.config.SLOW_QUERY_THRESHOLD_MS,
      ...context
    })

    // Alert on slow operations
    if (duration > this.config.SLOW_QUERY_THRESHOLD_MS) {
      this.trackError({
        error: `Slow operation detected: ${operation} took ${duration}ms`,
        severity: 'medium',
        category: 'api',
        ...(context && { context }),
        metadata: { duration, threshold: this.config.SLOW_QUERY_THRESHOLD_MS }
      })
    }
  }

  /**
   * Track errors with structured context
   */
  trackError(telemetry: ErrorTelemetry): void {
    const { error, severity, category, context, metadata } = telemetry
    
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('Error tracked', {
      metric: 'error',
      message: errorMessage,
      stack: errorStack,
      severity,
      category,
      ...context,
      metadata
    })

    // Critical errors should trigger additional monitoring
    if (severity === 'critical') {
      this.alertCriticalError(errorMessage, context, metadata)
    }
  }

  /**
   * Track sync operation telemetry
   */
  trackSync(telemetry: SyncTelemetry): void {
    const { integrationId, tenantId, provider, operation, status, metrics, context } = telemetry
    
    logger.info('Sync telemetry', {
      metric: 'sync',
      integrationId,
      tenantId,
      provider,
      operation,
      status,
      metrics,
      ...context
    })

    // Track sync failures with additional context
    if (status === 'failed') {
      this.trackError({
        error: `Sync operation failed: ${operation}`,
        severity: 'high',
        category: 'integration',
        context: { integrationId, tenantId, provider, ...context },
        metadata: { operation, metrics }
      })
    }
  }

  /**
   * Track API rate limits and usage
   */
  trackRateLimit(provider: string, endpoint: string, remainingRequests: number, resetTime: Date, context?: TelemetryContext): void {
    logger.info('Rate limit tracking', {
      metric: 'rate_limit',
      provider,
      endpoint,
      remainingRequests,
      resetTime,
      isNearLimit: remainingRequests < 10,
      ...context
    })

    // Alert when approaching rate limits
    if (remainingRequests < 10) {
      this.trackError({
        error: `Approaching rate limit for ${provider} ${endpoint}: ${remainingRequests} requests remaining`,
        severity: 'medium',
        category: 'api',
        ...(context && { context }),
        metadata: { provider, endpoint, remainingRequests, resetTime }
      })
    }
  }

  /**
   * Track memory usage and resource consumption
   */
  trackResourceUsage(): void {
    const memoryUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    
    logger.debug('Resource usage', {
      metric: 'resource_usage',
      memory: {
        heapUsedMB,
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      uptime: process.uptime()
    })

    // Alert on high memory usage
    if (heapUsedMB > this.config.MEMORY_USAGE_WARNING_MB) {
      this.trackError({
        error: `High memory usage detected: ${heapUsedMB}MB`,
        severity: 'medium',
        category: 'api',
        metadata: { memoryUsage, threshold: this.config.MEMORY_USAGE_WARNING_MB }
      })
    }
  }

  /**
   * Create a performance timer for measuring operation duration
   */
  createTimer(operation: string, context?: TelemetryContext): {
    stop: (success?: boolean, errorCode?: string) => void
  } {
    const startTime = Date.now()
    
    return {
      stop: (success = true, errorCode?: string) => {
        const duration = Date.now() - startTime
        const metrics: any = {
          operation,
          duration,
          success
        }
        if (errorCode) metrics.errorCode = errorCode
        if (context) metrics.context = context
        this.trackPerformance(metrics)
      }
    }
  }

  /**
   * Track business metrics and KPIs
   */
  trackBusinessMetric(metric: string, value: number, context?: TelemetryContext): void {
    logger.info('Business metric', {
      metric: 'business',
      name: metric,
      value,
      timestamp: new Date().toISOString(),
      ...context
    })
  }

  private alertCriticalError(message: string, context?: TelemetryContext, metadata?: Record<string, unknown>): void {
    // In production, this would integrate with alerting systems (PagerDuty, Slack, etc.)
    logger.error('CRITICAL ERROR ALERT', {
      alert: true,
      message,
      context,
      metadata,
      timestamp: new Date().toISOString()
    })
  }
}

// Export singleton instance
export const telemetry = new TelemetryService()

/**
 * Decorator for automatically tracking method performance
 */
export function trackPerformance(operation: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const timer = telemetry.createTimer(operation, {
        operation: `${target.constructor.name}.${propertyName}`
      })

      try {
        const result = await method.apply(this, args)
        timer.stop(true)
        return result
      } catch (error) {
        timer.stop(false, error instanceof Error ? error.name : 'UnknownError')
        throw error
      }
    }
  }
}

/**
 * Decorator for automatically tracking errors
 */
export function trackErrors(category: ErrorTelemetry['category'], severity: ErrorTelemetry['severity'] = 'medium') {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args)
      } catch (error) {
        telemetry.trackError({
          error: error instanceof Error ? error : new Error(String(error)),
          severity,
          category,
          context: {
            operation: `${target.constructor.name}.${propertyName}`
          }
        })
        throw error
      }
    }
  }
}