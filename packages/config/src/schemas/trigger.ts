import { z } from 'zod';

/**
 * Trigger.dev configuration environment variables schema
 */
export const triggerSchema = z.object({
  /**
   * Trigger.dev project ID
   * @required
   */
  TRIGGER_PROJECT_ID: z.string().min(1, 'TRIGGER_PROJECT_ID is required'),
  
  /**
   * Trigger.dev API key
   * @required
   */
  TRIGGER_API_KEY: z.string().min(1, 'TRIGGER_API_KEY is required'),
  
  /**
   * Trigger.dev API URL
   * @optional
   * @default 'https://api.trigger.dev'
   */
  TRIGGER_API_URL: z.string().url().optional(),
  
  /**
   * Trigger.dev access token (for CI/CD)
   * @optional
   */
  TRIGGER_ACCESS_TOKEN: z.string().optional(),
});

export type TriggerConfig = z.infer<typeof triggerSchema>;