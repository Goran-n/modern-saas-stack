import { z } from 'zod'

/**
 * Sync operation configuration schema
 * Externalizes all hardcoded values for sync operations
 */
const syncConfigSchema = z.object({
  // Token management
  TOKEN_REFRESH_BUFFER_SECONDS: z.coerce.number().default(300), // 5 minutes
  TOKEN_DEFAULT_EXPIRY_SECONDS: z.coerce.number().default(1800), // 30 minutes
  TOKEN_CONSECUTIVE_FAILURE_LIMIT: z.coerce.number().default(10),

  // API rate limiting
  XERO_REQUESTS_PER_SECOND: z.coerce.number().default(5),
  XERO_REQUESTS_PER_MINUTE: z.coerce.number().default(60),
  XERO_PAGE_SIZE: z.coerce.number().default(100),
  XERO_MAX_PAGES: z.coerce.number().default(100),
  
  // Retry configuration
  DEFAULT_RETRY_ATTEMPTS: z.coerce.number().default(3),
  DEFAULT_RETRY_DELAY_MS: z.coerce.number().default(1000),
  RATE_LIMIT_RETRY_DELAY_MS: z.coerce.number().default(500),
  
  // Batch processing
  TRANSACTION_BATCH_SIZE: z.coerce.number().default(50),
  BULK_OPERATION_TIMEOUT_MS: z.coerce.number().default(30000),
  
  // Database connection
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().default(10000),
  DB_QUERY_TIMEOUT_MS: z.coerce.number().default(30000),
  
  // Sync job management
  SYNC_JOB_DEFAULT_PRIORITY: z.coerce.number().default(5),
  SYNC_JOB_TIMEOUT_MINUTES: z.coerce.number().default(60),
  
  // Date range defaults
  DEFAULT_SYNC_DAYS_BACK: z.coerce.number().default(30),
  MAX_SYNC_DAYS_BACK: z.coerce.number().default(365),
  
  // Cache configuration
  LOOKUP_CACHE_TTL_MINUTES: z.coerce.number().default(60),
  ENTITY_CACHE_MAX_SIZE: z.coerce.number().default(1000),
  
  // Performance monitoring
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().default(1000),
  MEMORY_USAGE_WARNING_MB: z.coerce.number().default(512),
})

export type SyncConfig = z.infer<typeof syncConfigSchema>

let cachedSyncConfig: SyncConfig | null = null

/**
 * Get sync configuration with environment variable overrides
 */
export function getSyncConfig(): SyncConfig {
  if (cachedSyncConfig) {
    return cachedSyncConfig
  }

  // Base config merged with sync-specific config
  
  // Merge base config with sync-specific environment variables
  const syncEnvVars = {
    TOKEN_REFRESH_BUFFER_SECONDS: process.env.TOKEN_REFRESH_BUFFER_SECONDS,
    TOKEN_DEFAULT_EXPIRY_SECONDS: process.env.TOKEN_DEFAULT_EXPIRY_SECONDS,
    TOKEN_CONSECUTIVE_FAILURE_LIMIT: process.env.TOKEN_CONSECUTIVE_FAILURE_LIMIT,
    XERO_REQUESTS_PER_SECOND: process.env.XERO_REQUESTS_PER_SECOND,
    XERO_REQUESTS_PER_MINUTE: process.env.XERO_REQUESTS_PER_MINUTE,
    XERO_PAGE_SIZE: process.env.XERO_PAGE_SIZE,
    XERO_MAX_PAGES: process.env.XERO_MAX_PAGES,
    DEFAULT_RETRY_ATTEMPTS: process.env.DEFAULT_RETRY_ATTEMPTS,
    DEFAULT_RETRY_DELAY_MS: process.env.DEFAULT_RETRY_DELAY_MS,
    RATE_LIMIT_RETRY_DELAY_MS: process.env.RATE_LIMIT_RETRY_DELAY_MS,
    TRANSACTION_BATCH_SIZE: process.env.TRANSACTION_BATCH_SIZE,
    BULK_OPERATION_TIMEOUT_MS: process.env.BULK_OPERATION_TIMEOUT_MS,
    DB_CONNECTION_TIMEOUT_MS: process.env.DB_CONNECTION_TIMEOUT_MS,
    DB_QUERY_TIMEOUT_MS: process.env.DB_QUERY_TIMEOUT_MS,
    SYNC_JOB_DEFAULT_PRIORITY: process.env.SYNC_JOB_DEFAULT_PRIORITY,
    SYNC_JOB_TIMEOUT_MINUTES: process.env.SYNC_JOB_TIMEOUT_MINUTES,
    DEFAULT_SYNC_DAYS_BACK: process.env.DEFAULT_SYNC_DAYS_BACK,
    MAX_SYNC_DAYS_BACK: process.env.MAX_SYNC_DAYS_BACK,
    LOOKUP_CACHE_TTL_MINUTES: process.env.LOOKUP_CACHE_TTL_MINUTES,
    ENTITY_CACHE_MAX_SIZE: process.env.ENTITY_CACHE_MAX_SIZE,
    SLOW_QUERY_THRESHOLD_MS: process.env.SLOW_QUERY_THRESHOLD_MS,
    MEMORY_USAGE_WARNING_MB: process.env.MEMORY_USAGE_WARNING_MB,
  }

  try {
    cachedSyncConfig = syncConfigSchema.parse(syncEnvVars)
    return cachedSyncConfig
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid sync configuration:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw error
  }
}

/**
 * Get Xero-specific configuration
 */
export function getXeroSyncConfig() {
  const config = getSyncConfig()
  return {
    requestsPerSecond: config.XERO_REQUESTS_PER_SECOND,
    requestsPerMinute: config.XERO_REQUESTS_PER_MINUTE,
    pageSize: config.XERO_PAGE_SIZE,
    maxPages: config.XERO_MAX_PAGES,
    retryAttempts: config.DEFAULT_RETRY_ATTEMPTS,
    retryDelay: config.DEFAULT_RETRY_DELAY_MS,
    rateLimitDelay: config.RATE_LIMIT_RETRY_DELAY_MS,
  }
}

/**
 * Get token management configuration
 */
export function getTokenConfig() {
  const config = getSyncConfig()
  return {
    refreshBufferSeconds: config.TOKEN_REFRESH_BUFFER_SECONDS,
    defaultExpirySeconds: config.TOKEN_DEFAULT_EXPIRY_SECONDS,
    consecutiveFailureLimit: config.TOKEN_CONSECUTIVE_FAILURE_LIMIT,
  }
}

/**
 * Get batch processing configuration
 */
export function getBatchConfig() {
  const config = getSyncConfig()
  return {
    transactionBatchSize: config.TRANSACTION_BATCH_SIZE,
    bulkOperationTimeout: config.BULK_OPERATION_TIMEOUT_MS,
    defaultSyncDaysBack: config.DEFAULT_SYNC_DAYS_BACK,
    maxSyncDaysBack: config.MAX_SYNC_DAYS_BACK,
  }
}