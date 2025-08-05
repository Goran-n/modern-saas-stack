import { OAuthProvider } from "./base";
import type { OAuthTokens } from "../types";

export class HmrcOAuthProvider extends OAuthProvider {
  get name(): string {
    return "hmrc";
  }

  get displayName(): string {
    return "HMRC";
  }

  get icon(): string {
    return "noto:flag-united-kingdom"; // UK flag icon
  }

  get authorizationUrl(): string {
    // Use sandbox URL for development, production URL will be different
    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://api.service.hmrc.gov.uk"
      : "https://test-api.service.hmrc.gov.uk";
    return `${baseUrl}/oauth/authorize`;
  }

  get tokenUrl(): string {
    // Use sandbox URL for development, production URL will be different
    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://api.service.hmrc.gov.uk"
      : "https://test-api.service.hmrc.gov.uk";
    return `${baseUrl}/oauth/token`;
  }

  override buildAuthUrl(redirectUri: string, state: string): string {
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

  override async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens> {
    const response = await this.makeTokenRequest(this.tokenUrl, {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const result: OAuthTokens = {
      accessToken: response.access_token,
    };
    
    if (response.refresh_token) {
      result.refreshToken = response.refresh_token;
    }
    if (response.expires_in) {
      result.expiresIn = response.expires_in;
      const expiresAt = this.calculateExpiresAt(response.expires_in);
      if (expiresAt) {
        result.expiresAt = expiresAt;
      }
    }
    if (response.token_type) {
      result.tokenType = response.token_type;
    }
    if (response.scope) {
      result.scope = response.scope;
    }
    
    return result;
  }

  override async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await this.makeTokenRequest(this.tokenUrl, {
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "refresh_token",
    });

    const result: OAuthTokens = {
      accessToken: response.access_token,
    };
    
    if (response.expires_in) {
      result.expiresIn = response.expires_in;
      const expiresAt = this.calculateExpiresAt(response.expires_in);
      if (expiresAt) {
        result.expiresAt = expiresAt;
      }
    }
    if (response.token_type) {
      result.tokenType = response.token_type;
    }
    if (response.scope) {
      result.scope = response.scope;
    }
    
    // HMRC doesn't return a new refresh token on refresh
    result.refreshToken = refreshToken;
    
    return result;
  }

  override async getUserInfo(accessToken: string): Promise<{
    id: string;
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
  }> {
    // HMRC doesn't provide a standard user info endpoint
    // We can use the Hello User endpoint for testing
    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://api.service.hmrc.gov.uk"
      : "https://test-api.service.hmrc.gov.uk";

    const response = await fetch(
      `${baseUrl}/hello/user`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.hmrc.1.0+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const data = await response.json() as {
      message?: string;
    };

    // HMRC doesn't provide standard user info, so we create a minimal response
    // The actual user identity comes from the OAuth flow itself
    return {
      id: "hmrc-user", // In production, this would be extracted from the token or API
      metadata: data,
    };
  }

  /**
   * Validate that requested scopes are valid for HMRC
   * Common scopes: read:vat, write:vat, read:self-assessment, etc.
   */
  override validateScopes(requestedScopes: string[]): boolean {
    const validScopes = [
      "read:vat",
      "write:vat",
      "read:self-assessment",
      "write:self-assessment",
      "read:corporation-tax",
      "write:corporation-tax",
      "read:paye",
      "write:paye",
      "read:national-insurance",
      "write:national-insurance",
      "hello", // Test scope
    ];

    return requestedScopes.every(scope => validScopes.includes(scope));
  }
}