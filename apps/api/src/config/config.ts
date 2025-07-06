import { z } from 'zod'

// Environment schema with all required variables
const envSchema = z.object({
  // Core application settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Database configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // CORS configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  
  // Authentication/JWT configuration
  JWT_KEY: z.string().min(1, 'JWT_KEY is required for authentication'),
  JWT_ISSUER: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  
  // Xero OAuth configuration
  XERO_CLIENT_ID: z.string().optional(),
  XERO_CLIENT_SECRET: z.string().optional(),
  XERO_REDIRECT_URI: z.string().url().optional(),
  
  // Redis configuration for job queue  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USER: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
  
  // Twilio WhatsApp configuration
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  TWILIO_WEBHOOK_URL: z.string().url().optional(),
  
  // S3 Storage configuration
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('kibly-files'),
  S3_ENDPOINT: z.string().url().optional(), // For S3-compatible services
  
  // Application metadata (npm provides this automatically)
  npm_package_version: z.string().optional(),
  
  // Portkey AI Gateway configuration
  PORTKEY_API_KEY: z.string().default('J72HF+PznENJaQA6xqkaB4zsa51u'),
  PORTKEY_VIRTUAL_KEY: z.string().default('anthropic-virtu-de63f7'),
  AI_DEFAULT_MODEL: z.string().default('claude-3-5-sonnet-20240620'),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_MAX_TOKENS: z.coerce.number().default(2000),
  AI_TEMPERATURE: z.coerce.number().default(0.7),
  
  // Orchestration configuration
  ORCHESTRATION_MAX_CONTEXT_MESSAGES: z.coerce.number().default(20),
  ORCHESTRATION_CONTEXT_TTL_SECONDS: z.coerce.number().default(3600),
  ORCHESTRATION_ENABLE_STREAMING: z.coerce.boolean().default(false),
})

export type Config = z.infer<typeof envSchema>

let cachedConfig: Config | null = null

/**
 * Get validated environment configuration
 * Validates all environment variables and caches the result
 */
export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    cachedConfig = envSchema.parse(process.env)
    return cachedConfig
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    } else {
      console.error('❌ Environment validation error:', error)
    }
    process.exit(1)
  }
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  const config = getConfig()
  return {
    url: config.DATABASE_URL,
  }
}

/**
 * Get authentication configuration
 */
export function getAuthConfig() {
  const config = getConfig()
  return {
    jwtKey: config.JWT_KEY,
    jwtSecret: config.JWT_SECRET,
    jwtIssuer: config.JWT_ISSUER,
  }
}

/**
 * Get Xero OAuth configuration
 */
export function getXeroConfig() {
  const config = getConfig()
  return {
    clientId: config.XERO_CLIENT_ID,
    clientSecret: config.XERO_CLIENT_SECRET,
    redirectUri: config.XERO_REDIRECT_URI || 'http://localhost:5173/integrations/oauth/callback',
    scopes: ['offline_access', 'accounting.transactions', 'accounting.transactions.read', 'accounting.contacts', 'accounting.contacts.read', 'accounting.settings', 'accounting.settings.read'],
  }
}

/**
 * Get CORS configuration
 */
export function getCorsConfig() {
  const config = getConfig()
  return {
    origin: config.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173']
      : config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
    credentials: config.CORS_CREDENTIALS,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-user-id', 'x-request-id'],
  }
}

/**
 * Get logging configuration
 */
export function getLogConfig() {
  const config = getConfig()
  return {
    level: config.LOG_LEVEL,
    isDevelopment: config.NODE_ENV === 'development',
    isProduction: config.NODE_ENV === 'production',
  }
}

/**
 * Get Redis configuration
 * @deprecated Use getRedisConfig from @kibly/shared-utils instead
 */
export function getRedisConfig() {
  const config = getConfig()
  return {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    username: config.REDIS_USER || undefined,
    password: config.REDIS_PASSWORD || undefined,
    tls: config.REDIS_TLS ? {} : undefined,
  }
}

/**
 * Get Twilio WhatsApp configuration
 */
export function getTwilioConfig() {
  const config = getConfig()
  
  // Check if Twilio is configured
  const isConfigured = !!(
    config.TWILIO_ACCOUNT_SID && 
    config.TWILIO_AUTH_TOKEN && 
    config.TWILIO_WHATSAPP_NUMBER
  )
  
  return {
    accountSid: config.TWILIO_ACCOUNT_SID || '',
    authToken: config.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: config.TWILIO_WHATSAPP_NUMBER || '',
    webhookUrl: config.TWILIO_WEBHOOK_URL,
    isConfigured,
  }
}

/**
 * Get S3 storage configuration
 */
export function getS3Config() {
  const config = getConfig()
  
  // Check if S3 is configured
  const isConfigured = !!(
    config.AWS_ACCESS_KEY_ID && 
    config.AWS_SECRET_ACCESS_KEY
  )
  
  return {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_REGION,
    bucket: config.S3_BUCKET,
    endpoint: config.S3_ENDPOINT,
    isConfigured,
  }
}

/**
 * Get application metadata
 */
export function getAppConfig() {
  const config = getConfig()
  return {
    version: config.npm_package_version || 'unknown',
    environment: config.NODE_ENV,
    port: config.PORT,
  }
}

/**
 * Get AI/orchestration configuration
 */
export function getAIConfig() {
  const config = getConfig()
  return {
    portkeyApiKey: config.PORTKEY_API_KEY,
    portkeyVirtualKey: config.PORTKEY_VIRTUAL_KEY,
    defaultModel: config.AI_DEFAULT_MODEL,
    embeddingModel: config.AI_EMBEDDING_MODEL,
    maxTokens: config.AI_MAX_TOKENS,
    temperature: config.AI_TEMPERATURE,
    isConfigured: !!config.PORTKEY_API_KEY && !!config.PORTKEY_VIRTUAL_KEY,
  }
}

/**
 * Get orchestration configuration
 */
export function getOrchestrationConfig() {
  const config = getConfig()
  return {
    maxContextMessages: config.ORCHESTRATION_MAX_CONTEXT_MESSAGES,
    contextTtlSeconds: config.ORCHESTRATION_CONTEXT_TTL_SECONDS,
    enableStreaming: config.ORCHESTRATION_ENABLE_STREAMING,
  }
}

// Re-export for backward compatibility
export const getEnv = getConfig
export type Env = Config