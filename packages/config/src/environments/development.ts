import { z } from 'zod';

/**
 * Development environment configuration
 * Relaxed validation with helpful defaults for local development
 */
export const developmentConfigSchema = z.object({
  // Base configuration with development defaults
  NODE_ENV: z.literal('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('debug'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: z.string().default('localhost'),
  
  // Database - required even in development
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  
  // Supabase - required for file operations
  SUPABASE_URL: z.string().url().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  
  // Auth - use a default development secret if not provided
  JWT_SECRET: z.string().min(1).default('development-jwt-secret-change-in-production-32-chars-minimum'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // Redis - all optional with local defaults
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_USER: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_TIMEOUT: z.coerce.number().int().min(1000).default(5000),
  
  // Web application
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_URL: z.string().url().default('http://localhost:5001'),
  DEV_MODE: z.coerce.boolean().default(true),
});

export type DevelopmentConfig = z.infer<typeof developmentConfigSchema>;