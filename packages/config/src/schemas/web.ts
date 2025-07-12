import { z } from 'zod';

/**
 * Web application environment variables schema
 */
export const webSchema = z.object({
  /**
   * Web application port
   * @default 4000
   */
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  
  /**
   * API service URL for the web application
   * @default 'http://localhost:5001'
   */
  API_URL: z.string().url().default('http://localhost:5001'),
  
  /**
   * Enable development mode features
   * @default true when NODE_ENV is 'development'
   */
  DEV_MODE: z.coerce.boolean().optional(),
});

export type WebConfig = z.infer<typeof webSchema>;