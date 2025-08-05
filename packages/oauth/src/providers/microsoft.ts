import { OAuthProvider } from "./base";
import type { OAuthProviderConfig, OAuthTokens } from "../types";

interface MicrosoftOAuthConfig extends OAuthProviderConfig {
  tenantId?: string;
}

export class MicrosoftOAuthProvider extends OAuthProvider {
  protected declare config: MicrosoftOAuthConfig;

  constructor(config: MicrosoftOAuthConfig) {
    super(config);
  }

  get name(): string {
    return "microsoft";
  }

  get displayName(): string {
    return "Microsoft";
  }

  get icon(): string {
    return "logos:microsoft-icon";
  }

  get authorizationUrl(): string {
    const tenantId = this.config.tenantId || "common";
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
  }

  get tokenUrl(): string {
    const tenantId = this.config.tenantId || "common";
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
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

  override async getUserInfo(accessToken: string): Promise<{
    id: string;
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
  }> {
    console.log("Microsoft getUserInfo: Fetching user profile from Graph API");
    
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Microsoft getUserInfo failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      id: string;
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
      jobTitle?: string;
      officeLocation?: string;
      preferredLanguage?: string;
    };

    const result: {
      id: string;
      email?: string;
      name?: string;
      metadata?: Record<string, any>;
    } = {
      id: data.id,
    };
    
    const email = data.mail || data.userPrincipalName;
    if (email) {
      result.email = email;
    }
    if (data.displayName) {
      result.name = data.displayName;
    }
    
    const metadata: Record<string, any> = {};
    if (data.jobTitle) metadata.jobTitle = data.jobTitle;
    if (data.officeLocation) metadata.officeLocation = data.officeLocation;
    if (data.preferredLanguage) metadata.preferredLanguage = data.preferredLanguage;
    
    if (Object.keys(metadata).length > 0) {
      result.metadata = metadata;
    }
    
    return result;
  }
}

// Outlook-specific provider that extends Microsoft
export class OutlookOAuthProvider extends MicrosoftOAuthProvider {
  override get name(): string {
    return "outlook";
  }

  override get displayName(): string {
    return "Outlook";
  }

  override get icon(): string {
    return "logos:microsoft-outlook";
  }

  override get supportsWebhooks(): boolean {
    return false; // Temporarily disabled until proper webhook infrastructure is in place
  }

  override async subscribeToWebhook(
    accessToken: string,
    webhookUrl: string,
  ): Promise<string> {
    // Generate a unique client state for security
    const clientState = Buffer.from(
      `outlook-webhook-${Date.now()}-${Math.random()}`
    ).toString('base64').substring(0, 128);
    
    const subscriptionPayload = {
      changeType: "created",
      notificationUrl: webhookUrl,
      resource: "me/mailFolders('Inbox')/messages",
      expirationDateTime: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000, // 3 days minus 1 minute (max allowed)
      ).toISOString(),
      clientState,
    };
    
    console.log("Creating Outlook webhook subscription:", {
      webhookUrl,
      resource: subscriptionPayload.resource,
      expirationDateTime: subscriptionPayload.expirationDateTime,
    });
    
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/subscriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionPayload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }
      
      console.error("Outlook webhook subscription failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
        webhookUrl,
      });
      
      // Provide more specific error messages
      if (response.status === 400 && errorDetails.error?.message?.includes("validation")) {
        throw new Error(
          `Webhook URL validation failed. Ensure the webhook endpoint is publicly accessible and returns the validation token. URL: ${webhookUrl}`
        );
      }
      
      throw new Error(
        `Failed to subscribe to Outlook webhook: ${response.status} ${response.statusText} - ${
          errorDetails.error?.message || errorDetails.message || "Unknown error"
        }`
      );
    }

    const data = await response.json() as { 
      id: string;
      resource: string;
      changeType: string;
      expirationDateTime: string;
    };
    
    console.log("Outlook webhook subscription created:", {
      subscriptionId: data.id,
      resource: data.resource,
      changeType: data.changeType,
      expirationDateTime: data.expirationDateTime,
    });
    
    return data.id;
  }

  override async unsubscribeFromWebhook(
    accessToken: string,
    subscriptionId: string,
  ): Promise<void> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to unsubscribe from webhook");
    }
  }
}