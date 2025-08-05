import { z } from "zod";

/**
 * Browser extension configuration schema
 * Includes all environment variables needed for the browser extension
 */
export const extensionSchema = z.object({
  // Core
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Supabase (public keys only)
  VITE_SUPABASE_URL: z.string().url().min(1, "VITE_SUPABASE_URL is required"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "VITE_SUPABASE_ANON_KEY is required"),

  // API endpoints
  VITE_API_URL: z.string().url().default("http://localhost:5001"),
  
  // Extension config
  VITE_EXTENSION_ID: z.string().optional(),
  VITE_APP_NAME: z.string().default("Figgy"),

  // OAuth redirect
  VITE_REDIRECT_URL: z.string().url().optional(),
});

export type ExtensionConfig = z.infer<typeof extensionSchema>;