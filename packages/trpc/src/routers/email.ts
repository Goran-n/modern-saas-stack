import { 
  createEmailProvider,
  encryptionService,
  EmailProvider,
  ConnectionStatus,
} from "@figgy/email-ingestion";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  emailConnections,
  emailProcessingLog,
  emailRateLimits,
  type EmailConnection,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import { getConfig } from "@figgy/config";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { publicProcedure, tenantProcedure } from "../trpc/procedures";

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

export const emailRouter = createTRPCRouter({
  /**
   * Get available email providers based on configuration
   */
  getAvailableProviders: publicProcedure.query(async () => {
    const config = getConfig().getCore();
    
    return {
      gmail: {
        available: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
        name: "Gmail",
        description: "Connect your Gmail account",
      },
      outlook: {
        available: !!(config.MICROSOFT_CLIENT_ID && config.MICROSOFT_CLIENT_SECRET && config.MICROSOFT_TENANT_ID),
        name: "Outlook",
        description: "Connect your Outlook or Office 365 account",
      },
      imap: {
        available: true, // IMAP is always available as it doesn't require OAuth
        name: "IMAP",
        description: "Connect any email account with IMAP support",
      },
    };
  }),

  /**
   * List email connections for the tenant (including OAuth connections)
   */
  listConnections: tenantProcedure.query(async ({ ctx }) => {
    // Get traditional email connections (IMAP)
    const emailConnectionsList = await ctx.db
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
      .where(eq(emailConnections.tenantId, ctx.tenant.id));
    
    // Get OAuth connections for email providers
    const { oauthConnections } = await import("@figgy/shared-db/schemas");
    const oauthConnectionsList = await ctx.db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.tenantId, ctx.tenant.id),
          inArray(oauthConnections.provider, ['gmail', 'outlook'])
        )
      );
    
    // Map OAuth connections to email connection format
    const mappedOAuthConnections = oauthConnectionsList.map(oauth => {
      const metadata = (oauth.metadata as any) || {};
      return {
        id: oauth.id,
        provider: oauth.provider as 'gmail' | 'outlook',
        emailAddress: oauth.accountEmail || '',
        status: oauth.status === 'active' ? 'active' as const : 'inactive' as const,
        lastSyncAt: metadata.lastSyncAt ? new Date(metadata.lastSyncAt) : null,
        lastError: oauth.lastError,
        folderFilter: metadata.folderFilter || ['INBOX'],
        senderFilter: metadata.senderFilter || [],
        subjectFilter: metadata.subjectFilter || [],
        webhookExpiresAt: oauth.webhookExpiresAt,
        createdAt: oauth.createdAt,
      };
    });
    
    // Combine and sort by creation date
    const allConnections = [...emailConnectionsList, ...mappedOAuthConnections];
    allConnections.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return allConnections;
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
      // First check email_connections table
      const [emailConnection] = await ctx.db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (emailConnection) {
        // Handle email connection deletion
        const connection = emailConnection;
      
      // Unsubscribe from webhooks if applicable
      if (connection.webhookSubscriptionId && connection.provider !== "imap") {
        try {
          const providerType = connection.provider === "gmail" ? EmailProvider.GMAIL : 
                              connection.provider === "outlook" ? EmailProvider.OUTLOOK : 
                              EmailProvider.IMAP;
          const provider = createEmailProvider(providerType) as any;
          
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
      }
      
      // If not found in email_connections, check oauth_connections
      const { oauthConnections } = await import("@figgy/shared-db/schemas");
      const [oauthConnection] = await ctx.db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.id, input.connectionId),
            eq(oauthConnections.tenantId, ctx.tenant.id),
            inArray(oauthConnections.provider, ['gmail', 'outlook'])
          )
        )
        .limit(1);
      
      if (!oauthConnection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }
      
      // For OAuth connections, we can use the OAuth router to handle deletion
      const { oauthRouter } = await import("./oauth");
      await oauthRouter
        .createCaller(ctx)
        .revokeConnection({ connectionId: oauthConnection.id });
      
      return { success: true };
    }),
  
  /**
   * Get processing stats for a connection
   */
  getConnectionStats: tenantProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check if connection exists in either table
      const [emailConnection] = await ctx.db
        .select({ id: emailConnections.id })
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.id, input.connectionId),
            eq(emailConnections.tenantId, ctx.tenant.id)
          )
        )
        .limit(1);
      
      if (!emailConnection) {
        // Check OAuth connections
        const { oauthConnections } = await import("@figgy/shared-db/schemas");
        const [oauthConnection] = await ctx.db
          .select({ id: oauthConnections.id })
          .from(oauthConnections)
          .where(
            and(
              eq(oauthConnections.id, input.connectionId),
              eq(oauthConnections.tenantId, ctx.tenant.id),
              inArray(oauthConnections.provider, ['gmail', 'outlook'])
            )
          )
          .limit(1);
        
        if (!oauthConnection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection not found",
          });
        }
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
    .input(z.object({ 
      connectionId: z.string().uuid(),
      forceFullSync: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // First check email_connections table
      const [emailConnection] = await ctx.db
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
      
      if (emailConnection) {
        if (emailConnection.status !== "active") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email connection is not active",
          });
        }
        
        const job = await tasks.trigger("sync-email-connection", {
          connectionId: emailConnection.id,
          triggeredBy: "manual",
          forceFullSync: input.forceFullSync,
        });
        
        return {
          success: true,
          jobId: job.id,
        };
      }
      
      // If not found in email_connections, check oauth_connections
      const { oauthConnections } = await import("@figgy/shared-db/schemas");
      const [oauthConnection] = await ctx.db
        .select({
          id: oauthConnections.id,
          status: oauthConnections.status,
          provider: oauthConnections.provider,
          metadata: oauthConnections.metadata,
        })
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.id, input.connectionId),
            eq(oauthConnections.tenantId, ctx.tenant.id),
            inArray(oauthConnections.provider, ['gmail', 'outlook'])
          )
        )
        .limit(1);
      
      if (!oauthConnection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }
      
      if (oauthConnection.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connection is not active",
        });
      }
      
      const job = await tasks.trigger("sync-email-connection", {
        connectionId: oauthConnection.id,
        triggeredBy: "manual",
        forceFullSync: input.forceFullSync,
      });
      
      return {
        success: true,
        jobId: job.id,
      };
    }),
});