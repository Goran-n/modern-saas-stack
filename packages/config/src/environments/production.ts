import { z } from 'zod';

/**
 * Production environment configuration
 * Strict validation - all critical variables must be provided
 */
export const productionConfigSchema = z.object({
  // Base configuration - strict for production
  NODE_ENV: z.literal('production'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: z.string().default('0.0.0.0'), // Allow external connections in production
  
  // Database - absolutely required
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required in production'),
  
  // Supabase - required for file operations
  SUPABASE_URL: z.string().url().min(1, 'SUPABASE_URL is required in production'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required in production'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is recommended in production').optional(),
  
  // Auth - must be provided and secure
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters in production'),
  JWT_EXPIRES_IN: z.string().default('1h'), // Shorter expiry in production
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Redis - optional but recommended for production scaling
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_USER: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(true), // Prefer TLS in production
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_TIMEOUT: z.coerce.number().int().min(1000).default(3000), // Shorter timeout
  
  // Web application
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_URL: z.string().url(), // Must be provided in production
  DEV_MODE: z.coerce.boolean().default(false),
});

export type ProductionConfig = z.infer<typeof productionConfigSchema>;