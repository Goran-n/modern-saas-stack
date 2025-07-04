import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { bootstrap } from './bootstrap'
import { getCorsConfig, getAppConfig } from './config/config'
import { checkDatabaseHealth, isConnectedToDatabase } from './database/connection'
import { optionalAuthMiddleware } from './middleware/auth'
import { optionalTenantMiddleware } from './middleware/tenant'
import { requestLoggingMiddleware, simpleRequestLoggingMiddleware } from './middleware/logging'
import log, { trpcLogger } from './config/logger'
import type { HonoVariables } from './types/hono'

// Export types for frontend consumption
export type { AppRouter } from './routers/index'

/**
 * Create and configure the Hono application
 */
function createApp() {
  const corsConfig = getCorsConfig()
  const appConfig = getAppConfig()
  const app = new Hono<{ Variables: HonoVariables }>()

  // Basic middleware
  app.use('*', requestId())
  app.use('*', cors(corsConfig))

  // Request logging middleware
  app.use('/health*', simpleRequestLoggingMiddleware)
  app.use('*', requestLoggingMiddleware)

  // Liveness probe - basic server health (always returns 200 if server is running)
  app.get('/health/live', (c) => {
    return c.json({ 
      status: 'alive', 
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId')
    })
  })

  // Readiness probe - checks if server is ready to handle requests
  app.get('/health/ready', async (c) => {
    const dbConnected = isConnectedToDatabase()
    
    if (!dbConnected) {
      return c.json({
        status: 'not ready',
        reason: 'database not connected',
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId')
      }, 503)
    }

    return c.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId')
    })
  })

  // S3 storage health check
  app.get('/health/storage', async (c) => {
    try {
      const { container, TOKENS } = await import('./shared/utils/container')
      const { FileService } = await import('./services/file.service')
      
      const fileService = container.resolve(TOKENS.FILE_SERVICE) as InstanceType<typeof FileService>
      const healthcheck = await fileService.performHealthcheck()
      
      if (!healthcheck.healthy) {
        return c.json({
          status: 'unhealthy',
          ...healthcheck,
          requestId: c.get('requestId')
        }, 503)
      }
      
      return c.json({
        status: 'healthy',
        ...healthcheck,
        requestId: c.get('requestId')
      })
    } catch (error) {
      return c.json({
        status: 'error',
        message: 'Failed to check storage health',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: c.get('requestId')
      }, 500)
    }
  })

  // Detailed health check with full system status
  app.get('/health', async (c) => {
    try {
      const dbHealth = await checkDatabaseHealth()
      
      // Also check storage health
      let storageHealth = { healthy: false, message: 'Not checked' }
      try {
        const { container, TOKENS } = await import('./shared/utils/container')
        const { FileService } = await import('./services/file.service')
        const fileService = container.resolve(TOKENS.FILE_SERVICE) as InstanceType<typeof FileService>
        const health = await fileService.performHealthcheck()
        storageHealth = { healthy: health.healthy, message: health.message }
      } catch (error) {
        storageHealth = { 
          healthy: false, 
          message: error instanceof Error ? error.message : 'Storage check failed' 
        }
      }
      
      const overallStatus = dbHealth.connected && storageHealth.healthy ? 'healthy' : 'unhealthy'
      
      return c.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId'),
        services: {
          database: dbHealth,
          storage: storageHealth,
          api: { status: 'operational' }
        },
        environment: appConfig.environment,
        version: appConfig.version
      }, overallStatus === 'healthy' ? 200 : 503)
    } catch (error) {
      log.error('Health check error:', error)
      return c.json({
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId')
      }, 500)
    }
  })

  // Diagnostic endpoint for tenant validation testing
  app.get('/debug/tenant-validation', optionalAuthMiddleware, optionalTenantMiddleware, async (c) => {
    const tenantId = c.req.header('x-tenant-id')
    const user = c.get('user')
    const tenantContext = c.get('tenantContext')
    
    return c.json({
      debug: {
        receivedHeaders: {
          'x-tenant-id': tenantId,
          'authorization': c.req.header('authorization') ? 'Bearer [REDACTED]' : undefined
        },
        authStatus: {
          hasUser: !!user,
          userId: user?.id,
          userEmail: user?.email
        },
        tenantStatus: {
          hasTenantContext: !!tenantContext,
          tenantId: tenantContext?.tenantId,
          tenantName: tenantContext?.tenant?.name,
          membershipRole: tenantContext?.membership?.role,
          membershipStatus: tenantContext?.membership?.status
        },
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId')
      }
    })
  })

  // Authentication and tenant middleware for tRPC routes
  app.use('/trpc/*', optionalAuthMiddleware)
  app.use('/trpc/*', optionalTenantMiddleware)

  // tRPC endpoint
  app.all('/trpc/*', async (c) => {
    try {
      // Ensure database is connected before processing requests
      if (!isConnectedToDatabase()) {
        return c.json({ 
          error: 'Service unavailable - database not connected',
          requestId: c.get('requestId')
        }, 503)
      }

      // Import router dynamically to avoid circular deps
      const { appRouter } = await import('./routers/index')
      
      return fetchRequestHandler({
        endpoint: '/trpc',
        req: c.req.raw,
        router: appRouter,
        createContext: async () => {
          const { createContext } = await import('./lib/context')
          return createContext(c)
        },
        onError: ({ error, path, type, ctx }) => {
          trpcLogger.error({
            event: 'trpc_error',
            type,
            path,
            code: error.code,
            message: error.message,
            requestId: ctx?.requestId,
            userId: ctx?.user?.id,
            tenantId: ctx?.tenantContext?.tenantId,
            stack: error.stack,
            cause: error.cause,
          }, `tRPC ${type} error on ${path}: ${error.message}`)
          
          // Also log to console for immediate visibility
          console.error('tRPC Error Details:', {
            path,
            type,
            code: error.code,
            message: error.message,
            stack: error.stack,
            cause: error.cause
          })
        },
      })
    } catch (error) {
      log.error('tRPC handler error:', error)
      console.error('tRPC Handler Error:', error)
      return c.json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
        requestId: c.get('requestId')
      }, 500)
    }
  })

  // 404 handler
  app.notFound((c) => {
    return c.json({ 
      error: 'Not Found',
      path: c.req.path,
      requestId: c.get('requestId')
    }, 404)
  })

  return app
}

/**
 * Main application startup
 */
async function main() {
  // Connect to database first
  await bootstrap()
  
  // Create and start server
  const app = createApp()
  const appConfig = getAppConfig()
  
  serve({
    fetch: app.fetch,
    port: appConfig.port,
  })

  log.info(`✅ Kibly API Server running on port ${appConfig.port}`)
  log.info(`📡 tRPC endpoint: http://localhost:${appConfig.port}/trpc`)
  log.info(`🏥 Health check: http://localhost:${appConfig.port}/health`)
}

// Start the application
main().catch((error) => {
  console.error('Unhandled error during startup:', error)
  process.exit(1)
})