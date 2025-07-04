import { Queue } from 'bullmq'
import { z } from 'zod'

// Use the same Redis configuration logic as the API
const envSchema = z.object({
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USER: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
})

function getRedisConfig() {
  const config = envSchema.parse(process.env)
  return {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    username: config.REDIS_USER || undefined,
    password: config.REDIS_PASSWORD || undefined,
    tls: config.REDIS_TLS ? {} : undefined,
  }
}

// Redis connection using same logic as API
const redisConnection = getRedisConfig()

console.log('🔍 Queue Monitor Redis config:', {
  host: redisConnection.host,
  port: redisConnection.port,
  hasUser: !!redisConnection.username,
  hasPassword: !!redisConnection.password,
  tls: !!redisConnection.tls
})

// Queue names - should match those in the API
export const QUEUE_NAMES = {
  SYNC_INTEGRATION: 'sync-integration',
  IMPORT_TRANSACTIONS: 'import-transactions',
  ENRICH_TRANSACTIONS: 'enrich-transactions',
} as const

// Create queue instances for monitoring (read-only)
export const queues = [
  new Queue(QUEUE_NAMES.SYNC_INTEGRATION, { connection: redisConnection }),
  new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, { connection: redisConnection }),
  new Queue(QUEUE_NAMES.ENRICH_TRANSACTIONS, { connection: redisConnection }),
]

// Queue metadata for display
export const queueMetadata = {
  [QUEUE_NAMES.SYNC_INTEGRATION]: {
    name: 'Sync Integration',
    description: 'Handles integration synchronisation jobs',
  },
  [QUEUE_NAMES.IMPORT_TRANSACTIONS]: {
    name: 'Import Transactions',
    description: 'Imports transactions from external sources',
  },
  [QUEUE_NAMES.ENRICH_TRANSACTIONS]: {
    name: 'Enrich Transactions',
    description: 'Enriches transaction data with additional information',
  },
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  console.log('Closing queue monitoring connections...')
  await Promise.all(queues.map(queue => queue.close()))
  console.log('Queue monitoring connections closed')
}