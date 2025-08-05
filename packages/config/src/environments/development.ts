import { z } from "zod";
import { backendSchema } from "../schemas";

/**
 * Development environment configuration
 * Relaxed validation with helpful defaults for local development
 */
export const developmentConfigSchema = backendSchema
  .extend({
    // Override defaults for development
    NODE_ENV: z.literal("development"),
    LOG_LEVEL: z
      .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
      .default("debug"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5001),
    JWT_SECRET: z
      .string()
      .min(1)
      .default("development-jwt-secret-change-in-production-32-chars-minimum"),
    DEV_MODE: z.coerce.boolean().default(true),
  })
  .partial({
    // Make optional in development
    SUPABASE_SERVICE_KEY: true,
    RESEND_API_KEY: true,
    EMAIL_FROM_ADDRESS: true,
    SLACK_CLIENT_ID: true,
    SLACK_CLIENT_SECRET: true,
    SLACK_SIGNING_SECRET: true,
    GOOGLE_CLIENT_ID: true,
    GOOGLE_CLIENT_SECRET: true,
    MICROSOFT_CLIENT_ID: true,
    MICROSOFT_CLIENT_SECRET: true,
    TRIGGER_API_KEY: true,
    TRIGGER_API_URL: true,
    TRIGGER_PROJECT_ID: true,
    PORTKEY_API_KEY: true,
    ANTHROPIC_API_KEY: true,
    UPSTASH_SEARCH_URL: true,
    UPSTASH_SEARCH_TOKEN: true,
    ENCRYPTION_KEY: true,
  });

export type DevelopmentConfig = z.infer<typeof developmentConfigSchema>;
