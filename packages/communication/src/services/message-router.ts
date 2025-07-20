import { createLogger } from "@kibly/utils";
import type { MessagePayload } from "../interfaces/message-handler";
import { isNaturalQuery, processNaturalQuery, storeMessage } from "../operations";
import type { Platform, ProcessingResult } from "../types";
import type { ResponseFormatter } from "./response-formatter";

const logger = createLogger("message-router");

export interface MessageRouterOptions {
  tenantId: string;
  userId: string;
  responseFormatter?: ResponseFormatter;
}

export class MessageRouter {
  constructor() {}

  async route(
    payload: MessagePayload,
    options: MessageRouterOptions
  ): Promise<ProcessingResult> {
    const { tenantId, userId } = options;

    logger.info("Routing message", {
      messageId: payload.messageId,
      platform: payload.platform,
      hasContent: !!payload.content,
      attachmentCount: payload.attachments.length,
      tenantId,
      userId,
    });

    try {
      // Store the message first
      const messageId = await storeMessage({
        messageId: payload.messageId,
        platform: payload.platform as Platform,
        sender: payload.sender,
        content: payload.content || undefined,
        tenantId,
        userId,
        attachments: payload.attachments,
        metadata: payload.metadata,
      } as any);

      // Route based on message type
      if (payload.attachments && payload.attachments.length > 0) {
        // Handle file attachments
        return await this.handleFileAttachments(payload, messageId, options);
      } else if (payload.content) {
        // Handle text message - check if it's a natural language query
        return await this.handleTextMessage(payload, messageId, options);
      }

      // No content or attachments
      return {
        success: true,
        metadata: {
          responseText: "Message received. Send me questions about your files or upload documents to process.",
        },
      };
    } catch (error) {
      logger.error("Error routing message", {
        error,
        messageId: payload.messageId,
        platform: payload.platform,
      });
      throw error;
    }
  }

  private async handleFileAttachments(
    payload: MessagePayload,
    messageId: string,
    _options: MessageRouterOptions
  ): Promise<ProcessingResult> {

    logger.info("Processing file attachments", {
      messageId,
      fileCount: payload.attachments.length,
    });

    const results: Array<{ success: boolean; fileId?: string | undefined; fileName?: string | undefined; error?: string | undefined }> = [];

    for (const attachment of payload.attachments) {
      results.push({
        success: false,
        fileName: attachment.fileName || undefined,
        error: "File processing not implemented",
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    if (successCount === 0) {
      return {
        success: false,
        error: `All ${failureCount} files failed to process`,
      };
    }

    return {
      success: true,
      fileId: results.find(r => r.success)?.fileId,
      metadata: {
        responseText: failureCount > 0
          ? `Processed ${successCount} files successfully, ${failureCount} failed`
          : `Successfully processed ${successCount} file${successCount > 1 ? 's' : ''}`,
        processedFiles: results,
      },
    };
  }

  private async handleTextMessage(
    payload: MessagePayload,
    messageId: string,
    options: MessageRouterOptions
  ): Promise<ProcessingResult> {
    const { tenantId, userId, responseFormatter } = options;

    if (!payload.content) {
      return {
        success: true,
        metadata: {
          responseText: "No message content received",
        },
      };
    }

    // Check if it's a natural language query
    if (await isNaturalQuery(payload.content)) {
      logger.info("Processing as natural language query", {
        messageId,
        platform: payload.platform,
      });

      // Process the query
      const { response, parsedQuery } = await processNaturalQuery(
        payload.content,
        tenantId,
        userId,
        payload.platform
      );

      // Format response if formatter provided
      const formattedResponse = responseFormatter
        ? responseFormatter.format(response)
        : { text: this.generateDefaultSummary(response) };

      return {
        success: true,
        metadata: {
          responseText: formattedResponse.text,
          quickReplies: (formattedResponse as any).quickReplies,
          queryId: response.metadata.queryId,
          parsedQuery,
        },
      };
    }

    // Not a query, just acknowledge
    return {
      success: true,
      metadata: {
        responseText: "Message received. Send me questions about your files like 'How many unprocessed files do I have?' or 'Show me invoices from this month'.",
      },
    };
  }

  private generateDefaultSummary(response: any): string {
    switch (response.results?.type) {
      case 'count':
        return `Found ${response.results.data || 0} results`;
      case 'list':
        return `Here are the results for your query`;
      case 'aggregate':
        return `Here's the aggregated data`;
      case 'summary':
        return typeof response.results.data === 'string' 
          ? response.results.data 
          : 'Query processed successfully';
      default:
        return 'Query processed';
    }
  }
}