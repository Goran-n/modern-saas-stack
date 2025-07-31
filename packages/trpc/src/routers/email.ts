import { 
  createEmailProvider,
  encryptionService,
  EmailProvider,
  ConnectionStatus,
} from "@figgy/email-ingestion";
import type { IEmailProvider } from "@figgy/email-ingestion";
import {
  and,
  count,
  desc,
  eq,
  emailConnections,
  emailProcessingLog,
  emailRateLimits,
  type EmailConnection,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

// Create admin procedure for email operations
const adminProcedure = tenantProcedure;

const logger = createLogger("email-router");

// Input schemas
const createConnectionSchema = z.object({
  provider: z.enum(["gmail", "outlook", "imap"]),
  emailAddress: z.string().email(),
  folderFilter: z.array(z.string()).default(["INBOX"]),
  senderFilter: z.array(z.string()).default([]),
  subjectFilter: z.array(z.string()).default([]),
});

const updateConnectionSchema = z.object({
  connectionId: z.string().uuid(),
  folderFilter: z.array(z.string()).optional(),
  senderFilter: z.array(z.string()).optional(),
  subjectFilter: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const imapCredentialsSchema = z.object({
  connectionId: z.string().uuid(),
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  username: z.string(),
  password: z.string(),
});

const oauthCallbackSchema = z.object({
  provider: z.enum(["gmail", "outlook"]),
  code: z.string(),
  state: z.string(),
});

export const emailRouter = createTRPCRouter({
  /**
   * List email connections for the tenant
   */
  listConnections: tenantProcedure.query(async ({ ctx }) => {
    const connections = await ctx.db
      .select({
        id: emailConnections.id,
        provider: emailConnections.provider,
        emailAddress: emailConnections.emailAddress,
        status: emailConnections.status,
        lastSyncAt: emailConnections.lastSyncAt,
        lastError: emailConnections.lastError,
        folderFilter: emailConnections.folderFilter,
        senderFilter: emailConnections.senderFilter,
        subjectFilter: emailConnections.subjectFilter,
        webhookExpiresAt: emailConnections.webhookExpiresAt,
        createdAt: emailConnections.createdAt,
      })
      .from(emailConnections)
      .where(eq(emailConnections.tenantId, ctx.tenant.id))
      .orderBy(desc(emailConnections.createdAt));
    
    return connections;
  }),
  
  /**
   * Get a specific email connection
   */
  getConnection: tenantProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }
      
      // Don't expose encrypted tokens
      const { accessToken, refreshToken, imapPassword, ...safeConnection } = connection;
      
      return safeConnection;
    }),
  
  /**
   * Create a new email connection
   */
  createConnection: adminProcedure
    .input(createConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if connection already exists
      const existing = await ctx.db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.tenantId, ctx.tenant.id),
            eq(emailConnections.emailAddress, input.emailAddress)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email connection already exists for this address",
        });
      }
      
      // Create connection
      const [connection] = await ctx.db
        .insert(emailConnections)
        .values({
          tenantId: ctx.tenant.id,
          provider: input.provider,
          emailAddress: input.emailAddress,
          folderFilter: input.folderFilter,
          senderFilter: input.senderFilter,
          subjectFilter: input.subjectFilter,
          status: "inactive", // Starts inactive until authenticated
          createdBy: ctx.user.id,
        })
        .returning();
      
      // Create default rate limits
      await ctx.db
        .insert(emailRateLimits)
        .values({
          tenantId: ctx.tenant.id,
        })
        .onConflictDoNothing();
      
      if (!connection) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create email connection",
        });
      }
      
      logger.info("Created email connection", {
        connectionId: connection.id,
        provider: input.provider,
        emailAddress: input.emailAddress,
      });
      
      return {
        connectionId: connection.id,
        provider: connection.provider,
        needsAuth: true,
      };
    }),
  
  /**
   * Get OAuth URL for Gmail/Outlook
   */
  getOAuthUrl: adminProcedure
    .input(z.object({
      connectionId: z.string().uuid(),
      redirectUri: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }
      
      if (connection.provider === "imap") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "IMAP connections do not use OAuth",
        });
      }
      
      const providerType = connection.provider === "gmail" ? EmailProvider.GMAIL : 
                          connection.provider === "outlook" ? EmailProvider.OUTLOOK : 
                          EmailProvider.IMAP;
      const provider = createEmailProvider(providerType) as IEmailProvider & {
        getAuthUrl?: (redirectUri: string, state: string) => string;
      };
      
      if (!provider.getAuthUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Provider does not support OAuth",
        });
      }
      
      // Generate state with connection ID
      const state = encryptionService.encrypt(JSON.stringify({
        connectionId: connection.id,
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
      }));
      
      const authUrl = provider.getAuthUrl(input.redirectUri, state);
      
      return { authUrl };
    }),
  
  /**
   * Handle OAuth callback
   */
  handleOAuthCallback: adminProcedure
    .input(oauthCallbackSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Decrypt state
        const stateData = JSON.parse(encryptionService.decrypt(input.state));
        
        if (stateData.tenantId !== ctx.tenant.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invalid state",
          });
        }
        
        const [connection] = await ctx.db
          .select()
          .from(emailConnections)
          .where(eq(emailConnections.id, stateData.connectionId))
          .limit(1);
        
        if (!connection || connection.provider !== input.provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Email connection not found",
          });
        }
        
        const providerType = input.provider === "gmail" ? EmailProvider.GMAIL : 
                            input.provider === "outlook" ? EmailProvider.OUTLOOK : 
                            EmailProvider.IMAP;
        const provider = createEmailProvider(providerType) as IEmailProvider & {
          exchangeCodeForTokens?: (code: string, redirectUri: string) => Promise<any>;
          subscribeToWebhook?: (webhookUrl: string) => Promise<string>;
        };
        
        if (!provider.exchangeCodeForTokens) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Provider does not support OAuth",
          });
        }
        
        // Exchange code for tokens
        const redirectUri = `${process.env.BASE_URL}/api/email/oauth/callback`;
        const tokens = await provider.exchangeCodeForTokens(input.code, redirectUri);
        
        // Encrypt and store tokens
        await ctx.db
          .update(emailConnections)
          .set({
            accessToken: encryptionService.encrypt(tokens.accessToken),
            refreshToken: tokens.refreshToken 
              ? encryptionService.encrypt(tokens.refreshToken)
              : null,
            tokenExpiresAt: tokens.expiresAt,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(emailConnections.id, connection.id));
        
        // Set up webhook subscription if supported
        if (provider.subscribeToWebhook) {
          try {
            const webhookUrl = `${process.env.BASE_URL}/api/email/webhook/${input.provider}`;
            const subscriptionId = await provider.subscribeToWebhook(webhookUrl);
            
            await ctx.db
              .update(emailConnections)
              .set({
                webhookSubscriptionId: subscriptionId,
                webhookExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
              })
              .where(eq(emailConnections.id, connection.id));
          } catch (error) {
            logger.error("Failed to set up webhook", { error });
            // Don't fail the entire flow if webhook setup fails
          }
        }
        
        // Trigger initial sync
        await tasks.trigger("sync-email-connection", {
          connectionId: connection.id,
          triggeredBy: "manual",
        });
        
        return { success: true };
      } catch (error) {
        logger.error("OAuth callback failed", { error });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete OAuth flow",
        });
      }
    }),
  
  /**
   * Set IMAP credentials
   */
  setIMAPCredentials: adminProcedure
    .input(imapCredentialsSchema)
    .mutation(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }
      
      if (connection.provider !== "imap") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connection is not an IMAP connection",
        });
      }
      
      // Test connection before saving
      const provider = createEmailProvider(EmailProvider.IMAP);
      
      try {
        await provider.connect(
          {
            id: connection.id,
            tenantId: connection.tenantId,
            provider: EmailProvider.IMAP,
            emailAddress: connection.emailAddress,
            folderFilter: connection.folderFilter as string[],
            senderFilter: connection.senderFilter as string[],
            subjectFilter: connection.subjectFilter as string[],
            status: connection.status === "active" ? ConnectionStatus.ACTIVE :
                   connection.status === "inactive" ? ConnectionStatus.INACTIVE :
                   connection.status === "error" ? ConnectionStatus.ERROR :
                   ConnectionStatus.EXPIRED,
          },
          undefined,
          {
            host: input.host,
            port: input.port,
            username: input.username,
            password: input.password,
            tls: true,
          }
        );
        
        await provider.disconnect();
      } catch (error) {
        logger.error("IMAP connection test failed", { error });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to connect to IMAP server. Please check your credentials.",
        });
      }
      
      // Encrypt and store credentials
      await ctx.db
        .update(emailConnections)
        .set({
          imapHost: input.host,
          imapPort: input.port,
          imapUsername: input.username,
          imapPassword: encryptionService.encrypt(input.password),
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(emailConnections.id, connection.id));
      
      // Trigger initial sync
      await tasks.trigger("sync-email-connection", {
        connectionId: connection.id,
        triggeredBy: "manual",
      });
      
      return { success: true };
    }),
  
  /**
   * Update connection settings
   */
  updateConnection: adminProcedure
    .input(updateConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }
      
      const updates: Partial<EmailConnection> = {
        updatedAt: new Date(),
      };
      
      if (input.folderFilter !== undefined) {
        updates.folderFilter = input.folderFilter;
      }
      
      if (input.senderFilter !== undefined) {
        updates.senderFilter = input.senderFilter;
      }
      
      if (input.subjectFilter !== undefined) {
        updates.subjectFilter = input.subjectFilter;
      }
      
      if (input.status !== undefined) {
        updates.status = input.status;
      }
      
      await ctx.db
        .update(emailConnections)
        .set(updates)
        .where(eq(emailConnections.id, input.connectionId));
      
      return { success: true };
    }),
  
  /**
   * Delete email connection
   */
  deleteConnection: adminProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }
      
      // Unsubscribe from webhooks if applicable
      if (connection.webhookSubscriptionId && connection.provider !== "imap") {
        try {
          const providerType = connection.provider === "gmail" ? EmailProvider.GMAIL : 
                              connection.provider === "outlook" ? EmailProvider.OUTLOOK : 
                              EmailProvider.IMAP;
          const provider = createEmailProvider(providerType) as IEmailProvider & {
            unsubscribeFromWebhook?: (subscriptionId: string) => Promise<void>;
          };
          
          if (connection.accessToken && provider.unsubscribeFromWebhook) {
            const tokens: any = {
              accessToken: encryptionService.decrypt(connection.accessToken),
            };
            
            if (connection.refreshToken) {
              tokens.refreshToken = encryptionService.decrypt(connection.refreshToken);
            }
            
            await provider.connect(
              {
                id: connection.id,
                tenantId: connection.tenantId,
                provider: connection.provider === "gmail" ? EmailProvider.GMAIL : 
                        connection.provider === "outlook" ? EmailProvider.OUTLOOK : 
                        EmailProvider.IMAP,
                emailAddress: connection.emailAddress,
                folderFilter: connection.folderFilter as string[],
                senderFilter: connection.senderFilter as string[],
                subjectFilter: connection.subjectFilter as string[],
                status: connection.status === "active" ? ConnectionStatus.ACTIVE :
                   connection.status === "inactive" ? ConnectionStatus.INACTIVE :
                   connection.status === "error" ? ConnectionStatus.ERROR :
                   ConnectionStatus.EXPIRED,
              },
              tokens
            );
            
            await provider.unsubscribeFromWebhook(connection.webhookSubscriptionId);
            await provider.disconnect();
          }
        } catch (error) {
          logger.error("Failed to unsubscribe from webhook", { error });
          // Continue with deletion anyway
        }
      }
      
      // Delete connection (cascades to processing log)
      await ctx.db
        .delete(emailConnections)
        .where(eq(emailConnections.id, input.connectionId));
      
      return { success: true };
    }),
  
  /**
   * Get processing stats for a connection
   */
  getConnectionStats: tenantProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .select({ id: emailConnections.id })
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }
      
      // Get processing stats
      const [totalProcessedResult] = await ctx.db
        .select({ count: count() })
        .from(emailProcessingLog)
        .where(eq(emailProcessingLog.connectionId, input.connectionId));
      
      const [successfulCountResult] = await ctx.db
        .select({ count: count() })
        .from(emailProcessingLog)
        .where(and(
          eq(emailProcessingLog.connectionId, input.connectionId),
          eq(emailProcessingLog.processingStatus, "completed")
        ));
      
      const [failedCountResult] = await ctx.db
        .select({ count: count() })
        .from(emailProcessingLog)
        .where(and(
          eq(emailProcessingLog.connectionId, input.connectionId),
          eq(emailProcessingLog.processingStatus, "failed")
        ));
      
      const stats = {
        totalProcessed: totalProcessedResult?.count || 0,
        successfulCount: successfulCountResult?.count || 0,
        failedCount: failedCountResult?.count || 0,
      };
      
      // Get recent activity
      const recentActivity = await ctx.db
        .select({
          messageId: emailProcessingLog.messageId,
          subject: emailProcessingLog.subject,
          fromAddress: emailProcessingLog.fromAddress,
          emailDate: emailProcessingLog.emailDate,
          processingStatus: emailProcessingLog.processingStatus,
          processedAt: emailProcessingLog.processedAt,
          attachmentCount: emailProcessingLog.attachmentCount,
          fileIds: emailProcessingLog.fileIds,
        })
        .from(emailProcessingLog)
        .where(eq(emailProcessingLog.connectionId, input.connectionId))
        .orderBy(desc(emailProcessingLog.emailDate))
        .limit(20);
      
      return {
        stats,
        recentActivity,
      };
    }),
  
  /**
   * Trigger manual sync
   */
  syncConnection: adminProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .select({ 
          id: emailConnections.id,
          status: emailConnections.status,
        })
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }
      
      if (connection.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email connection is not active",
        });
      }
      
      const job = await tasks.trigger("sync-email-connection", {
        connectionId: connection.id,
        triggeredBy: "manual",
      });
      
      return {
        success: true,
        jobId: job.id,
      };
    }),
});