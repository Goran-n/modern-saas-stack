import { createLogger } from '@kibly/utils';
import { BaseMessageHandler, MessagePayload, ValidationResult, MessageProcessingError } from '../interfaces/message-handler';
import { Platform, ProcessingResult } from '../types';
import { processWhatsAppDocument } from '../operations';
import { parseTwilioWhatsAppPayload } from '../parsers/twilio';
import { FILE_LIMITS, SUPPORTED_MIME_TYPES, ERROR_MESSAGES, ERROR_CODES } from '../constants';

const logger = createLogger('whatsapp-handler');

export class WhatsAppMessageHandler extends BaseMessageHandler {
  constructor() {
    super([Platform.WHATSAPP]);
  }

  protected async validatePlatformSpecific(payload: MessagePayload): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!payload.content && (!payload.attachments || payload.attachments.length === 0)) {
      errors.push(ERROR_MESSAGES.NO_CONTENT_OR_ATTACHMENTS);
    }

    if (payload.attachments) {
      for (const attachment of payload.attachments) {
        if (!attachment.mimeType) {
          errors.push(`${ERROR_MESSAGES.MISSING_MIME_TYPE}: ${attachment.id}`);
        }
        
        if (attachment.mimeType && !SUPPORTED_MIME_TYPES.WHATSAPP.some(type => attachment.mimeType.includes(type))) {
          errors.push(`${ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${attachment.mimeType}`);
        }

        if (attachment.size && attachment.size > FILE_LIMITS.MAX_SIZE_BYTES) {
          errors.push(`${attachment.fileName || attachment.id} ${ERROR_MESSAGES.FILE_SIZE_EXCEEDED} (${FILE_LIMITS.MAX_SIZE_LABEL})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async process(
    payload: MessagePayload,
    tenantId: string,
    userId: string
  ): Promise<ProcessingResult> {
    try {
      logger.info('Processing WhatsApp message', {
        messageId: payload.messageId,
        sender: payload.sender,
        attachmentCount: payload.attachments.length
      });

      if (!payload.attachments || payload.attachments.length === 0) {
        logger.info('Received text-only WhatsApp message', {
          from: payload.sender,
          content: payload.content
        });
        
        return {
          success: true,
          error: ERROR_MESSAGES.TEXT_ONLY_MESSAGE
        };
      }

      const attachment = payload.attachments[0];
      
      if (!attachment) {
        throw new MessageProcessingError(
          ERROR_MESSAGES.NO_ATTACHMENT,
          ERROR_CODES.NO_ATTACHMENT
        );
      }

      const parsedMessage = {
        messageId: payload.messageId,
        phoneNumber: payload.sender,
        timestamp: payload.timestamp,
        type: attachment.mimeType.includes('pdf') ? 'document' as const : 'image' as const,
        content: payload.content,
        mediaId: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType
      };

      const result = await processWhatsAppDocument(parsedMessage, tenantId, userId);
      
      if (!result.success) {
        throw new MessageProcessingError(
          result.error || ERROR_MESSAGES.PROCESSING_FAILED,
          ERROR_CODES.PROCESSING_FAILED
        );
      }

      return result;
    } catch (error) {
      if (error instanceof MessageProcessingError) {
        throw error;
      }
      
      logger.error('Unexpected error processing WhatsApp message', error);
      throw new MessageProcessingError(
        ERROR_MESSAGES.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        error
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
          messageType: parsed.type
        }
      };

      if (parsed.mediaId) {
        payload.attachments.push({
          id: parsed.mediaId,
          fileName: parsed.fileName,
          mimeType: parsed.mimeType || 'application/octet-stream',
          size: undefined
        });
      }

      return payload;
    } catch (error) {
      logger.error('Failed to parse WhatsApp webhook payload', error);
      return null;
    }
  }
}

export const whatsAppHandler = new WhatsAppMessageHandler();