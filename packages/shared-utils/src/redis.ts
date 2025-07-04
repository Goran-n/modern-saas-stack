import Redis from 'ioredis'
import { getRedisConfig } from './redis-config'

let redisClient: Redis | null = null

export async function getRedisClient(): Promise<Redis | null> {
  if (redisClient) {
    return redisClient
  }

  try {
    const config = getRedisConfig()
    const redisOptions: any = {
      host: config.host,
      port: config.port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
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
    
    redisClient = new Redis(redisOptions)

    await redisClient.ping()
    return redisClient
  } catch (error) {
    console.warn('Failed to connect to Redis:', error)
    return null
  }
}

export function closeRedisConnection(): void {
  if (redisClient) {
    redisClient.disconnect()
    redisClient = null
  }
}