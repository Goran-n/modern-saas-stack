import { getDb } from "@figgy/shared-db";
import { oauthConnections } from "@figgy/shared-db/schemas";
import { eq, and, lt, inArray } from "drizzle-orm";
import { isWithinExpirationDate } from "oslo";
import { getOAuthProviderRegistry } from "../providers/registry";
import { getOAuthEncryptionService } from "./encryption";

/**
 * Service for managing OAuth tokens
 */
export class OAuthTokenManager {
  private encryptionService = getOAuthEncryptionService();
  private providerRegistry = getOAuthProviderRegistry();

  /**
   * Refresh a single token if needed
   */
  async refreshTokenIfNeeded(connectionId: string): Promise<boolean> {
    const db = getDb();
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, connectionId))
      .limit(1);

    if (!connection) {
      throw new Error("Connection not found");
    }

    // Check if token needs refresh
    if (
      connection.tokenExpiresAt &&
      isWithinExpirationDate(connection.tokenExpiresAt)
    ) {
      // Token is still valid
      return false;
    }

    // Token expired, need to refresh
    if (!connection.refreshToken) {
      // No refresh token available, mark as expired
      const db = getDb();
      await db
        .update(oauthConnections)
        .set({
          status: "expired",
          lastError: "Token expired and no refresh token available",
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, connectionId));
      
      throw new Error("Token expired and no refresh token available");
    }

    const provider = this.providerRegistry.getOrThrow(connection.provider);

    try {
      // Decrypt refresh token
      const refreshToken = this.encryptionService.decrypt(connection.refreshToken);

      // Refresh tokens
      const newTokens = await provider.refreshAccessToken(refreshToken);

      // Encrypt new tokens
      const encryptedAccessToken = this.encryptionService.encrypt(
        newTokens.accessToken,
      );
      const encryptedRefreshToken = newTokens.refreshToken
        ? this.encryptionService.encrypt(newTokens.refreshToken)
        : connection.refreshToken;

      // Update connection
      await db
        .update(oauthConnections)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: newTokens.expiresAt,
          status: "active",
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, connectionId));

      return true;
    } catch (error) {
      // Update connection with error status
      await db
        .update(oauthConnections)
        .set({
          status: "expired",
          lastError:
            error instanceof Error ? error.message : "Token refresh failed",
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, connectionId));

      throw error;
    }
  }

  /**
   * Batch refresh tokens that are about to expire
   */
  async refreshExpiringTokens(
    expirationWindow = 5 * 60 * 1000, // 5 minutes
  ): Promise<{
    refreshed: string[];
    failed: string[];
  }> {
    const db = getDb();
    const expirationThreshold = new Date(Date.now() + expirationWindow);

    // Find connections with tokens expiring soon
    const expiringConnections = await db
      .select({
        id: oauthConnections.id,
        provider: oauthConnections.provider,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.status, "active"),
          lt(oauthConnections.tokenExpiresAt, expirationThreshold),
        ),
      );

    const refreshed: string[] = [];
    const failed: string[] = [];

    // Refresh tokens in parallel (with concurrency limit)
    const concurrencyLimit = 10;
    for (let i = 0; i < expiringConnections.length; i += concurrencyLimit) {
      const batch = expiringConnections.slice(i, i + concurrencyLimit);
      
      await Promise.all(
        batch.map(async (connection) => {
          try {
            await this.refreshTokenIfNeeded(connection.id);
            refreshed.push(connection.id);
          } catch (error) {
            console.error(
              `Failed to refresh token for connection ${connection.id}:`,
              error,
            );
            failed.push(connection.id);
          }
        }),
      );
    }

    return { refreshed, failed };
  }

  /**
   * Get a valid access token for a connection
   */
  async getValidAccessToken(
    connectionId: string,
    tenantId: string,
    userId: string,
  ): Promise<string> {
    const db = getDb();
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, connectionId),
          eq(oauthConnections.tenantId, tenantId),
          eq(oauthConnections.userId, userId),
        ),
      )
      .limit(1);

    if (!connection) {
      throw new Error("Connection not found");
    }

    if (connection.status !== "active") {
      throw new Error(`Connection is ${connection.status}`);
    }

    // Refresh if needed
    await this.refreshTokenIfNeeded(connectionId);

    // Re-fetch the potentially updated connection
    const [updatedConnection] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, connectionId))
      .limit(1);

    if (!updatedConnection) {
      throw new Error("Connection not found after update");
    }

    // Update last used timestamp
    await db
      .update(oauthConnections)
      .set({ lastUsedAt: new Date() })
      .where(eq(oauthConnections.id, connectionId));

    return this.encryptionService.decrypt(updatedConnection.accessToken);
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(connectionId: string): Promise<{
    healthy: boolean;
    status: string;
    error?: string;
  }> {
    const db = getDb();
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, connectionId))
      .limit(1);

    if (!connection) {
      return {
        healthy: false,
        status: "not_found",
        error: "Connection not found",
      };
    }

    if (connection.status !== "active") {
      const result: { healthy: boolean; status: string; error?: string } = {
        healthy: false,
        status: connection.status,
      };
      if (connection.lastError) {
        result.error = connection.lastError;
      }
      return result;
    }

    // Check if token is expired
    if (
      connection.tokenExpiresAt &&
      !isWithinExpirationDate(connection.tokenExpiresAt)
    ) {
      if (!connection.refreshToken) {
        return {
          healthy: false,
          status: "expired",
          error: "Token expired and no refresh token available",
        };
      }

      // Try to refresh
      try {
        await this.refreshTokenIfNeeded(connectionId);
        return {
          healthy: true,
          status: "active",
        };
      } catch (error) {
        return {
          healthy: false,
          status: "expired",
          error: error instanceof Error ? error.message : "Refresh failed",
        };
      }
    }

    return {
      healthy: true,
      status: "active",
    };
  }

  /**
   * Clean up expired connections
   */
  async cleanupExpiredConnections(
    daysToKeep = 30,
  ): Promise<{ deleted: number }> {
    const db = getDb();
    const cutoffDate = new Date(
      Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
    );

    await db
      .delete(oauthConnections)
      .where(
        and(
          inArray(oauthConnections.status, ["expired", "error"]),
          lt(oauthConnections.updatedAt, cutoffDate),
        ),
      );

    // Drizzle doesn't return rowCount in a consistent way
    return { deleted: 0 };
  }

  /**
   * Renew expiring webhooks
   */
  async renewExpiringWebhooks(
    expirationWindow = 12 * 60 * 60 * 1000, // 12 hours
  ): Promise<{
    renewed: string[];
    failed: string[];
  }> {
    const db = getDb();
    const expirationThreshold = new Date(Date.now() + expirationWindow);

    // Find connections with webhooks expiring soon
    const expiringWebhooks = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.status, "active"),
          lt(oauthConnections.webhookExpiresAt, expirationThreshold),
        ),
      );

    const renewed: string[] = [];
    const failed: string[] = [];

    for (const connection of expiringWebhooks) {
      const provider = this.providerRegistry.get(connection.provider);
      
      if (!provider?.supportsWebhooks || !provider.subscribeToWebhook) {
        continue;
      }

      try {
        // Get valid access token
        const accessToken = await this.getValidAccessToken(
          connection.id,
          connection.tenantId,
          connection.userId,
        );

        // Unsubscribe old webhook if exists
        if (connection.webhookId && provider.unsubscribeFromWebhook) {
          try {
            await provider.unsubscribeFromWebhook(
              accessToken,
              connection.webhookId,
            );
          } catch (error) {
            console.error("Failed to unsubscribe old webhook:", error);
          }
        }

        // Subscribe new webhook
        const webhookUrl = `${process.env.BASE_URL}/api/oauth/webhook/${connection.provider}`;
        const webhookId = await provider.subscribeToWebhook(
          accessToken,
          webhookUrl,
        );

        // Update connection
        await db
          .update(oauthConnections)
          .set({
            webhookId,
            webhookExpiresAt: new Date(
              Date.now() + 2 * 24 * 60 * 60 * 1000,
            ), // 2 days
            updatedAt: new Date(),
          })
          .where(eq(oauthConnections.id, connection.id));

        renewed.push(connection.id);
      } catch (error) {
        console.error(
          `Failed to renew webhook for connection ${connection.id}:`,
          error,
        );
        failed.push(connection.id);
      }
    }

    return { renewed, failed };
  }
}

// Singleton instance
let tokenManager: OAuthTokenManager | null = null;

/**
 * Get the OAuth token manager instance
 */
export function getOAuthTokenManager(): OAuthTokenManager {
  if (!tokenManager) {
    tokenManager = new OAuthTokenManager();
  }
  return tokenManager;
}