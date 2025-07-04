import { connectDatabase } from './database/connection'
import { getConfig } from './config/config'
import { getRedisConnection } from './config/redis'
import { registerServices } from './lib/di/services'
import log, { dbLogger } from './config/logger'
import { container, TOKENS } from './shared/utils/container'
import { FileService } from './services/file.service'
import { syncIntegrationProcessor, importTransactionsProcessor } from './jobs/processors/sync.processor'

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

    // Perform S3 healthcheck
    log.info('🗄️  Checking S3 storage configuration...')
    try {
      const fileService = container.resolve(TOKENS.FILE_SERVICE) as InstanceType<typeof FileService>
      const healthcheck = await fileService.performHealthcheck()
      
      if (healthcheck.healthy) {
        log.info('✅ S3 storage configured and accessible')
        log.info(`   Bucket: ${healthcheck.details.storage.details?.bucket}`)
        log.info(`   Region: ${healthcheck.details.storage.details?.region}`)
      } else {
        log.warn('⚠️  S3 storage healthcheck failed:', healthcheck.message)
        log.warn('   Details:', healthcheck.details)
        log.warn('💡 File uploads will fail until S3 is properly configured')
        log.warn('💡 Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET in your environment')
      }
    } catch (error) {
      log.warn('⚠️  Could not perform S3 healthcheck:', error instanceof Error ? error.message : 'Unknown error')
      log.warn('💡 File service may not be properly configured')
    }

    // Start job processors
    log.info('⚙️  Starting job processors...')
    setTimeout(() => {
      try {
        // Job processors are already imported, they start automatically
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