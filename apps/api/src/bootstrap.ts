import { connectDatabase } from './database/connection'
import { getConfig } from './config/config'
import { getRedisConnection } from './config/redis'
import { registerServices } from './lib/di/services'
import log, { dbLogger } from './config/logger'

/**
 * Bootstrap: validate security configuration, connect to database, start job processors
 * If any critical validation fails, process exits
 */
export async function bootstrap(): Promise<void> {
  try {
    log.info('🚀 Starting API server...')
    
    // TypeScript validation is handled by the build pipeline (turbo typecheck)
    
    // Validate critical security configuration
    log.info('🔐 Validating security configuration...')
    const config = getConfig()
    
    if (!config.JWT_KEY) {
      log.error('❌ CRITICAL SECURITY ERROR: JWT_KEY is not configured')
      process.exit(1)
    }
    
    log.info('✅ Security configuration validated')
    
    // Connect to database
    dbLogger.info('🗄️  Connecting to database...')
    await connectDatabase()
    dbLogger.info('✅ Database connected successfully')

    // Initialize dependency injection container
    log.info('🏗️  Bootstrapping dependency injection container...')
    // Register all services (includes core services, repositories, and @Injectable services)
    await registerServices()
    log.info('✅ Dependency injection container ready')

    // Initialize Redis connection for job queue
    log.info('📊 Connecting to Redis...')
    const redis = getRedisConnection()
    
    // Test Redis connection with graceful fallback
    try {
      await redis.ping()
      log.info('✅ Redis connected successfully')
    } catch (error) {
      log.warn('⚠️  Redis connection failed, continuing with mock Redis for development')
      log.warn('💡 To enable Redis: Set REDIS_URL in your environment variables')
    }

    // Start job processors
    log.info('⚙️  Starting job processors...')
    setTimeout(async () => {
      try {
        await import('./jobs/processors/sync.processor')
        log.info('✅ Job processors started')
      } catch (error) {
        log.error('❌ Failed to start job processors:', error)
      }
    }, 2000) // 2 second delay

  } catch (error) {
    dbLogger.error({
      event: 'bootstrap_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, '❌ Bootstrap failed')
    process.exit(1)
  }
}

export async function shutdown(): Promise<void> {
  try {
    log.info('🛑 Starting graceful shutdown...')

    // Stop job processors
    const { syncIntegrationProcessor, importTransactionsProcessor } = await import('./jobs/processors/sync.processor')
    await syncIntegrationProcessor.close()
    await importTransactionsProcessor.close()
    log.info('✅ Job processors stopped')

    // Close Redis connection
    const redis = getRedisConnection()
    await redis.quit()
    log.info('✅ Redis connection closed')

    log.info('✅ Graceful shutdown completed')
  } catch (error) {
    log.error('❌ Shutdown failed:', error)
    throw error
  }
}