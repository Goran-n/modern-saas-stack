import { createLogger } from "@kibly/utils";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  FILE_LIMITS,
  SUPPORTED_MIME_TYPES,
} from "../constants";
import {
  BaseMessageHandler,
  type MessagePayload,
  MessageProcessingError,
  type ValidationResult,
} from "../interfaces/message-handler";
import { processSlackFiles } from "../operations";
import { parseSlackPayload } from "../parsers/slack";
import { Platform, type ProcessingResult } from "../types";

const logger = createLogger("slack-handler");

export class SlackMessageHandler extends BaseMessageHandler {
  constructor() {
    super([Platform.SLACK]);
  }

  protected async validatePlatformSpecific(
    payload: MessagePayload,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!payload.attachments || payload.attachments.length === 0) {
      errors.push("Slack event must contain file attachments");
    }

    if (!payload.metadata?.channelId) {
      errors.push("Slack message must include channel ID in metadata");
    }

    if (!payload.metadata?.workspaceId) {
      errors.push("Slack message must include workspace ID in metadata");
    }

    if (payload.attachments) {
      for (const attachment of payload.attachments) {
        if (!attachment.url) {
          errors.push(`Attachment ${attachment.id} is missing download URL`);
        }

        if (!attachment.size) {
          errors.push(`Attachment ${attachment.id} is missing file size`);
        }

        if (attachment.size && attachment.size > FILE_LIMITS.MAX_SIZE_BYTES) {
          errors.push(
            `File ${attachment.fileName || attachment.id} ${ERROR_MESSAGES.FILE_SIZE_EXCEEDED} (${FILE_LIMITS.MAX_SIZE_LABEL})`,
          );
        }

        if (
          attachment.mimeType &&
          !SUPPORTED_MIME_TYPES.SLACK.some((type) =>
            attachment.mimeType.includes(type),
          )
        ) {
          errors.push(
            `${ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${attachment.mimeType}`,
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async process(
    payload: MessagePayload,
    tenantId: string,
    userId: string,
  ): Promise<ProcessingResult> {
    try {
      logger.info("Processing Slack file event", {
        messageId: payload.messageId,
        sender: payload.sender,
        channelId: payload.metadata?.channelId,
        fileCount: payload.attachments.length,
      });

      const parsedMessage = {
        messageId: payload.messageId,
        userId: payload.sender,
        channelId: payload.metadata?.channelId || "",
        workspaceId: payload.metadata?.workspaceId || "",
        timestamp: payload.timestamp,
        files: payload.attachments.map((att) => ({
          id: att.id,
          name: att.fileName || "unknown",
          mimeType: att.mimeType,
          size: att.size || 0,
          downloadUrl: att.url || "",
        })),
      };

      const results = await processSlackFiles(parsedMessage, tenantId, userId);

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      if (successCount === 0) {
        throw new MessageProcessingError(
          `All ${failureCount} files failed to process`,
          ERROR_CODES.ALL_FILES_FAILED,
          { results },
        );
      }

      return {
        success: true,
        fileId: results.find((r) => r.success)?.fileId,
        jobId: results.find((r) => r.success)?.jobId,
        error:
          failureCount > 0
            ? `Processed ${successCount} files successfully, ${failureCount} failed`
            : undefined,
      };
    } catch (error) {
      if (error instanceof MessageProcessingError) {
        throw error;
      }

      logger.error("Unexpected error processing Slack event", error);
      throw new MessageProcessingError(
        "Internal processing error",
        ERROR_CODES.INTERNAL_ERROR,
        error,
      );
    }
  }

  static parseWebhookPayload(rawPayload: unknown): MessagePayload | null {
    try {
      const parsed = parseSlackPayload(rawPayload);

      if (!parsed) {
        return null;
      }

      const payload: MessagePayload = {
        messageId: parsed.messageId,
        platform: Platform.SLACK,
        sender: parsed.userId,
        timestamp: parsed.timestamp,
        content: undefined,
        attachments: parsed.files.map((file) => ({
          id: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          size: file.size,
          url: file.downloadUrl,
        })),
        metadata: {
          channelId: parsed.channelId,
          workspaceId: parsed.workspaceId,
        },
      };

      return payload;
    } catch (error) {
      logger.error("Failed to parse Slack webhook payload", error);
      return null;
    }
  }

  static handleUrlVerification(payload: any): { challenge: string } | null {
    if (payload.type === "url_verification" && payload.challenge) {
      logger.info("Handling Slack URL verification challenge");
      return { challenge: payload.challenge };
    }
    return null;
  }
}

export const slackHandler = new SlackMessageHandler();
