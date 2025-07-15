import { z } from 'zod';

/**
 * Portkey AI Gateway configuration environment variables schema
 */
export const portkeySchema = z.object({
  /**
   * Portkey API key for authentication
   * @optional - only required when using document extraction
   */
  PORTKEY_API_KEY: z.string().optional(),
  
  /**
   * Portkey base URL (optional, defaults to https://api.portkey.ai/v1)
   * @optional
   */
  PORTKEY_BASE_URL: z.string().url().optional().default('https://api.portkey.ai/v1'),
  
  /**
   * Portkey mode - gateway or proxy
   * @optional
   * @default 'gateway'
   */
  PORTKEY_MODE: z.enum(['gateway', 'proxy']).optional().default('gateway'),
  
  /**
   * Virtual key for the AI provider (configured in Portkey dashboard)
   * @optional
   */
  PORTKEY_VIRTUAL_KEY: z.string().optional(),
  
  /**
   * Config ID for saved configurations in Portkey
   * @optional
   */
  PORTKEY_CONFIG_ID: z.string().optional(),
  
  /**
   * Enable request tracing
   * @optional
   * @default true
   */
  PORTKEY_TRACE_REQUESTS: z.boolean().optional().default(true),
  
  /**
   * Custom metadata to attach to all requests
   * @optional
   */
  PORTKEY_METADATA: z.string().optional(), // JSON string
});

export type PortkeyConfig = z.infer<typeof portkeySchema>;