import { getConfig } from "@figgy/config";
import { OAuthProvider } from "./base";
import { GmailOAuthProvider, GoogleOAuthProvider } from "./google";
import { MicrosoftOAuthProvider, OutlookOAuthProvider } from "./microsoft";
import { SlackOAuthProvider } from "./slack";

/**
 * Registry of available OAuth providers
 */
export class OAuthProviderRegistry {
  private providers: Map<string, OAuthProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  /**
   * Register default providers based on configuration
   */
  private registerDefaultProviders(): void {
    const config = getConfig().getCore();

    // Google OAuth
    if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
      this.register(
        new GoogleOAuthProvider({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
        }),
      );

      // Gmail (extends Google with email-specific scopes)
      this.register(
        new GmailOAuthProvider({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          scopes: [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "email",
            "profile",
          ],
        }),
      );
    }

    // Microsoft OAuth
    if (
      config.MICROSOFT_CLIENT_ID &&
      config.MICROSOFT_CLIENT_SECRET &&
      config.MICROSOFT_TENANT_ID
    ) {
      this.register(
        new MicrosoftOAuthProvider({
          clientId: config.MICROSOFT_CLIENT_ID,
          clientSecret: config.MICROSOFT_CLIENT_SECRET,
          tenantId: config.MICROSOFT_TENANT_ID,
          scopes: ["openid", "email", "profile", "offline_access"],
        }),
      );

      // Outlook (extends Microsoft with mail-specific scopes)
      this.register(
        new OutlookOAuthProvider({
          clientId: config.MICROSOFT_CLIENT_ID,
          clientSecret: config.MICROSOFT_CLIENT_SECRET,
          tenantId: config.MICROSOFT_TENANT_ID,
          scopes: [
            "openid",
            "https://graph.microsoft.com/User.Read",
            "https://graph.microsoft.com/Mail.Read",
            "https://graph.microsoft.com/Mail.ReadWrite",
            "email",
            "profile",
            "offline_access",
          ],
        }),
      );
    }

    // Slack OAuth
    if (config.SLACK_CLIENT_ID && config.SLACK_CLIENT_SECRET) {
      this.register(
        new SlackOAuthProvider({
          clientId: config.SLACK_CLIENT_ID,
          clientSecret: config.SLACK_CLIENT_SECRET,
          scopes: [
            "channels:read",
            "chat:write",
            "files:write",
            "users:read",
            "users:read.email",
            "team:read",
          ],
        }),
      );
    }
  }

  /**
   * Register a provider
   */
  register(provider: OAuthProvider): void {
    if (!provider.isConfigured()) {
      throw new Error(
        `Provider ${provider.name} is not properly configured`,
      );
    }
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name
   */
  get(name: string): OAuthProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get a provider by name (throws if not found)
   */
  getOrThrow(name: string): OAuthProvider {
    const provider = this.get(name);
    if (!provider) {
      throw new Error(`OAuth provider '${name}' not found`);
    }
    return provider;
  }

  /**
   * Check if a provider exists
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all available providers
   */
  getAll(): OAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get available provider info for UI
   */
  getAvailableProviders(): Array<{
    name: string;
    displayName: string;
    icon: string;
    available: boolean;
  }> {
    return this.getAll().map((provider) => ({
      name: provider.name,
      displayName: provider.displayName,
      icon: provider.icon,
      available: provider.isConfigured(),
    }));
  }
}

// Singleton instance
let registry: OAuthProviderRegistry | null = null;

/**
 * Get the OAuth provider registry instance
 */
export function getOAuthProviderRegistry(): OAuthProviderRegistry {
  if (!registry) {
    registry = new OAuthProviderRegistry();
  }
  return registry;
}