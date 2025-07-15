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
   * Supabase project ID (extracted from URL)
   * @optional - auto-derived from SUPABASE_URL if not provided
   */
  SUPABASE_PROJECT_ID: z.string().optional(),
  
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
  
  /**
   * Storage signed URL expiry time in seconds
   * @optional
   * @default 300 (5 minutes)
   */
  STORAGE_SIGNED_URL_EXPIRY: z.coerce.number().int().min(30).max(3600).default(300),
}).transform((data) => {
  // Auto-derive project ID from URL if not provided
  if (!data.SUPABASE_PROJECT_ID && data.SUPABASE_URL) {
    const match = data.SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.(co|in)/);
    if (match) {
      data.SUPABASE_PROJECT_ID = match[1];
    }
  }
  return data;
});

export type SupabaseConfig = z.infer<typeof supabaseSchema>;