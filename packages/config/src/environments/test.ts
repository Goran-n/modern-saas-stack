import { z } from 'zod';

/**
 * Test environment configuration
 * Minimal requirements with mock/test values
 */
export const testConfigSchema = z.object({
  // Base configuration for testing
  NODE_ENV: z.literal('test'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('error'), // Minimal logging
  PORT: z.coerce.number().int().min(1).max(65535).default(0), // Random port for tests
  HOST: z.string().default('localhost'),
  
  // Database - can use test database or mock
  DATABASE_URL: z.string().url().default('postgresql://test:test@localhost:5432/test_db'),
  
  // Supabase - can use mock values for testing
  SUPABASE_URL: z.string().url().default('https://test.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default('test-anon-key'),
  SUPABASE_SERVICE_KEY: z.string().default('test-service-key').optional(),
  
  // Auth - test values
  JWT_SECRET: z.string().default('test-jwt-secret-32-characters-long'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('24h'),
  
  // Redis - use mock/memory store for tests
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6380), // Different port for tests
  REDIS_USER: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(1), // Different DB for tests
  REDIS_TIMEOUT: z.coerce.number().int().min(1000).default(1000),
  
  // Web application - test ports
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(0), // Random port
  API_URL: z.string().url().default('http://localhost:0'), // Will be set dynamically
  DEV_MODE: z.coerce.boolean().default(false),
});

export type TestConfig = z.infer<typeof testConfigSchema>;