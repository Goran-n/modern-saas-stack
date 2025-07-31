import { eq, emailConnections } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import type {
  EmailConnectionConfig,
  EmailProvider,
} from "../types";
import { 
  EmailProvider as EmailProviderEnum,
  GmailWebhookPayloadSchema,
  OutlookWebhookPayloadSchema,
} from "../types";
import { getDb } from "../db";

const logger = createLogger("email-webhook-handler");

export class WebhookHandler {
  private db = getDb();
  
  /**
   * Handle Gmail webhook
   */
  async handleGmailWebhook(payload: unknown): Promise<void> {
    try {
      // Validate payload
      const parsed = GmailWebhookPayloadSchema.parse(payload);
      
      logger.info("Received Gmail webhook", {
        messageId: parsed.message.messageId,
        publishTime: parsed.message.publishTime,
      });
      
      // Decode the message data
      const messageData = JSON.parse(
        Buffer.from(parsed.message.data, "base64").toString()
      );
      
      // Find the connection by email address
      const connection = await this.findConnectionByEmail(
        messageData.emailAddress,
        EmailProviderEnum.GMAIL
      );
      
      if (!connection) {
        logger.warn("No connection found for Gmail webhook", {
          emailAddress: messageData.emailAddress,
        });
        return;
      }
      
      // Trigger email sync job
      await this.triggerEmailSync(connection.id);
    } catch (error) {
      logger.error("Failed to handle Gmail webhook", { error, payload });
      throw error;
    }
  }
  
  /**
   * Handle Outlook webhook
   */
  async handleOutlookWebhook(
    payload: unknown,
    validationToken?: string
  ): Promise<string | void> {
    try {
      // Handle validation request
      if (validationToken) {
        logger.info("Outlook webhook validation request", { validationToken });
        return validationToken;
      }
      
      // Validate payload
      const parsed = OutlookWebhookPayloadSchema.parse(payload);
      
      logger.info("Received Outlook webhook", {
        notificationCount: parsed.value.length,
      });
      
      for (const notification of parsed.value) {
        if (notification.changeType === "created" && notification.resourceData) {
          // Extract email ID from resource
          const emailId = notification.resourceData.id;
          
          // Find connection by subscription ID
          const connection = await this.findConnectionBySubscription(
            notification.subscriptionId
          );
          
          if (!connection) {
            logger.warn("No connection found for Outlook webhook", {
              subscriptionId: notification.subscriptionId,
            });
            continue;
          }
          
          // Trigger email sync job for specific message
          await this.triggerEmailSync(connection.id, emailId);
        }
      }
    } catch (error) {
      logger.error("Failed to handle Outlook webhook", { error, payload });
      throw error;
    }
  }
  
  /**
   * Handle webhook for any provider
   */
  async handleWebhook(
    provider: EmailProvider,
    payload: unknown,
    validationToken?: string
  ): Promise<string | void> {
    switch (provider) {
      case EmailProviderEnum.GMAIL:
        return this.handleGmailWebhook(payload);
      case EmailProviderEnum.OUTLOOK:
        return this.handleOutlookWebhook(payload, validationToken);
      default:
        throw new Error(`Webhook not supported for provider: ${provider}`);
    }
  }
  
  /**
   * Find connection by email address
   */
  private async findConnectionByEmail(
    emailAddress: string,
    provider: EmailProvider
  ): Promise<EmailConnectionConfig | null> {
    const [connection] = await this.db
      .select()
      .from(emailConnections)
      .where(eq(emailConnections.emailAddress, emailAddress))
      .limit(1);
    
    if (!connection || connection.provider !== provider) {
      return null;
    }
    
    return this.mapToConnectionConfig(connection);
  }
  
  /**
   * Find connection by webhook subscription ID
   */
  private async findConnectionBySubscription(
    subscriptionId: string
  ): Promise<EmailConnectionConfig | null> {
    const [connection] = await this.db
      .select()
      .from(emailConnections)
      .where(eq(emailConnections.webhookSubscriptionId, subscriptionId))
      .limit(1);
    
    if (!connection) {
      return null;
    }
    
    return this.mapToConnectionConfig(connection);
  }
  
  /**
   * Map database record to connection config
   */
  private mapToConnectionConfig(connection: any): EmailConnectionConfig {
    return {
      id: connection.id,
      tenantId: connection.tenantId,
      provider: connection.provider as EmailProvider,
      emailAddress: connection.emailAddress,
      folderFilter: connection.folderFilter as string[],
      senderFilter: connection.senderFilter as string[],
      subjectFilter: connection.subjectFilter as string[],
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      lastError: connection.lastError,
      metadata: connection.metadata,
    };
  }
  
  /**
   * Trigger email sync job
   */
  private async triggerEmailSync(
    connectionId: string,
    specificMessageId?: string
  ): Promise<void> {
    try {
      await tasks.trigger("sync-email-connection", {
        connectionId,
        specificMessageId,
        triggeredBy: "webhook",
      });
      
      logger.info("Triggered email sync job", {
        connectionId,
        specificMessageId,
      });
    } catch (error) {
      logger.error("Failed to trigger email sync job", {
        connectionId,
        error,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const webhookHandler = new WebhookHandler();