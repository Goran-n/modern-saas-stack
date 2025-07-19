import { createLogger } from '@kibly/utils';
import { uploadFile, FILE_SOURCES, type FileSource } from '@kibly/file-manager';
import { getConfig } from '@kibly/config';
import { getTwilioService } from './services/twilio';
import type { 
  ParsedWhatsAppMessage, 
  ParsedSlackMessage, 
  ProcessingResult 
} from './types';
import { FILE_LIMITS, ERROR_MESSAGES, SUPPORTED_MIME_TYPES } from './constants';

const logger = createLogger('communication-operations');

export async function processWhatsAppDocument(
  message: ParsedWhatsAppMessage,
  tenantId: string,
  userId: string
): Promise<ProcessingResult> {
  try {
    if (message.type !== 'document' && message.type !== 'image') {
      return {
        success: false,
        error: 'Message does not contain a document'
      };
    }

    logger.info('Processing WhatsApp document', {
      messageId: message.messageId,
      fileName: message.fileName,
      mimeType: message.mimeType
    });

    if (!message.mediaId) {
      return {
        success: false,
        error: 'No media URL provided in message'
      };
    }

    try {
      const twilioService = getTwilioService();
      const fileBuffer = await twilioService.downloadMedia(message.mediaId);
      
      const config = getConfig().getForCommunication();
      const file = new File(
        [fileBuffer], 
        message.fileName || `whatsapp-document-${Date.now()}.pdf`,
        { type: message.mimeType || config.COMMUNICATION_DEFAULT_MIME_TYPE }
      );

      return await _createFileAndTriggerJob(file, tenantId, userId, FILE_SOURCES.WHATSAPP);
    } catch (downloadError) {
      logger.error('Failed to download WhatsApp media', { 
        mediaId: message.mediaId,
        error: downloadError 
      });
      return {
        success: false,
        error: `Failed to download media: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`
      };
    }
  } catch (error) {
    logger.error('Error processing WhatsApp document', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function processSlackFiles(
  message: ParsedSlackMessage,
  _tenantId: string,
  _userId: string
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (const file of message.files) {
    try {
      logger.info('Processing Slack file', {
        fileId: file.id,
        fileName: file.name,
        size: file.size
      });

      if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
        results.push({
          success: false,
          error: `File ${file.name} ${ERROR_MESSAGES.FILE_SIZE_EXCEEDED} (${FILE_LIMITS.MAX_SIZE_LABEL})`
        });
        continue;
      }

      if (!SUPPORTED_MIME_TYPES.SLACK.some(type => file.mimeType.includes(type))) {
        results.push({
          success: false,
          error: `${ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${file.mimeType}`
        });
        continue;
      }

      results.push({
        success: false,
        error: 'Slack file download not yet implemented'
      });
    } catch (error) {
      logger.error('Error processing Slack file', { fileId: file.id, error });
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

async function _createFileAndTriggerJob(
  file: File,
  tenantId: string,
  userId: string,
  source: typeof FILE_SOURCES.WHATSAPP | typeof FILE_SOURCES.INTEGRATION
): Promise<ProcessingResult> {
  try {
    const fileId = await uploadFile(file, {
      fileName: file.name,
      pathTokens: ['communications', source],
      mimeType: file.type,
      size: file.size,
      source: source as FileSource,
      tenantId,
      uploadedBy: userId
    });

    return {
      success: true,
      fileId,
      jobId: 'triggered-by-file-manager'
    };
  } catch (error) {
    logger.error('Error creating file and triggering job', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}