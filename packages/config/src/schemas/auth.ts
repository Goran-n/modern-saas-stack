import { z } from 'zod';

/**
 * Authentication environment variables schema
 */
export const authSchema = z.object({
  /**
   * JWT secret for token signing and verification
   * @required
   * @minimum 32 characters for security
   */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  
  /**
   * JWT token expiration time
   * @default '7d'
   */
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  /**
   * Refresh token expiration time
   * @default '30d'
   */
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
});

export type AuthConfig = z.infer<typeof authSchema>;