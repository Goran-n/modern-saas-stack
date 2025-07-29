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
  
  /**
   * JWT secret key (also used for encryption)
   * @required
   * @minimum 32 characters
   */
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  
  /**
   * Google OAuth Client ID for Gmail integration
   * @optional
   */
  GOOGLE_CLIENT_ID: z.string().optional(),
  
  /**
   * Google OAuth Client Secret for Gmail integration
   * @optional
   */
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  /**
   * Google Pub/Sub topic for Gmail push notifications
   * @optional
   * @example "projects/your-project/topics/gmail-push"
   */
  GOOGLE_PUBSUB_TOPIC: z.string().optional(),
  
  /**
   * Microsoft Azure AD Client ID for Outlook integration
   * @optional
   */
  MICROSOFT_CLIENT_ID: z.string().optional(),
  
  /**
   * Microsoft Azure AD Client Secret for Outlook integration
   * @optional
   */
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  
  /**
   * Microsoft Azure AD Tenant ID for Outlook integration
   * @optional
   */
  MICROSOFT_TENANT_ID: z.string().optional(),
});

export type BaseConfig = z.infer<typeof baseSchema>;
