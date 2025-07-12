import { z } from 'zod';

/**
 * Supabase configuration environment variables schema
 */
export const supabaseSchema = z.object({
  /**
   * Supabase project URL
   * @required
   * @example 'https://your-project.supabase.co'
   */
  SUPABASE_URL: z.string().url().min(1, 'SUPABASE_URL is required'),
  
  /**
   * Supabase anonymous key
   * @required
   */
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  
  /**
   * Supabase service role key (for server-side operations)
   * @optional
   */
  SUPABASE_SERVICE_KEY: z.string().optional(),
  
  /**
   * Storage bucket name
   * @optional
   * @default 'vault'
   */
  STORAGE_BUCKET: z.string().default('vault'),
});

export type SupabaseConfig = z.infer<typeof supabaseSchema>;