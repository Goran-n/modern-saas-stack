import { OAuthProvider } from "./base";
import type { OAuthTokens } from "../types";

export class GoogleOAuthProvider extends OAuthProvider {
  get name(): string {
    return "google";
  }

  get displayName(): string {
    return "Google";
  }

  get icon(): string {
    return "logos:google-icon";
  }

  get authorizationUrl(): string {
    return "https://accounts.google.com/o/oauth2/v2/auth";
  }

  get tokenUrl(): string {
    return "https://oauth2.googleapis.com/token";
  }

  override buildAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.config.scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent", // Force consent to get refresh token
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
    
    return result;
  }

  override async getUserInfo(accessToken: string): Promise<{
    id: string;
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
  }> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const data = await response.json() as {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
      locale?: string;
      verified_email?: boolean;
    };

    const result: {
      id: string;
      email?: string;
      name?: string;
      metadata?: Record<string, any>;
    } = {
      id: data.id,
    };
    
    if (data.email) {
      result.email = data.email;
    }
    if (data.name) {
      result.name = data.name;
    }
    
    const metadata: Record<string, any> = {};
    if (data.picture) metadata.picture = data.picture;
    if (data.locale) metadata.locale = data.locale;
    if (data.verified_email !== undefined) metadata.verified_email = data.verified_email;
    
    if (Object.keys(metadata).length > 0) {
      result.metadata = metadata;
    }
    
    return result;
  }

  override async revokeTokens(accessToken: string): Promise<void> {
    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
      { method: "POST" },
    );

    if (!response.ok && response.status !== 400) {
      // 400 means token was already revoked
      throw new Error("Failed to revoke token");
    }
  }
}

// Gmail-specific provider that extends Google
export class GmailOAuthProvider extends GoogleOAuthProvider {
  override get name(): string {
    return "gmail";
  }

  override get displayName(): string {
    return "Gmail";
  }

  override get icon(): string {
    return "logos:google-gmail";
  }

  override get supportsWebhooks(): boolean {
    return true;
  }

  override async subscribeToWebhook(
    accessToken: string,
    _webhookUrl: string,
  ): Promise<string> {
    // Gmail uses Google Pub/Sub for push notifications
    // This is a simplified example - real implementation would set up Pub/Sub
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/watch",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicName: "projects/your-project/topics/gmail-push",
          labelIds: ["INBOX"],
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to subscribe to Gmail webhook");
    }

    const data = await response.json() as { historyId: string };
    return data.historyId;
  }
}