import type { OAuthProviderConfig, OAuthTokens } from "../types";

/**
 * Base OAuth provider interface
 * All OAuth providers must implement this interface
 */
export abstract class OAuthProvider {
  constructor(protected config: OAuthProviderConfig) {}

  /**
   * Provider identifier (e.g., "gmail", "slack", "github")
   */
  abstract get name(): string;

  /**
   * Display name for UI (e.g., "Gmail", "Slack", "GitHub")
   */
  abstract get displayName(): string;

  /**
   * Provider icon name for UI
   */
  abstract get icon(): string;

  /**
   * OAuth authorization endpoint
   */
  abstract get authorizationUrl(): string;

  /**
   * OAuth token exchange endpoint
   */
  abstract get tokenUrl(): string;

  /**
   * Default scopes for this provider
   */
  get defaultScopes(): string[] {
    return this.config.scopes;
  }

  /**
   * Build the authorization URL for OAuth flow
   */
  buildAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.config.scopes.join(" "),
      state,
      ...this.config.additionalParams,
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  abstract exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens>;

  /**
   * Refresh access token using refresh token
   * Not all providers support this
   */
  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error(`${this.name} provider does not support token refresh`);
  }

  /**
   * Revoke tokens (optional)
   */
  async revokeTokens(_accessToken: string, _refreshToken?: string): Promise<void> {
    // Default: no-op, providers can override
  }

  /**
   * Get user info from provider (optional)
   */
  async getUserInfo(_accessToken: string): Promise<{
    id: string;
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
  }> {
    throw new Error(`${this.name} provider does not support user info`);
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Validate scopes (optional)
   */
  validateScopes(_requestedScopes: string[]): boolean {
    // By default, all scopes are valid
    return true;
  }

  /**
   * Provider supports webhooks/subscriptions
   */
  get supportsWebhooks(): boolean {
    return false;
  }

  /**
   * Subscribe to webhooks (optional)
   */
  async subscribeToWebhook(
    _accessToken: string,
    _webhookUrl: string,
  ): Promise<string | undefined> {
    return undefined;
  }

  /**
   * Unsubscribe from webhooks (optional)
   */
  async unsubscribeFromWebhook(
    _accessToken: string,
    _subscriptionId: string,
  ): Promise<void> {
    // Default: no-op
  }

  /**
   * Helper to make OAuth token requests
   */
  protected async makeTokenRequest(
    url: string,
    params: Record<string, string>,
  ): Promise<any> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token request failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Calculate token expiry date
   */
  protected calculateExpiresAt(expiresIn?: number): Date | undefined {
    if (!expiresIn) return undefined;
    return new Date(Date.now() + expiresIn * 1000);
  }
}