import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Load environment variables
loadEnv();

// Base configuration schema
const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  
  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  
  // App URLs
  BASE_URL: z.string().url().optional(),
  PRODUCTION_APP_URL: z.string().url().optional(),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    try {
      cachedConfig = configSchema.parse(process.env);
    } catch (error) {
      console.error("Configuration validation failed:", error);
      throw new Error("Invalid configuration");
    }
  }
  return cachedConfig;
}

export function validateConfig(): void {
  getConfig();
}