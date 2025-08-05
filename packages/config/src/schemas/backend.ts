import { z } from "zod";

/**
 * Backend configuration schema
 * Includes all environment variables needed for API, jobs, and backend services
 */
export const backendSchema = z.object({
  // Core
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: z.string().default("localhost"),
  BASE_URL: z.string().url().min(1, "BASE_URL is required"),

  // Database
  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),

  // Supabase
  SUPABASE_URL: z.string().url().min(1, "SUPABASE_URL is required"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_KEY: z.string().min(1, "SUPABASE_SERVICE_KEY is required"),
  STORAGE_BUCKET: z.string().default("vault"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("30d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("90d"),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().default("Figgy"),

  // Integrations
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  
  HMRC_CLIENT_ID: z.string().optional(),
  HMRC_CLIENT_SECRET: z.string().optional(),

  // Trigger.dev
  TRIGGER_API_KEY: z.string().optional(),
  TRIGGER_API_URL: z.string().url().optional(),
  TRIGGER_PROJECT_ID: z.string().optional(),

  // AI/LLM
  PORTKEY_API_KEY: z.string().optional(),
  PORTKEY_GATEWAY_URL: z.string().url().default("https://api.portkey.ai/v1"),
  PORTKEY_VIRTUAL_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Search
  UPSTASH_SEARCH_URL: z.string().url().optional(),
  UPSTASH_SEARCH_TOKEN: z.string().optional(),
  
  // External APIs
  PDF_CO_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),

  // Twilio (WhatsApp)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32).optional(),
  
  // Web application config
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_URL: z.string().url().default("http://localhost:5001"),
  DEV_MODE: z.coerce.boolean().default(false),
  
  // Optional URLs
  INVITATION_BASE_URL: z.string().url().optional(),
});

export type BackendConfig = z.infer<typeof backendSchema>;