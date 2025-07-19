import { z } from 'zod';

// Import all schemas
export * from './base';
export * from './database';
export * from './supabase';
export * from './auth';
export * from './redis';
export * from './web';
export * from './trigger';
export * from './portkey';
export * from './twilio';
export * from './slack';
export * from './communication';

import { baseSchema } from './base';
import { databaseSchema } from './database';
import { supabaseSchema } from './supabase';
import { authSchema } from './auth';
import { redisSchema } from './redis';
import { webSchema } from './web';
import { triggerSchema } from './trigger';
import { portkeySchema } from './portkey';
import { twilioSchema } from './twilio';
import { slackSchema } from './slack';
import { communicationServiceSchema } from './communication';

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