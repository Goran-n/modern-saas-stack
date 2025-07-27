import { createLogger } from "@figgy/utils";
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
import { parseSlackPayloadWithResult } from "../parsers/slack";
import {
  MessageRouter,
  type MessageRouterOptions,
} from "../services/message-router";
import { SlackResponseFormatter } from "../services/response-formatter";
import { Platform, type ProcessingResult } from "../types";

const logger = createLogger("slack-handler");

export class SlackMessageHandler extends BaseMessageHandler {
  private messageRouter: MessageRouter;
  private responseFormatter: SlackResponseFormatter;

  constructor() {
    super([Platform.SLACK]);
    this.messageRouter = new MessageRouter();
    this.responseFormatter = new SlackResponseFormatter();
  }

  protected async validatePlatformSpecific(
    payload: MessagePayload,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Allow either text content or file attachments
    if (
      !payload.content &&
      (!payload.attachments || payload.attachments.length === 0)
    ) {
      errors.push("Slack event must contain either text or file attachments");
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
    botToken?: string,
  ): Promise<ProcessingResult> {
    try {
      logger.info("Processing Slack event", {
        messageId: payload.messageId,
        sender: payload.sender,
        channelId: payload.metadata?.channelId,
        hasContent: !!payload.content,
        fileCount: payload.attachments.length,
      });

      // Use the central message router
      const routerOptions: MessageRouterOptions = {
        tenantId,
        userId,
        responseFormatter: this.responseFormatter,
      };

      if (botToken) {
        routerOptions.botToken = botToken;
      }

      const result = await this.messageRouter.route(payload, routerOptions);

      return result;
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

  static parseWebhookPayloadWithResult(rawPayload: unknown): {
    payload: MessagePayload | null;
    skipped?: boolean;
    skipReason?: string;
  } {
    try {
      const result = parseSlackPayloadWithResult(rawPayload);

      if (result.type === "skipped") {
        return { payload: null, skipped: true, skipReason: result.reason };
      }

      if (result.type === "error") {
        throw result.error;
      }

      const parsed = result.message;

      const payload: MessagePayload = {
        messageId: parsed.messageId,
        platform: Platform.SLACK,
        sender: parsed.userId,
        timestamp: parsed.timestamp,
        content: parsed.text || undefined,
        attachments: parsed.files
          ? parsed.files.map((file) => ({
              id: file.id,
              fileName: file.name,
              mimeType: file.mimeType,
              size: file.size,
              url: file.downloadUrl,
            }))
          : [],
        metadata: {
          channelId: parsed.channelId,
          workspaceId: parsed.workspaceId,
        },
      };

      logger.info("Slack webhook payload parsed", {
        messageId: payload.messageId,
        hasContent: !!payload.content,
        contentValue: payload.content,
        attachmentCount: payload.attachments.length,
        filesFromParsed: parsed.files?.length || 0,
      });

      return { payload };
    } catch (error: any) {
      logger.error("Failed to parse Slack webhook payload", error);
      throw error;
    }
  }

  static parseWebhookPayload(rawPayload: unknown): MessagePayload | null {
    try {
      const result =
        SlackMessageHandler.parseWebhookPayloadWithResult(rawPayload);
      return result.payload;
    } catch (_error) {
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
