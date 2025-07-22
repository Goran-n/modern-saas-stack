import { z } from "zod";

/**
 * Core system environment variables schema
 */
export const baseSchema = z.object({
  /**
   * Node.js environment
   * @default 'development'
   */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  /**
   * Logging level for the application
   * @default 'info'
   */
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),

  /**
   * Default port for services
   * @default 5000
   */
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  /**
   * Host for services
   * @default 'localhost'
   */
  HOST: z.string().default("localhost"),

  /**
   * Base URL for the API server
   * Used for OAuth callbacks and other external-facing URLs
   * Required for Slack OAuth, WhatsApp webhooks, and other integrations
   * @example "http://localhost:5001" or "https://api.yourdomain.com"
   */
  BASE_URL: z.string().url().min(1, "BASE_URL is required"),
});

export type BaseConfig = z.infer<typeof baseSchema>;
