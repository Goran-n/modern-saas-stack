import { z } from 'zod';

// Import all schemas
export * from './base';
export * from './database';
export * from './supabase';
export * from './auth';
export * from './redis';
export * from './web';
export * from './trigger';

import { baseSchema } from './base';
import { databaseSchema } from './database';
import { supabaseSchema } from './supabase';
import { authSchema } from './auth';
import { redisSchema } from './redis';
import { webSchema } from './web';
import { triggerSchema } from './trigger';

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
  .merge(triggerSchema);

/**
 * Core required configuration schema
 * Only includes absolutely necessary variables
 */
export const coreConfigSchema = baseSchema
  .merge(databaseSchema)
  .merge(supabaseSchema)
  .merge(authSchema)
  .merge(triggerSchema);

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

// Type exports
export type FullConfig = z.infer<typeof fullConfigSchema>;
export type CoreConfig = z.infer<typeof coreConfigSchema>;
export type FileManagerConfig = z.infer<typeof fileManagerConfigSchema>;
export type WebAppConfig = z.infer<typeof webAppConfigSchema>;
export type TenantConfig = z.infer<typeof tenantConfigSchema>;