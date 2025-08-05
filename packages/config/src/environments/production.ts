import { z } from "zod";
import { backendSchema } from "../schemas";

/**
 * Production environment configuration
 * Strict validation - all critical variables must be provided
 */
export const productionConfigSchema = backendSchema.extend({
  // Override for production
  NODE_ENV: z.literal("production"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
  HOST: z.string().default("0.0.0.0"), // Allow external connections in production
  JWT_EXPIRES_IN: z.string().default("1h"), // Shorter expiry in production
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
});

export type ProductionConfig = z.infer<typeof productionConfigSchema>;
