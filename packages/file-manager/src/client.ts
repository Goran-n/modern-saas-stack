import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@kibly/utils';
import { getConfig } from '@kibly/config';

const logger = createLogger('file-manager-client');

let clientInstance: SupabaseClient | null = null;

/**
 * Get the Supabase client instance
 * Creates a new client if one doesn't exist
 */
export function getClient(): SupabaseClient {
  if (!clientInstance) {
    const config = getConfig().getCore();
    
    // Use service key if available for elevated permissions
    const authKey = config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY;
    const isServiceKey = !!config.SUPABASE_SERVICE_KEY;
    
    clientInstance = createClient(config.SUPABASE_URL, authKey, {
      auth: {
        autoRefreshToken: !isServiceKey,
        persistSession: !isServiceKey,
        detectSessionInUrl: false
      }
    });
    
    logger.info('Supabase client created successfully', {
      usingServiceKey: isServiceKey,
      hasServiceKey: !!config.SUPABASE_SERVICE_KEY,
      authKeyLength: authKey?.length
    });
  }
  
  return clientInstance;
}

/**
 * Set a custom Supabase client instance (useful for testing)
 */
export function setClient(client: SupabaseClient): void {
  clientInstance = client;
  logger.info('Custom Supabase client set');
}

/**
 * Reset the Supabase client instance
 */
export function resetClient(): void {
  clientInstance = null;
  logger.info('Supabase client reset');
}