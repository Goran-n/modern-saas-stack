import { AttachmentProcessor } from "@figgy/email-ingestion";
import { createEmailProvider } from "@figgy/email-ingestion";
import type { 
  EmailConnectionConfig,
  EmailMessage,
  EmailProvider,
} from "@figgy/email-ingestion";
import { uploadFile } from "@figgy/file-manager";
import { 
  eq,
  and,
  or,
  desc,
  count,
  oauthConnections,
  emailProcessingLog,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { task } from "@trigger.dev/sdk/v3";
import type { OAuthTokens } from "@figgy/oauth";
import { getOAuthEncryptionService } from "@figgy/oauth";
import { getConfig } from "@figgy/config";
import { getDb } from "../../db";

const logger = createLogger("sync-email-connection");

export const syncEmailConnection = task({
  id: "sync-email-connection",
  queue: {
    concurrencyLimit: 5,
  },
  run: async (payload: {
    connectionId: string;
    specificMessageId?: string;
    triggeredBy: "webhook" | "schedule" | "manual";
    forceFullSync?: boolean;
  }) => {
    const { connectionId, specificMessageId, triggeredBy, forceFullSync } = payload;
    
    // Ensure config is validated before using OAuth encryption service
    const config = getConfig();
    if (!config.isValid()) {
      config.validate();
    }
    
    const db = getDb();
    
    logger.info("Starting email connection sync", {
      connectionId,
      specificMessageId,
      triggeredBy,
      forceFullSync,
    });
    
    try {
      // Get connection from database
      const [connection] = await db
        .select()
        .from(oauthConnections)
        .where(eq(oauthConnections.id, connectionId))
        .limit(1);
      
      if (!connection) {
        throw new Error(`Email connection not found: ${connectionId}`);
      }
      
      logger.info("Found OAuth connection", {
        connectionId,
        provider: connection.provider,
        accountEmail: connection.accountEmail,
        status: connection.status,
        hasMetadata: !!connection.metadata,
        userId: connection.userId,
      });
      
      if (connection.status !== "active") {
        logger.warn("OAuth connection is not active", {
          connectionId,
          status: connection.status,
        });
        return { skipped: true, reason: "Connection not active" };
      }
      
      // Check if this is an email provider
      const metadata = connection.metadata as any || {};
      logger.info("Connection metadata", {
        connectionId,
        metadata,
        isEmailProvider: metadata.isEmailProvider,
      });
      
      if (!metadata.isEmailProvider) {
        logger.warn("OAuth connection is not an email provider", {
          connectionId,
          provider: connection.provider,
          metadata,
        });
        return { skipped: true, reason: "Not an email provider" };
      }
      
      // Decrypt tokens using OAuth encryption service
      const oauthEncryption = getOAuthEncryptionService();
      const tokens: OAuthTokens = {
        accessToken: oauthEncryption.decrypt(connection.accessToken),
        refreshToken: connection.refreshToken 
          ? oauthEncryption.decrypt(connection.refreshToken)
          : undefined,
        expiresAt: connection.tokenExpiresAt || undefined,
      };
      
      // Create connection config from OAuth connection
      const config: EmailConnectionConfig = {
        id: connection.id,
        tenantId: connection.tenantId,
        provider: connection.provider as EmailProvider,
        emailAddress: connection.accountEmail || '',
        folderFilter: metadata.folderFilter || ['INBOX'],
        senderFilter: metadata.senderFilter || [],
        subjectFilter: metadata.subjectFilter || [],
        status: 'active' as any, // We already checked this above
        lastSyncAt: metadata.lastSyncAt || undefined,
        lastError: connection.lastError || undefined,
        metadata: metadata,
      };
      
      // Create provider and processor
      const provider = createEmailProvider(config.provider);
      const processor = new AttachmentProcessor();
      
      try {
        // Connect to provider (OAuth providers don't need credentials)
        await provider.connect(config, tokens, undefined);
        
        let messages: EmailMessage[] = [];
        
        if (specificMessageId) {
          // Fetch specific message (webhook triggered)
          logger.info("Fetching specific message", { specificMessageId });
          try {
            const message = await provider.getMessage(specificMessageId);
            messages = [message];
          } catch (error) {
            logger.error("Failed to fetch specific message", {
              specificMessageId,
              error,
            });
          }
        } else {
          // PHASE 1: DISCOVERY - Find and record all emails
          logger.info("Phase 1: Email discovery", {
            lastSyncAt: metadata.lastSyncAt,
            folderFilter: config.folderFilter,
            forceFullSync,
          });
          
          // Get last processed email date from email_processing_log
          const lastProcessedEmail = await db
            .select({
              emailDate: emailProcessingLog.emailDate,
            })
            .from(emailProcessingLog)
            .where(eq(emailProcessingLog.connectionId, connectionId))
            .orderBy(desc(emailProcessingLog.emailDate))
            .limit(1);
          
          let sinceDate: Date | undefined;
          if (forceFullSync) {
            sinceDate = undefined; // No date filter for full sync
          } else if (lastProcessedEmail[0]?.emailDate) {
            // Add 1 millisecond to avoid re-discovering the same email
            sinceDate = new Date(lastProcessedEmail[0].emailDate.getTime() + 1);
          } else {
            // No emails in processing log, default to 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            sinceDate = thirtyDaysAgo;
          }
          
          logger.info("Discovering emails since", {
            sinceDate,
            usingProcessingLog: !!lastProcessedEmail[0],
            defaultingTo30Days: !lastProcessedEmail[0] && !forceFullSync,
          });
          
          for (const folder of config.folderFilter) {
            try {
              logger.info("Discovering emails in folder", { folder });
              const folderMessages = await provider.listMessages(folder, {
                since: sinceDate,
                unreadOnly: false,
                limit: 50, // Provider now handles pagination internally
              });
              
              logger.info("Found messages in folder", {
                folder,
                count: folderMessages.length,
              });
              
              // Insert discovered emails into processing log as pending
              for (const message of folderMessages) {
                try {
                  // Check if already exists
                  const existing = await db
                    .select({ id: emailProcessingLog.id })
                    .from(emailProcessingLog)
                    .where(
                      and(
                        eq(emailProcessingLog.connectionId, connectionId),
                        eq(emailProcessingLog.messageId, message.messageId)
                      )
                    )
                    .limit(1);
                  
                  if (!existing[0]) {
                    logger.info("Discovered new email", {
                      messageId: message.messageId,
                      subject: message.subject,
                      from: message.from,
                      attachments: message.attachments.length,
                    });
                    
                    await db.insert(emailProcessingLog).values({
                      connectionId,
                      messageId: message.messageId,
                      threadId: message.threadId,
                      emailDate: message.date,
                      fromAddress: message.from,
                      subject: message.subject,
                      attachmentCount: message.attachments.length,
                      attachmentsTotalSize: message.attachments.reduce((sum, att) => sum + att.size, 0),
                      processingStatus: "pending",
                      metadata: {
                        folder,
                        labels: message.labels,
                      },
                    });
                  }
                } catch (error) {
                  logger.error("Failed to record discovered email", {
                    messageId: message.messageId,
                    error,
                  });
                }
              }
            } catch (error) {
              logger.error("Failed to discover messages in folder", {
                folder,
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
              });
            }
          }
          
          // PHASE 2: PROCESSING - Get pending and failed emails from log
          logger.info("Phase 2: Processing pending and failed emails");
          
          // Debug: First check total count of emails in processing log for this connection
          const totalInLog = await db
            .select({ count: count() })
            .from(emailProcessingLog)
            .where(eq(emailProcessingLog.connectionId, connectionId));
          
          const failedCount = await db
            .select({ count: count() })
            .from(emailProcessingLog)
            .where(
              and(
                eq(emailProcessingLog.connectionId, connectionId),
                eq(emailProcessingLog.processingStatus, "failed")
              )
            );
          
          logger.info("Email processing log status", {
            connectionId,
            connectionIdType: typeof connectionId,
            totalEmailsInLog: totalInLog[0]?.count || 0,
            failedEmails: failedCount[0]?.count || 0,
          });
          
          // Debug: Let's see what's actually in the processing log
          if (failedCount[0]?.count && failedCount[0].count > 0) {
            const sampleFailed = await db
              .select({
                id: emailProcessingLog.id,
                connectionId: emailProcessingLog.connectionId,
                status: emailProcessingLog.processingStatus,
                messageId: emailProcessingLog.messageId,
              })
              .from(emailProcessingLog)
              .where(
                and(
                  eq(emailProcessingLog.connectionId, connectionId),
                  eq(emailProcessingLog.processingStatus, "failed")
                )
              )
              .limit(1);
            
            logger.info("Sample failed email from log", {
              sampleFailed,
              queryConnectionId: connectionId,
            });
          }
          
          const emailsToProcess = await db
            .select()
            .from(emailProcessingLog)
            .where(
              and(
                eq(emailProcessingLog.connectionId, connectionId),
                or(
                  eq(emailProcessingLog.processingStatus, "pending"),
                  eq(emailProcessingLog.processingStatus, "failed")
                )
              )
            )
            .orderBy(emailProcessingLog.emailDate)
            .limit(50); // Process up to 50 at a time
          
          logger.info("Found emails to process", {
            count: emailsToProcess.length,
            pending: emailsToProcess.filter(e => e.processingStatus === "pending").length,
            failed: emailsToProcess.filter(e => e.processingStatus === "failed").length,
          });
          
          // Convert pending emails back to EmailMessage format for processing
          for (const emailToProcess of emailsToProcess) {
            try {
              // For failed emails, we can reconstruct the message from the log entry
              // This avoids re-fetching from provider which might fail if email was deleted
              if (emailToProcess.processingStatus === "failed" && emailToProcess.attachmentCount > 0) {
                logger.info("Reconstructing failed email from processing log", {
                  messageId: emailToProcess.messageId,
                  subject: emailToProcess.subject,
                  attachmentCount: emailToProcess.attachmentCount,
                });
                
                // Create a minimal EmailMessage from the log data
                const reconstructedMessage: EmailMessage = {
                  messageId: emailToProcess.messageId,
                  from: emailToProcess.fromAddress || "",
                  to: [], // We don't store this in the log
                  subject: emailToProcess.subject || "",
                  date: emailToProcess.emailDate,
                  body: "", // We don't store this in the log
                  attachments: [], // We'll need to fetch these from provider
                };
                
                // We still need to fetch attachment details from provider
                try {
                  const fullMessage = await provider.getMessage(emailToProcess.messageId);
                  reconstructedMessage.attachments = fullMessage.attachments;
                  messages.push(reconstructedMessage);
                } catch (providerError) {
                  logger.warn("Failed to fetch attachments from provider, skipping", {
                    messageId: emailToProcess.messageId,
                    error: providerError,
                  });
                  // Don't update status - leave it as failed for next retry
                  continue;
                }
              } else {
                // For pending emails, fetch full message details from provider
                const fullMessage = await provider.getMessage(emailToProcess.messageId);
                messages.push(fullMessage);
              }
            } catch (error) {
              logger.error("Failed to fetch message for processing", {
                messageId: emailToProcess.messageId,
                error,
              });
              
              // Update status to failed only for pending emails
              if (emailToProcess.processingStatus === "pending") {
                await db
                  .update(emailProcessingLog)
                  .set({
                    processingStatus: "failed",
                    errorMessage: error instanceof Error ? error.message : String(error),
                    processedAt: new Date(),
                  })
                  .where(eq(emailProcessingLog.id, emailToProcess.id));
              }
            }
          }
        }
        
        logger.info("Found messages to process", {
          count: messages.length,
        });
        
        // Process each message
        let processedCount = 0;
        let errorCount = 0;
        
        for (const message of messages) {
          try {
            logger.info("Processing message with connection user ID", {
              messageId: message.messageId,
              userId: connection.userId,
              connectionId: connection.id,
            });
            
            const result = await processor.processEmail(
              config,
              message,
              uploadFile,
              tokens,
              undefined, // OAuth connections don't have IMAP credentials
              undefined, // Use default processing options
              { userId: connection.userId } // Use the actual user ID from the OAuth connection
            );
            
            // Update the processing log with the result
            const logEntry = await db
              .select()
              .from(emailProcessingLog)
              .where(
                and(
                  eq(emailProcessingLog.connectionId, connectionId),
                  eq(emailProcessingLog.messageId, message.messageId)
                )
              )
              .limit(1);
            
            if (logEntry[0]) {
              await db
                .update(emailProcessingLog)
                .set({
                  processingStatus: "completed",
                  processedAt: new Date(),
                  processingDurationMs: Date.now() - new Date(logEntry[0].createdAt).getTime(),
                  fileIds: result.fileIds || [],
                })
                .where(eq(emailProcessingLog.id, logEntry[0].id));
            }
            
            processedCount++;
          } catch (error) {
            logger.error("Failed to process message", {
              messageId: message.messageId,
              error,
            });
            
            // Update the processing log with the failure
            const logEntry = await db
              .select()
              .from(emailProcessingLog)
              .where(
                and(
                  eq(emailProcessingLog.connectionId, connectionId),
                  eq(emailProcessingLog.messageId, message.messageId)
                )
              )
              .limit(1);
            
            if (logEntry[0]) {
              await db
                .update(emailProcessingLog)
                .set({
                  processingStatus: "failed",
                  processedAt: new Date(),
                  processingDurationMs: Date.now() - new Date(logEntry[0].createdAt).getTime(),
                  errorMessage: error instanceof Error ? error.message : String(error),
                })
                .where(eq(emailProcessingLog.id, logEntry[0].id));
            }
            
            errorCount++;
          }
        }
        
        // Only update lastError if there were errors
        if (errorCount > 0) {
          await db
            .update(oauthConnections)
            .set({
              lastError: `Failed to process ${errorCount} out of ${messages.length} emails`,
              updatedAt: new Date(),
            })
            .where(eq(oauthConnections.id, connectionId));
        } else if (processedCount > 0) {
          // Clear any previous errors if processing was successful
          await db
            .update(oauthConnections)
            .set({
              lastError: null,
              updatedAt: new Date(),
            })
            .where(eq(oauthConnections.id, connectionId));
        }
        
        logger.info("Email sync completed", {
          connectionId,
          processedCount,
          errorCount,
          totalMessages: messages.length,
          pendingInLog: await db
            .select({ count: count() })
            .from(emailProcessingLog)
            .where(
              and(
                eq(emailProcessingLog.connectionId, connectionId),
                eq(emailProcessingLog.processingStatus, "pending")
              )
            )
            .then(res => res[0]?.count || 0),
        });
        
        return {
          success: true,
          processedCount,
          errorCount,
          totalMessages: messages.length,
        };
      } finally {
        await provider.disconnect();
      }
    } catch (error) {
      logger.error("Email sync failed", {
        connectionId,
        error,
      });
      
      // Update connection with error
      await db
        .update(oauthConnections)
        .set({
          lastError: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, connectionId));
      
      throw error;
    }
  },
});