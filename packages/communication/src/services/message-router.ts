import { uploadFileFromBase64 } from "@figgy/file-manager";
import { createLogger } from "@figgy/utils";
import type { MessagePayload } from "../interfaces/message-handler";
import {
  isNaturalQuery,
  processNaturalQuery,
  storeMessage,
} from "../operations";
import type { ProcessingResult } from "../types";
import type { ResponseFormatter } from "./response-formatter";
import { SlackService } from "./slack";

const logger = createLogger("message-router");

export interface MessageRouterOptions {
  tenantId: string;
  userId: string;
  responseFormatter?: ResponseFormatter;
  botToken?: string; // Slack bot token for file downloads
}

export class MessageRouter {
  constructor() {}

  async route(
    payload: MessagePayload,
    options: MessageRouterOptions,
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
      // Determine message type and routing strategy
      const hasFiles = payload.attachments && payload.attachments.length > 0;
      const hasText = !!payload.content && payload.content.trim().length > 0;

      // Case 1: File-only message - go straight to file manager
      if (hasFiles && !hasText) {
        logger.info("File-only message detected, routing to file manager", {
          messageId: payload.messageId,
          fileCount: payload.attachments.length,
        });

        // Store minimal message record for tracking
        const messageId = await storeMessage({
          messageId: payload.messageId,
          platform: payload.platform as "whatsapp" | "slack",
          sender: payload.sender,
          content: `Uploaded ${payload.attachments.length} file${payload.attachments.length > 1 ? "s" : ""}`,
          tenantId,
          userId,
        });

        return await this.handleFileOnlyMessage(payload, messageId, options);
      }

      // Case 2: Text-only message - check for intent/NLQ
      if (hasText && !hasFiles) {
        logger.info("Text-only message detected, checking for intent", {
          messageId: payload.messageId,
          contentLength: payload.content!.length,
        });

        // Store the actual message content
        const messageId = await storeMessage({
          messageId: payload.messageId,
          platform: payload.platform as "whatsapp" | "slack",
          sender: payload.sender,
          content: payload.content!,
          tenantId,
          userId,
        });

        return await this.handleTextMessage(payload, messageId, options);
      }

      // Case 3: Mixed message (text + files) - process intent with file context
      if (hasText && hasFiles) {
        logger.info(
          "Mixed message detected (text + files), processing with context",
          {
            messageId: payload.messageId,
            contentLength: payload.content!.length,
            fileCount: payload.attachments.length,
          },
        );

        // Store the actual message content
        const messageId = await storeMessage({
          messageId: payload.messageId,
          platform: payload.platform as "whatsapp" | "slack",
          sender: payload.sender,
          content: payload.content!,
          tenantId,
          userId,
        });

        return await this.handleMixedMessage(payload, messageId, options);
      }

      // Case 4: Empty message
      logger.warn("Empty message received", {
        messageId: payload.messageId,
      });

      return {
        success: true,
        metadata: {
          responseText:
            "Message received. Send me questions about your files or upload documents to process.",
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

  private async handleFileOnlyMessage(
    payload: MessagePayload,
    messageId: string,
    options: MessageRouterOptions,
  ): Promise<ProcessingResult> {
    const { tenantId, userId, botToken } = options;

    logger.info("Processing file attachments", {
      messageId,
      fileCount: payload.attachments.length,
      platform: payload.platform,
    });

    const results: Array<{
      success: boolean;
      fileId?: string | undefined;
      fileName?: string | undefined;
      error?: string | undefined;
    }> = [];

    for (const attachment of payload.attachments) {
      try {
        logger.info("Processing attachment", {
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          size: attachment.size,
          hasUrl: !!attachment.url,
        });

        // Download file based on platform
        let fileBuffer: Buffer;

        if (!attachment.url) {
          throw new Error("Attachment URL is missing");
        }

        if (payload.platform === "slack" && botToken) {
          // Create a new instance with the workspace-specific bot token
          const workspaceSlackService = new SlackService({
            botToken,
          });

          fileBuffer = await workspaceSlackService.downloadFile(attachment.url);
        } else {
          // For other platforms, try direct download
          const response = await fetch(attachment.url);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }

        // Convert to base64 for upload
        const base64Data = fileBuffer.toString("base64");

        // Upload to file manager
        const uploadResult = await uploadFileFromBase64({
          fileName: attachment.fileName || `file_${Date.now()}`,
          mimeType: attachment.mimeType || "application/octet-stream",
          size: attachment.size || fileBuffer.length,
          base64Data,
          tenantId,
          uploadedBy: userId,
          source: payload.platform as "slack" | "whatsapp",
          metadata: {
            messageId,
            platform: payload.platform,
            channelId: payload.metadata?.channelId,
            workspaceId: payload.metadata?.workspaceId,
            originalUrl: attachment.url,
          },
        });

        logger.info("File uploaded successfully", {
          fileId: uploadResult.id,
          fileName: uploadResult.fileName,
          size: uploadResult.size,
        });

        results.push({
          success: true,
          fileId: uploadResult.id,
          fileName: uploadResult.fileName,
        });
      } catch (error) {
        logger.error("Failed to process attachment", {
          err: error,
          fileName: attachment.fileName,
        });

        results.push({
          success: false,
          fileName: attachment.fileName || undefined,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount === 0) {
      return {
        success: false,
        error: `Failed to process files`,
        metadata: {
          responseText: `❌ Sorry, I couldn't process your file${results.length > 1 ? "s" : ""}. Please try uploading again.`,
          failedFiles: results,
        },
      };
    }

    // Build acknowledgment message with file details
    let responseText = "";
    if (successCount === 1 && results.length === 1) {
      const file = results[0];
      responseText = `✅ File received successfully!\n\n📄 *${file?.fileName || "Unknown"}*\nFile ID: ${file?.fileId || "Unknown"}`;
    } else if (successCount > 1) {
      responseText = `✅ Received ${successCount} file${successCount > 1 ? "s" : ""}:\n`;
      results
        .filter((r) => r.success)
        .forEach((file, index) => {
          responseText += `\n${index + 1}. 📄 ${file.fileName}`;
        });
    }

    if (failureCount > 0) {
      responseText += `\n\n⚠️ ${failureCount} file${failureCount > 1 ? "s" : ""} failed to upload:`;
      results
        .filter((r) => !r.success)
        .forEach((file) => {
          responseText += `\n❌ ${file.fileName || "Unknown"}: ${file.error}`;
        });
    }

    responseText += "\n\nYou can now ask me questions about your files!";

    return {
      success: true,
      fileId: results.find((r) => r.success)?.fileId,
      metadata: {
        responseText,
        processedFiles: results,
      },
    };
  }

  private async handleTextMessage(
    payload: MessagePayload,
    messageId: string,
    options: MessageRouterOptions,
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
    if (payload.content && (await isNaturalQuery(payload.content))) {
      logger.info("Processing as natural language query", {
        messageId,
        platform: payload.platform,
      });

      // Process the query
      const { response, parsedQuery } = await processNaturalQuery(
        payload.content,
        tenantId,
        userId,
        payload.platform,
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
        responseText:
          "Message received. Send me questions about your files like 'How many unprocessed files do I have?' or 'Show me invoices from this month'.",
      },
    };
  }

  private async handleMixedMessage(
    payload: MessagePayload,
    messageId: string,
    options: MessageRouterOptions,
  ): Promise<ProcessingResult> {
    const { tenantId, userId, botToken } = options;

    logger.info("Processing mixed message (text + files)", {
      messageId,
      text: payload.content,
      fileCount: payload.attachments.length,
    });

    // First, upload the files
    const fileResults: Array<{
      success: boolean;
      fileId?: string | undefined;
      fileName?: string | undefined;
      error?: string | undefined;
    }> = [];

    for (const attachment of payload.attachments) {
      try {
        logger.info("Processing attachment in mixed message", {
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
        });

        // Download and upload file (same as handleFileOnlyMessage)
        let fileBuffer: Buffer;

        if (!attachment.url) {
          throw new Error("Attachment URL is missing");
        }

        if (payload.platform === "slack" && botToken) {
          const workspaceSlackService = new SlackService({
            botToken,
          });
          fileBuffer = await workspaceSlackService.downloadFile(attachment.url);
        } else {
          const response = await fetch(attachment.url);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }

        const base64Data = fileBuffer.toString("base64");

        const uploadResult = await uploadFileFromBase64({
          fileName: attachment.fileName || `file_${Date.now()}`,
          mimeType: attachment.mimeType || "application/octet-stream",
          size: attachment.size || fileBuffer.length,
          base64Data,
          tenantId,
          uploadedBy: userId,
          source: payload.platform as "slack" | "whatsapp",
          metadata: {
            messageId,
            platform: payload.platform,
            channelId: payload.metadata?.channelId,
            workspaceId: payload.metadata?.workspaceId,
            originalUrl: attachment.url,
            associatedText: payload.content, // Store the associated text with the file
          },
        });

        fileResults.push({
          success: true,
          fileId: uploadResult.id,
          fileName: uploadResult.fileName,
        });
      } catch (error) {
        logger.error("Failed to process attachment in mixed message", {
          err: error,
          fileName: attachment.fileName,
        });

        fileResults.push({
          success: false,
          fileName: attachment.fileName || undefined,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Now process the text content for intent
    if (!payload.content) {
      return this.generateFileUploadResponse(fileResults);
    }

    // Check if it's a natural language query
    if (payload.content && (await isNaturalQuery(payload.content))) {
      logger.info(
        "Text in mixed message is a query, processing with file context",
        {
          messageId,
          uploadedFiles: fileResults.filter((r) => r.success).length,
        },
      );

      // Process the query with file context
      const { response, parsedQuery } = await processNaturalQuery(
        payload.content,
        tenantId,
        userId,
        payload.platform,
      );

      // Add file upload information to the response
      const successfulFiles = fileResults.filter((r) => r.success);
      let enhancedResponseText = "";

      if (successfulFiles.length > 0) {
        enhancedResponseText = `✅ Uploaded ${successfulFiles.length} file${successfulFiles.length > 1 ? "s" : ""}:\n`;
        successfulFiles.forEach((file, index) => {
          enhancedResponseText += `${index + 1}. 📄 ${file.fileName}\n`;
        });
        enhancedResponseText += "\n";
      }

      // Add the query response
      const queryResponseText =
        (response.metadata as any).responseText ||
        this.generateDefaultSummary(response);
      enhancedResponseText += queryResponseText;

      return {
        success: true,
        metadata: {
          responseText: enhancedResponseText,
          queryId: response.metadata.queryId,
          parsedQuery,
          uploadedFiles: fileResults,
        },
      };
    }

    // Not a query, just acknowledge files with the message
    return this.generateFileUploadResponse(fileResults, payload.content);
  }

  private generateFileUploadResponse(
    fileResults: Array<{
      success: boolean;
      fileId?: string | undefined;
      fileName?: string | undefined;
      error?: string | undefined;
    }>,
    userMessage?: string,
  ): ProcessingResult {
    const successCount = fileResults.filter((r) => r.success).length;
    const failureCount = fileResults.filter((r) => !r.success).length;

    let responseText = "";

    if (userMessage) {
      responseText = `📝 Message: "${userMessage}"\n\n`;
    }

    if (successCount > 0) {
      responseText += `✅ Successfully uploaded ${successCount} file${successCount > 1 ? "s" : ""}:\n`;
      fileResults
        .filter((r) => r.success)
        .forEach((file, index) => {
          responseText += `${index + 1}. 📄 ${file.fileName}\n`;
        });
    }

    if (failureCount > 0) {
      responseText += `\n⚠️ Failed to upload ${failureCount} file${failureCount > 1 ? "s" : ""}`;
    }

    responseText += "\n\nYou can now ask me questions about your files!";

    return {
      success: successCount > 0,
      metadata: {
        responseText,
        uploadedFiles: fileResults,
      },
    };
  }

  private generateDefaultSummary(response: any): string {
    switch (response.results?.type) {
      case "count":
        return `Found ${response.results.data || 0} results`;
      case "list":
        return `Here are the results for your query`;
      case "aggregate":
        return `Here's the aggregated data`;
      case "summary":
        return typeof response.results.data === "string"
          ? response.results.data
          : "Query processed successfully";
      default:
        return "Query processed";
    }
  }
}
