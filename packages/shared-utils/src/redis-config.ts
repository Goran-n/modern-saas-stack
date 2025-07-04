import { z } from 'zod'

// Redis configuration schema
const redisConfigSchema = z.object({
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USER: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
})

export interface RedisConfig {
  host: string
  port: number
  username?: string
  password?: string
  tls?: object
}

/**
 * Get Redis configuration from environment variables
 */
export function getRedisConfig(): RedisConfig {
  try {
    const config = redisConfigSchema.parse(process.env)
    const redisConfig: RedisConfig = {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
    }
    
    // Only add optional properties if they exist
    if (config.REDIS_USER) {
      redisConfig.username = config.REDIS_USER
    }
    if (config.REDIS_PASSWORD) {
      redisConfig.password = config.REDIS_PASSWORD
    }
    if (config.REDIS_TLS) {
      redisConfig.tls = {}
    }
    
    return redisConfig
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid Redis environment variables:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    } else {
      console.error('❌ Redis config validation error:', error)
    }
    throw error
  }
}