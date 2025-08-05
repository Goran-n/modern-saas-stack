import { z } from "zod";

/**
 * OAuth token response from provider
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

/**
 * OAuth connection status
 */
export enum OAuthConnectionStatus {
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
  EXPIRED = "expired",
}

/**
 * OAuth connection metadata stored in database
 */
export interface OAuthConnection {
  id: string;
  tenantId: string;
  userId: string;
  provider: string;
  accountId: string;
  accountEmail?: string;
  displayName?: string;
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  tokenExpiresAt?: Date;
  scopes: string[];
  status: OAuthConnectionStatus;
  webhookId?: string;
  webhookExpiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
}

/**
 * OAuth error types
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

/**
 * State parameter data encrypted in OAuth flow
 */
export const oauthStateSchema = z.object({
  connectionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.string(),
  redirectUri: z.string().url(),
  timestamp: z.number(),
});

export type OAuthState = z.infer<typeof oauthStateSchema>;