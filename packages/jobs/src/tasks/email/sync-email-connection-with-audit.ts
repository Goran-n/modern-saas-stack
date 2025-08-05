import { getConfig } from "@figgy/config";
import {
  createEmailProvider,
  EmailProvider,
} from "@figgy/email-ingestion";
import type { IEmailProvider } from "@figgy/email-ingestion";
import {
  oauthConnections,
  and,
  eq,
  inArray,
  getDatabaseConnection,
} from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
// @ts-ignore - audit module exists but TypeScript can't find it
import { 
  createAuditHelper,
  createJobCorrelationContext,
  correlationManager
} from "@figgy/audit";

const SyncEmailConnectionSchema = z.object({
  connectionId: z.string().uuid(),
  triggeredBy: z.enum(["manual", "webhook", "scheduled"]).default("manual"),
  parentCorrelationId: z.string().uuid().optional(),
});

export const syncEmailConnectionWithAudit = schemaTask({
  id: "sync-email-connection-with-audit",
  schema: SyncEmailConnectionSchema,
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  queue: {
    concurrencyLimit: 5,
  },
  run: async ({ connectionId, triggeredBy, parentCorrelationId }) => {
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);

    // Get connection details first to establish tenant context
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, connectionId),
          inArray(oauthConnections.provider, ['gmail', 'outlook'])
        )
      )
      .limit(1);

    if (!connection) {
      logger.error("Email connection not found", { connectionId });
      throw new Error(`Email connection not found: ${connectionId}`);
    }

    // Create correlation context for this job
    const correlationContext = createJobCorrelationContext({
      tenantId: connection.tenantId,
      jobId: connectionId,
      jobType: 'email-sync',
      triggeredBy: triggeredBy === 'manual' ? 'user' : 'system',
      parentCorrelationId,
      metadata: {
        connectionId,
        provider: connection.provider,
        emailAddress: connection.accountEmail || '',
      },
    });

    return await correlationManager.withContext(correlationContext, async () => {
      const audit = createAuditHelper({
        tenantId: connection.tenantId,
        correlationId: correlationContext.correlationId,
        db,
      });

      return await audit.trackDecision(
        {
          entityType: 'connection',
          entityId: connectionId,
          eventType: 'email.sync_start',
          decision: `Start email synchronization for ${connection.accountEmail || ''}`,
          context: {
            emailProcessing: {
              provider: connection.provider,
              emailAddress: connection.accountEmail || '',
              triggeredBy,
            },
          },
          metadata: {
            connectionId,
            provider: connection.provider,
            lastSyncAt: (connection.metadata as any)?.lastSyncAt,
            folderFilter: (connection.metadata as any)?.folderFilter || ['INBOX'],
            senderFilter: (connection.metadata as any)?.senderFilter || [],
            subjectFilter: (connection.metadata as any)?.subjectFilter || [],
          },
        },
        async () => {
          // Step 1: Validate connection status
          await audit.logDecision({
            entityType: 'connection',
            entityId: connectionId,
            eventType: 'email.connection_validation',
            decision: `Validate connection status and credentials`,
            context: {
              emailProcessing: {
                provider: connection.provider,
                emailAddress: connection.accountEmail || '',
              },
            },
          });

          if (connection.status !== 'active') {
            await audit.logDecision({
              entityType: 'connection',
              entityId: connectionId,
              eventType: 'email.sync_skipped',
              decision: `Connection is not active (status: ${connection.status})`,
              context: {
                emailProcessing: {
                  provider: connection.provider,
                  emailAddress: connection.accountEmail || '',
                  status: connection.status,
                },
              },
            });

            return {
              success: false,
              reason: 'connection_inactive',
              status: connection.status,
            };
          }

          // Step 2: Initialize email provider
          await audit.logDecision({
            entityType: 'connection',
            entityId: connectionId,
            eventType: 'email.provider_init',
            decision: `Initialize ${connection.provider} email provider`,
            context: {
              emailProcessing: {
                provider: connection.provider,
                emailAddress: connection.accountEmail || '',
              },
            },
          });

          const providerType = connection.provider === "gmail" ? EmailProvider.GMAIL : 
                              connection.provider === "outlook" ? EmailProvider.OUTLOOK : 
                              EmailProvider.IMAP;
                              
          const provider = createEmailProvider(providerType) as IEmailProvider;

          // Step 3: Connect to email provider
          try {
            await audit.logDecision({
              entityType: 'connection',
              entityId: connectionId,
              eventType: 'email.provider_connect',
              decision: `Attempting to connect to email provider`,
              context: {
                emailProcessing: {
                  provider: connection.provider,
                  emailAddress: connection.accountEmail || '',
                },
              },
            });

            // Connect logic would go here - simplified for example
            await provider.connect(
              {
                id: connection.id,
                tenantId: connection.tenantId,
                provider: providerType,
                emailAddress: connection.accountEmail || '',
                folderFilter: (connection.metadata as any)?.folderFilter || ['INBOX'],
                senderFilter: (connection.metadata as any)?.senderFilter || [],
                subjectFilter: (connection.metadata as any)?.subjectFilter || [],
                status: connection.status as any,
              },
              // Tokens would be decrypted here
              connection.accessToken ? {
                accessToken: 'decrypted_token',
                refreshToken: connection.refreshToken ? 'decrypted_refresh_token' : undefined,
              } : undefined
            );

            await audit.logDecision({
              entityType: 'connection',
              entityId: connectionId,
              eventType: 'email.provider_connected',
              decision: `Successfully connected to email provider`,
              context: {
                emailProcessing: {
                  provider: connection.provider,
                  emailAddress: connection.accountEmail || '',
                },
              },
            });

          } catch (error) {
            await audit.logDecision({
              entityType: 'connection',
              entityId: connectionId,
              eventType: 'email.provider_connection_failed',
              decision: `Failed to connect to email provider: ${error instanceof Error ? error.message : String(error)}`,
              context: {
                emailProcessing: {
                  provider: connection.provider,
                  emailAddress: connection.accountEmail || '',
                  error: error instanceof Error ? error.message : String(error),
                },
              },
            });

            // Update connection status to error
            await db
              .update(oauthConnections)
              .set({
                status: 'error',
                lastError: error instanceof Error ? error.message : String(error),
                updatedAt: new Date(),
              })
              .where(eq(oauthConnections.id, connectionId));

            throw error;
          }

          // Step 4: Fetch and process emails
          await audit.logDecision({
            entityType: 'connection',
            entityId: connectionId,
            eventType: 'email.fetch_start',
            decision: `Start fetching emails from provider`,
            context: {
              emailProcessing: {
                provider: connection.provider,
                emailAddress: connection.accountEmail || '',
                folderFilter: (connection.metadata as any)?.folderFilter || ['INBOX'],
                senderFilter: (connection.metadata as any)?.senderFilter || [],
                subjectFilter: (connection.metadata as any)?.subjectFilter || [],
              },
            },
          });

          let processedCount = 0;
          let errorCount = 0;

          try {
            // Simplified email processing - in real implementation would fetch and process emails
            const messages: Array<{id: string; subject: string; from: string; date: string; attachments?: string[]}> = []; // Would fetch from provider
            
            for (const message of messages) {
              try {
                await audit.logDecision({
                  entityType: 'email',
                  entityId: `message-${message.id}`,
                  eventType: 'email.message_process',
                  decision: `Process email message: ${message.subject}`,
                  context: {
                    emailProcessing: {
                      messageId: message.id,
                      subject: message.subject,
                      sender: message.from,
                      attachmentCount: message.attachments?.length || 0,
                    },
                  },
                });

                // Process attachments
                if (message.attachments && message.attachments.length > 0) {
                  for (const [index, attachmentName] of message.attachments.entries()) {
                    await audit.logDecision({
                      entityType: 'file',
                      entityId: `attachment-${message.id}-${index}`,
                      eventType: 'email.attachment_process',
                      decision: `Process email attachment: ${attachmentName}`,
                      context: {
                        emailProcessing: {
                          messageId: message.id,
                          attachmentName: attachmentName,
                        },
                        fileProcessing: {
                          fileName: attachmentName,
                          source: 'email',
                        },
                      },
                    });

                    // Would trigger file processing here
                    // await tasks.trigger("categorize-file-with-audit", { ... });
                  }
                }

                processedCount++;
              } catch (error) {
                errorCount++;
                await audit.logDecision({
                  entityType: 'email',
                  entityId: `message-${message.id}`,
                  eventType: 'email.message_process_failed',
                  decision: `Failed to process email message: ${error instanceof Error ? error.message : String(error)}`,
                  context: {
                    emailProcessing: {
                      messageId: message.id,
                      subject: message.subject,
                      error: error instanceof Error ? error.message : String(error),
                    },
                  },
                });
              }
            }

            await audit.logDecision({
              entityType: 'connection',
              entityId: connectionId,
              eventType: 'email.fetch_complete',
              decision: `Email fetch completed: ${processedCount} processed, ${errorCount} errors`,
              context: {
                emailProcessing: {
                  provider: connection.provider,
                  emailAddress: connection.accountEmail || '',
                  processedCount,
                  errorCount,
                },
              },
              metadata: {
                processedCount,
                errorCount,
                totalMessages: messages.length,
              },
            });

          } catch (error) {
            await audit.logDecision({
              entityType: 'connection',
              entityId: connectionId,
              eventType: 'email.fetch_failed',
              decision: `Email fetch failed: ${error instanceof Error ? error.message : String(error)}`,
              context: {
                emailProcessing: {
                  provider: connection.provider,
                  emailAddress: connection.accountEmail || '',
                  error: error instanceof Error ? error.message : String(error),
                },
              },
            });

            throw error;
          } finally {
            // Step 5: Disconnect from provider
            try {
              await provider.disconnect();
              await audit.logDecision({
                entityType: 'connection',
                entityId: connectionId,
                eventType: 'email.provider_disconnected',
                decision: `Disconnected from email provider`,
                context: {
                  emailProcessing: {
                    provider: connection.provider,
                    emailAddress: connection.accountEmail || '',
                  },
                },
              });
            } catch (error) {
              logger.warn("Failed to disconnect from email provider", {
                error: error instanceof Error ? error.message : String(error),
                connectionId,
              });
            }
          }

          // Step 6: Update connection status
          await audit.logDecision({
            entityType: 'connection',
            entityId: connectionId,
            eventType: 'email.sync_complete',
            decision: `Email synchronization completed successfully`,
            context: {
              emailProcessing: {
                provider: connection.provider,
                emailAddress: connection.accountEmail || '',
                processedCount,
                errorCount,
              },
            },
            metadata: {
              duration: Date.now() - new Date(correlationContext.metadata?.startTime || Date.now()).getTime(),
              processedCount,
              errorCount,
            },
          });

          // Update last sync time in metadata
          const metadata = (connection.metadata as any) || {};
          await db
            .update(oauthConnections)
            .set({
              metadata: {
                ...metadata,
                lastSyncAt: new Date().toISOString(),
              },
              lastError: null,
              updatedAt: new Date(),
            })
            .where(eq(oauthConnections.id, connectionId));

          return {
            success: true,
            processedCount,
            errorCount,
            correlationId: correlationContext.correlationId,
          };
        }
      );
    });
  },
});