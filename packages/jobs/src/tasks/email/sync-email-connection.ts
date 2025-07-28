import { AttachmentProcessor, encryptionService } from "@figgy/email-ingestion";
import { createEmailProvider } from "@figgy/email-ingestion";
import { uploadFile } from "@figgy/file-manager";
import { 
  and,
  eq,
  emailConnections,
  type EmailConnection,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { task } from "@trigger.dev/sdk/v3";
import type { 
  EmailConnectionConfig,
  EmailMessage,
  EmailProvider,
  OAuthTokens,
  IMAPCredentials,
} from "@figgy/email-ingestion";
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
  }) => {
    const { connectionId, specificMessageId, triggeredBy } = payload;
    const db = getDb();
    
    logger.info("Starting email connection sync", {
      connectionId,
      specificMessageId,
      triggeredBy,
    });
    
    try {
      // Get connection from database
      const [connection] = await db
        .select()
        .from(emailConnections)
        .where(eq(emailConnections.id, connectionId))
        .limit(1);
      
      if (!connection) {
        throw new Error(`Email connection not found: ${connectionId}`);
      }
      
      if (connection.status !== "active") {
        logger.warn("Email connection is not active", {
          connectionId,
          status: connection.status,
        });
        return { skipped: true, reason: "Connection not active" };
      }
      
      // Decrypt tokens/credentials
      let tokens: OAuthTokens | undefined;
      let credentials: IMAPCredentials | undefined;
      
      if (connection.accessToken) {
        tokens = {
          accessToken: encryptionService.decrypt(connection.accessToken),
          refreshToken: connection.refreshToken 
            ? encryptionService.decrypt(connection.refreshToken)
            : undefined,
          expiresAt: connection.tokenExpiresAt || undefined,
        };
      }
      
      if (connection.imapPassword) {
        credentials = {
          host: connection.imapHost!,
          port: connection.imapPort!,
          username: connection.imapUsername!,
          password: encryptionService.decrypt(connection.imapPassword),
          tls: true,
        };
      }
      
      // Create connection config
      const config: EmailConnectionConfig = {
        id: connection.id,
        tenantId: connection.tenantId,
        provider: connection.provider as EmailProvider,
        emailAddress: connection.emailAddress,
        folderFilter: connection.folderFilter as string[],
        senderFilter: connection.senderFilter as string[],
        subjectFilter: connection.subjectFilter as string[],
        status: connection.status,
        lastSyncAt: connection.lastSyncAt || undefined,
        lastError: connection.lastError || undefined,
        metadata: connection.metadata,
      };
      
      // Create provider and processor
      const provider = createEmailProvider(config.provider);
      const processor = new AttachmentProcessor();
      
      try {
        // Connect to provider
        await provider.connect(config, tokens, credentials);
        
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
          // List messages since last sync
          logger.info("Listing messages since last sync", {
            lastSyncAt: connection.lastSyncAt,
          });
          
          for (const folder of config.folderFilter) {
            try {
              const folderMessages = await provider.listMessages(folder, {
                since: connection.lastSyncAt || undefined,
                unreadOnly: true,
                limit: 50,
              });
              messages.push(...folderMessages);
            } catch (error) {
              logger.error("Failed to list messages in folder", {
                folder,
                error,
              });
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
            await processor.processEmail(
              config,
              message,
              uploadFile,
              tokens,
              credentials
            );
            processedCount++;
          } catch (error) {
            logger.error("Failed to process message", {
              messageId: message.messageId,
              error,
            });
            errorCount++;
          }
        }
        
        // Update last sync time
        await db
          .update(emailConnections)
          .set({
            lastSyncAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(emailConnections.id, connectionId));
        
        logger.info("Email sync completed", {
          connectionId,
          processedCount,
          errorCount,
          totalMessages: messages.length,
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
        .update(emailConnections)
        .set({
          lastError: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        })
        .where(eq(emailConnections.id, connectionId));
      
      throw error;
    }
  },
});