import { connectDatabase } from './database/connection'
import { getConfig } from './config/config'
import { getRedisConnection } from './config/redis'
import { registerServices } from './lib/di/services'
import { bootstrapDependencies, initializeAsyncServices } from './infrastructure/bootstrap'
import log, { dbLogger } from './config/logger'
import { container, TOKENS } from './shared/utils/container'
import { FileService } from './services/file.service'
import { syncIntegrationProcessor, importTransactionsProcessor } from './jobs/processors/sync.processor'
import { conversationProcessor } from './jobs/processors/conversation.processor'

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
    // Register new services (conversation, file, etc.)
    bootstrapDependencies()
    // Register all services (includes core services, repositories, and @Injectable services)
    await registerServices()
    // Initialize async application services
    await initializeAsyncServices()
    log.info('✅ Dependency injection container ready')

    // Initialize Redis connection for job queue
    log.info('📊 Connecting to Redis...')
    const redis = getRedisConnection()
    
    // Test Redis connection with graceful fallback
    try {
      await redis.ping()
      log.info('✅ Redis connected successfully')
    } catch {
      log.warn('⚠️  Redis connection failed, continuing with mock Redis for development')
      log.warn('💡 To enable Redis: Set REDIS_URL in your environment variables')
    }

    // Perform File Service healthcheck (checks both S3 and database)
    log.info('🗄️  Checking File Service (S3 storage + database)...')
    try {
      const fileService = container.resolve(TOKENS.FILE_SERVICE) as InstanceType<typeof FileService>
      const healthcheck = await fileService.performHealthcheck()
      
      if (healthcheck.healthy) {
        log.info('✅ File Service is healthy')
        log.info(`   S3 Bucket: ${healthcheck.details.storage.details?.bucket}`)
        log.info(`   S3 Region: ${healthcheck.details.storage.details?.region}`)
      } else {
        log.error('❌ File Service healthcheck failed:', healthcheck.message || 'Unknown error')
        
        // Check which component failed
        if (healthcheck.details?.storage && !healthcheck.details.storage.healthy) {
          log.error('   ❌ S3 Storage Error:', healthcheck.details.storage.message)
          log.error('   S3 is required for the application to function properly.')
          log.error('   Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are configured in Doppler.')
        }
        
        if (healthcheck.details?.database && !healthcheck.details.database.healthy) {
          log.error('   ❌ Database Error:', healthcheck.details.database.message)
          log.error('   The files table may be missing or inaccessible.')
          log.error('   Run "bun run db:migrate" to ensure all migrations are applied.')
        }
        
        log.error('   Full details:', JSON.stringify(healthcheck.details, null, 2))
        process.exit(1)
      }
    } catch (error) {
      log.error('❌ Could not initialize File Service:', error instanceof Error ? error.message : 'Unknown error')
      log.error('The File Service requires both S3 storage and database access.')
      process.exit(1)
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
    await conversationProcessor.close()
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