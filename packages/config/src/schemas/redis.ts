import { z } from 'zod';

/**
 * Redis configuration environment variables schema
 */
export const redisSchema = z.object({
  /**
   * Redis host
   * @default 'localhost'
   */
  REDIS_HOST: z.string().default('localhost'),
  
  /**
   * Redis port
   * @default 6379
   */
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  
  /**
   * Redis username
   * @optional
   */
  REDIS_USER: z.string().optional(),
  
  /**
   * Redis password
   * @optional
   */
  REDIS_PASSWORD: z.string().optional(),
  
  /**
   * Enable TLS for Redis connection
   * @default false
   */
  REDIS_TLS: z.coerce.boolean().default(false),
  
  /**
   * Redis database number
   * @default 0
   */
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  
  /**
   * Redis connection timeout in milliseconds
   * @default 5000
   */
  REDIS_TIMEOUT: z.coerce.number().int().min(1000).default(5000),
});

export type RedisConfig = z.infer<typeof redisSchema>;