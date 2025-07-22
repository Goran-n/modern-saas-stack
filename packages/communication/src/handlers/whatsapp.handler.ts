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
import { parseTwilioWhatsAppPayload } from "../parsers/twilio";
import { MessageRouter } from "../services/message-router";
import { WhatsAppResponseFormatter } from "../services/response-formatter";
import { Platform, type ProcessingResult } from "../types";

const logger = createLogger("whatsapp-handler");

export class WhatsAppMessageHandler extends BaseMessageHandler {
  private messageRouter: MessageRouter;
  private responseFormatter: WhatsAppResponseFormatter;

  constructor() {
    super([Platform.WHATSAPP]);
    this.messageRouter = new MessageRouter();
    this.responseFormatter = new WhatsAppResponseFormatter();
  }

  protected async validatePlatformSpecific(
    payload: MessagePayload,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (
      !payload.content &&
      (!payload.attachments || payload.attachments.length === 0)
    ) {
      errors.push(ERROR_MESSAGES.NO_CONTENT_OR_ATTACHMENTS);
    }

    if (payload.attachments) {
      for (const attachment of payload.attachments) {
        if (!attachment.mimeType) {
          errors.push(`${ERROR_MESSAGES.MISSING_MIME_TYPE}: ${attachment.id}`);
        }

        if (
          attachment.mimeType &&
          !SUPPORTED_MIME_TYPES.WHATSAPP.some((type) =>
            attachment.mimeType.includes(type),
          )
        ) {
          errors.push(
            `${ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${attachment.mimeType}`,
          );
        }

        if (attachment.size && attachment.size > FILE_LIMITS.MAX_SIZE_BYTES) {
          errors.push(
            `${attachment.fileName || attachment.id} ${ERROR_MESSAGES.FILE_SIZE_EXCEEDED} (${FILE_LIMITS.MAX_SIZE_LABEL})`,
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
      logger.info("Processing WhatsApp message", {
        messageId: payload.messageId,
        sender: payload.sender,
        attachmentCount: payload.attachments.length,
      });

      // Use the central message router
      const result = await this.messageRouter.route(payload, {
        tenantId,
        userId,
        responseFormatter: this.responseFormatter,
      });

      return result;
    } catch (error) {
      if (error instanceof MessageProcessingError) {
        throw error;
      }

      logger.error("Unexpected error processing WhatsApp message", error);
      throw new MessageProcessingError(
        ERROR_MESSAGES.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        error,
      );
    }
  }

  static parseWebhookPayload(rawPayload: unknown): MessagePayload | null {
    try {
      const parsed = parseTwilioWhatsAppPayload(rawPayload);

      if (!parsed) {
        return null;
      }

      const payload: MessagePayload = {
        messageId: parsed.messageId,
        platform: Platform.WHATSAPP,
        sender: parsed.phoneNumber,
        timestamp: parsed.timestamp,
        content: parsed.content,
        attachments: [],
        metadata: {
          messageType: parsed.type,
        },
      };

      if (parsed.mediaId) {
        payload.attachments.push({
          id: parsed.mediaId,
          fileName: parsed.fileName,
          mimeType: parsed.mimeType || "application/octet-stream",
          size: undefined,
        });
      }

      return payload;
    } catch (error) {
      logger.error("Failed to parse WhatsApp webhook payload", error);
      return null;
    }
  }
}

export const whatsAppHandler = new WhatsAppMessageHandler();
