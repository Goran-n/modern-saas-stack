import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure, publicProcedure } from "../trpc/procedures";
import {
  getOAuthProviderRegistry,
  getOAuthEncryptionService,
} from "@figgy/oauth";
import {
  oauthConnections,
} from "@figgy/shared-db/schemas";
import { eq, and } from "drizzle-orm";
import { isWithinExpirationDate } from "oslo";
import { logger } from "@figgy/utils";

/**
 * Generic OAuth router for managing all OAuth integrations
 */
export const oauthRouter = createTRPCRouter({
  /**
   * Get available OAuth providers
   */
  getAvailableProviders: tenantProcedure.query(async ({ ctx }) => {
    const registry = getOAuthProviderRegistry();
    const providers = registry.getAvailableProviders();

    // Get existing connections for the user
    const existingConnections = await ctx.db
      .select({
        provider: oauthConnections.provider,
        status: oauthConnections.status,
        accountEmail: oauthConnections.accountEmail,
        lastError: oauthConnections.lastError,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.tenantId, ctx.tenant.id),
          eq(oauthConnections.userId, ctx.user.id),
        ),
      );

    // Merge provider info with connection status
    return providers.map((provider) => {
      const connection = existingConnections.find(
        (conn) => conn.provider === provider.name,
      );
      
      return {
        ...provider,
        connected: !!connection,
        connectionStatus: connection?.status,
        accountEmail: connection?.accountEmail || undefined,
        lastError: connection?.lastError || undefined,
      };
    });
  }),

  /**
   * Get existing OAuth connections
   */
  getConnections: tenantProcedure
    .input(
      z.object({
        provider: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(oauthConnections.tenantId, ctx.tenant.id),
        eq(oauthConnections.userId, ctx.user.id),
      ];

      if (input?.provider) {
        conditions.push(eq(oauthConnections.provider, input.provider));
      }

      const connections = await ctx.db
        .select({
          id: oauthConnections.id,
          provider: oauthConnections.provider,
          accountId: oauthConnections.accountId,
          accountEmail: oauthConnections.accountEmail,
          displayName: oauthConnections.displayName,
          status: oauthConnections.status,
          scopes: oauthConnections.scopes,
          lastError: oauthConnections.lastError,
          createdAt: oauthConnections.createdAt,
          lastUsedAt: oauthConnections.lastUsedAt,
        })
        .from(oauthConnections)
        .where(and(...conditions));

      return connections.map(conn => ({
        ...conn,
        accountEmail: conn.accountEmail || undefined,
        displayName: conn.displayName || undefined,
        lastError: conn.lastError || undefined,
        createdAt: conn.createdAt.toISOString(),
        lastUsedAt: conn.lastUsedAt?.toISOString() || undefined,
      }));
    }),

  /**
   * Initiate OAuth flow
   */
  initiateOAuth: tenantProcedure
    .input(
      z.object({
        provider: z.string(),
        redirectUrl: z.string().url(),
        additionalScopes: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registry = getOAuthProviderRegistry();
      const provider = registry.getOrThrow(input.provider);
      const encryptionService = getOAuthEncryptionService();

      // Check if connection already exists
      const existingConnection = await ctx.db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.tenantId, ctx.tenant.id),
            eq(oauthConnections.userId, ctx.user.id),
            eq(oauthConnections.provider, input.provider),
          ),
        )
        .limit(1);

      // Create or update connection record with pending status
      let connectionId: string;
      if (existingConnection.length > 0 && existingConnection[0]) {
        connectionId = existingConnection[0].id;
        await ctx.db
          .update(oauthConnections)
          .set({
            status: "pending",
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(oauthConnections.id, connectionId));
      } else {
        const [newConnection] = await ctx.db
          .insert(oauthConnections)
          .values({
            tenantId: ctx.tenant.id,
            userId: ctx.user.id,
            provider: input.provider,
            accountId: "pending", // Will be updated after OAuth
            accessToken: "pending", // Will be updated after OAuth
            status: "pending",
            scopes: provider.defaultScopes.concat(input.additionalScopes || []),
          })
          .returning({ id: oauthConnections.id });
        
        if (!newConnection) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create OAuth connection",
          });
        }
        connectionId = newConnection.id;
      }

      // Encrypt state parameter
      const state = encryptionService.encryptState({
        connectionId,
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        provider: input.provider,
        redirectUrl: input.redirectUrl,
      });

      // Build authorization URL
      const authUrl = provider.buildAuthUrl(input.redirectUrl, state);

      return {
        authUrl,
        connectionId,
      };
    }),

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        state: z.string(),
        error: z.string().optional(),
        error_description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Handle OAuth errors
      if (input.error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: input.error_description || input.error,
        });
      }

      const encryptionService = getOAuthEncryptionService();
      const registry = getOAuthProviderRegistry();

      // Decrypt and validate state
      let stateData;
      try {
        logger.debug("OAuth callback: Attempting to decrypt state", {
          stateLength: input.state.length,
          statePreview: input.state.substring(0, 50) + "...",
        });
        stateData = encryptionService.decryptState(input.state);
        logger.debug("OAuth callback: State decrypted successfully", {
          hasConnectionId: !!stateData.connectionId,
          provider: stateData.provider,
          hasRedirectUrl: !!stateData.redirectUrl,
        });
      } catch (error) {
        logger.error("OAuth callback: State decryption failed", {
          error: error instanceof Error ? error.message : error,
          stateParam: input.state.substring(0, 50) + "...",
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired state parameter",
        });
      }

      const { connectionId, provider: providerName, redirectUrl } = stateData;

      logger.debug("OAuth callback state data:", {
        connectionId,
        providerName,
        redirectUrl,
      });

      // Get provider
      const provider = registry.getOrThrow(providerName);

      try {
        // Exchange code for tokens - MUST use the same redirect URL that was used during authorization
        const tokens = await provider.exchangeCodeForTokens(input.code, redirectUrl);

        // Get user info from provider
        const userInfo = await provider.getUserInfo(tokens.accessToken);

        // Encrypt tokens
        const encryptedAccessToken = encryptionService.encrypt(tokens.accessToken);
        const encryptedRefreshToken = tokens.refreshToken
          ? encryptionService.encrypt(tokens.refreshToken)
          : null;

        // Update connection with tokens and user info
        await ctx.db
          .update(oauthConnections)
          .set({
            accountId: userInfo.id,
            accountEmail: userInfo.email,
            displayName: userInfo.name,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: tokens.expiresAt,
            status: "active",
            lastError: null,
            metadata: {
              ...(userInfo.metadata || {}),
              // Store email-specific configuration for email providers
              ...(providerName === 'gmail' || providerName === 'outlook' ? {
                folderFilter: ['INBOX'],
                senderFilter: [],
                subjectFilter: [],
                isEmailProvider: true
              } : {})
            },
            updatedAt: new Date(),
          })
          .where(eq(oauthConnections.id, connectionId));

        // If provider supports webhooks, set them up
        if (provider.supportsWebhooks && provider.subscribeToWebhook) {
          try {
            // Get BASE_URL from configuration
            const { getConfig } = await import("@figgy/config");
            const config = getConfig().getCore();
            const baseUrl = config.BASE_URL;
            
            if (!baseUrl) {
              logger.error("BASE_URL not configured, skipping webhook subscription");
              throw new Error("BASE_URL configuration is required for webhooks");
            }
            
            const webhookUrl = `${baseUrl}/api/oauth/webhook/${providerName}`;
            logger.info("Setting up webhook subscription:", {
              provider: providerName,
              webhookUrl,
              connectionId,
            });
            
            const webhookId = await provider.subscribeToWebhook(
              tokens.accessToken,
              webhookUrl,
            );

            await ctx.db
              .update(oauthConnections)
              .set({
                webhookId,
                webhookExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000), // 3 days minus 1 minute
                updatedAt: new Date(),
              })
              .where(eq(oauthConnections.id, connectionId));
              
            console.log("Webhook subscription successful:", {
              provider: providerName,
              webhookId,
              connectionId,
            });
          } catch (error) {
            console.error("Failed to subscribe to webhook:", {
              error: error instanceof Error ? error.message : error,
              provider: providerName,
              connectionId,
            });
            // Store error but don't fail the OAuth flow
            await ctx.db
              .update(oauthConnections)
              .set({
                lastError: `Webhook setup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                updatedAt: new Date(),
              })
              .where(eq(oauthConnections.id, connectionId));
          }
        }

        return {
          success: true,
          connectionId,
          provider: providerName,
        };
      } catch (error) {
        console.error("OAuth callback error details:", {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          provider: providerName,
          connectionId,
          redirectUrl,
        });

        // Update connection with error status
        await ctx.db
          .update(oauthConnections)
          .set({
            status: "error",
            lastError: error instanceof Error ? error.message : "OAuth flow failed",
            updatedAt: new Date(),
          })
          .where(eq(oauthConnections.id, connectionId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to complete OAuth flow",
          cause: error,
        });
      }
    }),

  /**
   * Revoke OAuth connection
   */
  revokeConnection: tenantProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registry = getOAuthProviderRegistry();
      const encryptionService = getOAuthEncryptionService();

      // Get connection
      const [connection] = await ctx.db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.id, input.connectionId),
            eq(oauthConnections.tenantId, ctx.tenant.id),
            eq(oauthConnections.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      const provider = registry.getOrThrow(connection.provider);

      // Revoke tokens if provider supports it
      if (provider.revokeTokens && connection.status === "active") {
        try {
          const accessToken = encryptionService.decrypt(connection.accessToken);
          await provider.revokeTokens(accessToken);
        } catch (error) {
          console.error("Failed to revoke tokens:", error);
          // Continue with deletion even if revocation fails
        }
      }

      // Delete the connection
      await ctx.db
        .delete(oauthConnections)
        .where(eq(oauthConnections.id, input.connectionId));

      return { success: true };
    }),

  /**
   * Refresh OAuth tokens (can be called manually or by cron)
   */
  refreshToken: tenantProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registry = getOAuthProviderRegistry();
      const encryptionService = getOAuthEncryptionService();

      // Get connection
      const [connection] = await ctx.db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.id, input.connectionId),
            eq(oauthConnections.tenantId, ctx.tenant.id),
            eq(oauthConnections.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (!connection.refreshToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No refresh token available",
        });
      }

      const provider = registry.getOrThrow(connection.provider);

      try {
        // Decrypt refresh token
        const refreshToken = encryptionService.decrypt(connection.refreshToken);

        // Refresh tokens
        const newTokens = await provider.refreshAccessToken(refreshToken);

        // Encrypt new tokens
        const encryptedAccessToken = encryptionService.encrypt(newTokens.accessToken);
        const encryptedRefreshToken = newTokens.refreshToken
          ? encryptionService.encrypt(newTokens.refreshToken)
          : connection.refreshToken;

        // Update connection
        await ctx.db
          .update(oauthConnections)
          .set({
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: newTokens.expiresAt,
            status: "active",
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(oauthConnections.id, input.connectionId));

        return { success: true };
      } catch (error) {
        // Update connection with error status
        await ctx.db
          .update(oauthConnections)
          .set({
            status: "expired",
            lastError: error instanceof Error ? error.message : "Token refresh failed",
            updatedAt: new Date(),
          })
          .where(eq(oauthConnections.id, input.connectionId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to refresh token",
          cause: error,
        });
      }
    }),

  /**
   * Get decrypted access token for a connection (internal use)
   */
  getAccessToken: tenantProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const encryptionService = getOAuthEncryptionService();

      // Get connection
      const [connection] = await ctx.db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.id, input.connectionId),
            eq(oauthConnections.tenantId, ctx.tenant.id),
            eq(oauthConnections.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (connection.status !== "active") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Connection is ${connection.status}`,
        });
      }

      // Check if token needs refresh
      if (
        connection.tokenExpiresAt &&
        !isWithinExpirationDate(connection.tokenExpiresAt)
      ) {
        // Token expired, try to refresh
        if (connection.refreshToken) {
          await oauthRouter
            .createCaller(ctx)
            .refreshToken({ connectionId: input.connectionId });
          
          // Re-fetch the updated connection
          const [refreshedConnection] = await ctx.db
            .select()
            .from(oauthConnections)
            .where(eq(oauthConnections.id, input.connectionId))
            .limit(1);
          
          if (!refreshedConnection) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch refreshed connection",
            });
          }
          
          return {
            accessToken: encryptionService.decrypt(refreshedConnection.accessToken),
            provider: refreshedConnection.provider,
          };
        } else {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Token expired and no refresh token available",
          });
        }
      }

      // Update last used timestamp
      await ctx.db
        .update(oauthConnections)
        .set({ lastUsedAt: new Date() })
        .where(eq(oauthConnections.id, input.connectionId));

      return {
        accessToken: encryptionService.decrypt(connection.accessToken),
        provider: connection.provider,
      };
    }),
});