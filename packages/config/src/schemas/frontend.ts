import { z } from "zod";

/**
 * Frontend configuration schema
 * Includes all environment variables needed for web applications
 */
export const frontendSchema = z.object({
  // Core
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Supabase (public keys only)
  SUPABASE_URL: z.string().url().min(1, "SUPABASE_URL is required"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),

  // API endpoints
  API_BASE_URL: z.string().url().default("http://localhost:5001"),
  
  // Public app config
  APP_NAME: z.string().default("Figgy"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Feature flags
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  ENABLE_SENTRY: z.coerce.boolean().default(false),
  
  // Optional public keys
  SENTRY_DSN: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),
});

export type FrontendConfig = z.infer<typeof frontendSchema>;