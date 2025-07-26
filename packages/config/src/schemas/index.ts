import type { z } from "zod";

export * from "./auth";
// Import all schemas
export * from "./base";
export * from "./communication";
export * from "./database";
export * from "./external-services";
export * from "./portkey";
export * from "./redis";
export * from "./slack";
export * from "./supabase";
export * from "./trigger";
export * from "./twilio";
export * from "./web";

import { authSchema } from "./auth";
import { baseSchema } from "./base";
import { communicationServiceSchema } from "./communication";
import { databaseSchema } from "./database";
import { portkeySchema } from "./portkey";
import { redisSchema } from "./redis";
import { slackSchema } from "./slack";
import { supabaseSchema } from "./supabase";
import { triggerSchema } from "./trigger";
import { twilioSchema } from "./twilio";
import { webSchema } from "./web";

/**
 * Complete application configuration schema
 * Combines all environment variable schemas
 */
export const fullConfigSchema = baseSchema
  .merge(databaseSchema)
  .merge(supabaseSchema)
  .merge(authSchema)
  .merge(redisSchema)
  .merge(webSchema)
  .merge(triggerSchema)
  .merge(portkeySchema)
  .merge(twilioSchema);

/**
 * Core required configuration schema
 * Only includes absolutely necessary variables
 */
export const coreConfigSchema = baseSchema
  .merge(databaseSchema)
  .merge(supabaseSchema)
  .merge(authSchema)
  .merge(triggerSchema)
  .merge(portkeySchema);

/**
 * File manager specific configuration schema
 */
export const fileManagerConfigSchema = baseSchema
  .merge(databaseSchema)
  .merge(supabaseSchema);

/**
 * Web application specific configuration schema
 */
export const webAppConfigSchema = baseSchema
  .merge(supabaseSchema)
  .merge(webSchema);

/**
 * Tenant service specific configuration schema
 */
export const tenantConfigSchema = baseSchema
  .merge(databaseSchema)
  .merge(authSchema);

/**
 * Communication service specific configuration schema
 */
export const communicationConfigSchema = baseSchema
  .merge(databaseSchema)
  .merge(supabaseSchema)
  .merge(twilioSchema)
  .merge(slackSchema)
  .merge(communicationServiceSchema);

// Type exports
export type FullConfig = z.infer<typeof fullConfigSchema>;
export type CoreConfig = z.infer<typeof coreConfigSchema>;
export type FileManagerConfig = z.infer<typeof fileManagerConfigSchema>;
export type WebAppConfig = z.infer<typeof webAppConfigSchema>;
export type TenantConfig = z.infer<typeof tenantConfigSchema>;
export type CommunicationConfig = z.infer<typeof communicationConfigSchema>;
