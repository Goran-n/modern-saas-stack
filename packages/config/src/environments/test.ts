import { z } from "zod";
import { backendSchema } from "../schemas";

/**
 * Test environment configuration
 * Minimal requirements with mock/test values
 */
export const testConfigSchema = backendSchema
  .extend({
    // Override for test
    NODE_ENV: z.literal("test"),
    LOG_LEVEL: z
      .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
      .default("error"), // Minimal logging
    PORT: z.coerce.number().int().min(1).max(65535).default(0), // Random port for tests
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://test:test@localhost:5432/test_db"),
    SUPABASE_URL: z.string().url().default("https://test.supabase.co"),
    SUPABASE_ANON_KEY: z.string().default("test-anon-key"),
    SUPABASE_SERVICE_KEY: z.string().default("test-service-key"),
    JWT_SECRET: z.string().default("test-jwt-secret-32-characters-long"),
    BASE_URL: z.string().url().default("http://localhost:5001"),
  })
  .partial({
    // Make everything else optional for tests
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

export type TestConfig = z.infer<typeof testConfigSchema>;
