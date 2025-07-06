import Redis from 'ioredis'
import { getRedisConfig } from './config'

let redis: Redis | null = null

export function getRedisConnection(): Redis {
  if (!redis) {
    const config = getRedisConfig()
    
    console.log('🔍 Redis config:', {
      host: config.host,
      port: config.port,
      hasUser: !!config.username,
      hasPassword: !!config.password,
      tls: !!config.tls
    })
    
    const redisOptions: any = {
      host: config.host,
      port: config.port,
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: null, // Required for BullMQ workers
    }
    
    // Only add optional properties if they exist
    if (config.username) {
      redisOptions.username = config.username
    }
    if (config.password) {
      redisOptions.password = config.password
    }
    if (config.tls) {
      redisOptions.tls = config.tls
    }
    
    redis = new Redis(redisOptions)

    redis.on('ready', () => {
      console.log('✅ Redis connected and ready')
    })

    redis.on('error', (error) => {
      console.error('❌ Redis error:', error.message)
    })
  }
  
  return redis
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}