import { OAuthProvider } from "./base";
import type { OAuthTokens } from "../types";

export class SlackOAuthProvider extends OAuthProvider {
  get name(): string {
    return "slack";
  }

  get displayName(): string {
    return "Slack";
  }

  get icon(): string {
    return "logos:slack-icon";
  }

  get authorizationUrl(): string {
    return "https://slack.com/oauth/v2/authorize";
  }

  get tokenUrl(): string {
    return "https://slack.com/api/oauth.v2.access";
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
    });

    if (!response.ok) {
      throw new Error(response.error || "Failed to exchange code for tokens");
    }

    // Slack returns tokens in a different structure
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
    result.tokenType = response.token_type || "Bearer";
    if (response.scope) {
      result.scope = response.scope;
    }
    
    return result;
  }

  override async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await this.makeTokenRequest(
      "https://slack.com/api/oauth.v2.access",
      {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
    );

    if (!response.ok) {
      throw new Error(response.error || "Failed to refresh token");
    }

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
    result.tokenType = response.token_type || "Bearer";
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
    // For Slack, we need to get both user and team info
    const [authTest, userInfo] = await Promise.all([
      this.makeSlackApiCall("auth.test", accessToken),
      this.makeSlackApiCall("users.identity", accessToken),
    ]);

    if (!authTest.ok || !userInfo.ok) {
      throw new Error("Failed to fetch user info");
    }

    return {
      id: authTest.user_id,
      email: userInfo.user?.email,
      name: userInfo.user?.name,
      metadata: {
        team_id: authTest.team_id,
        team_name: authTest.team,
        user: userInfo.user,
        team: userInfo.team,
      },
    };
  }

  override async revokeTokens(accessToken: string): Promise<void> {
    const response = await this.makeSlackApiCall(
      "auth.revoke",
      accessToken,
      "POST",
    );

    if (!response.ok) {
      throw new Error(response.error || "Failed to revoke token");
    }
  }

  override buildAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scopes.join(","), // Slack uses comma-separated scopes
      state,
      ...this.config.additionalParams,
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  private async makeSlackApiCall(
    method: string,
    token: string,
    httpMethod: "GET" | "POST" = "GET",
  ): Promise<any> {
    const url = `https://slack.com/api/${method}`;
    const options: RequestInit = {
      method: httpMethod,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Slack API call failed: ${response.statusText}`);
    }

    return response.json();
  }
}