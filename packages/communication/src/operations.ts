import { FILE_SOURCES, type FileSource, uploadFile } from "@figgy/file-manager";
import { createLogger } from "@figgy/utils";
import { ERROR_MESSAGES, FILE_LIMITS, SUPPORTED_MIME_TYPES, COMMUNICATION_DEFAULT_MIME_TYPE } from "./constants";
import { getSlackService } from "./services/slack";
import { getTwilioService } from "./services/twilio";
import type {
  ParsedSlackMessage,
  ParsedWhatsAppMessage,
  ProcessingResult,
} from "./types";

const logger = createLogger("communication-operations");

export async function processWhatsAppDocument(
  message: ParsedWhatsAppMessage,
  tenantId: string,
  userId: string,
): Promise<ProcessingResult> {
  try {
    if (message.type !== "document" && message.type !== "image") {
      return {
        success: false,
        error: "Message does not contain a document",
      };
    }

    logger.info("Processing WhatsApp document", {
      messageId: message.messageId,
      fileName: message.fileName,
      mimeType: message.mimeType,
    });

    if (!message.mediaId) {
      return {
        success: false,
        error: "No media URL provided in message",
      };
    }

    try {
      const twilioService = getTwilioService();
      const fileBuffer = await twilioService.downloadMedia(message.mediaId);

      const file = new File(
        [fileBuffer],
        message.fileName || `whatsapp-document-${Date.now()}.pdf`,
        { type: message.mimeType || COMMUNICATION_DEFAULT_MIME_TYPE },
      );

      return await _createFileAndTriggerJob(
        file,
        tenantId,
        userId,
        FILE_SOURCES.WHATSAPP,
      );
    } catch (downloadError) {
      logger.error("Failed to download WhatsApp media", {
        mediaId: message.mediaId,
        error: downloadError,
      });
      return {
        success: false,
        error: `Failed to download media: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`,
      };
    }
  } catch (error) {
    logger.error("Error processing WhatsApp document", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function processSlackFiles(
  message: ParsedSlackMessage,
  _tenantId: string,
  _userId: string,
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (const file of message.files) {
    try {
      logger.info("Processing Slack file", {
        fileId: file.id,
        fileName: file.name,
        size: file.size,
      });

      if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
        results.push({
          success: false,
          error: `File ${file.name} ${ERROR_MESSAGES.FILE_SIZE_EXCEEDED} (${FILE_LIMITS.MAX_SIZE_LABEL})`,
        });
        continue;
      }

      if (
        !SUPPORTED_MIME_TYPES.SLACK.some((type) => file.mimeType.includes(type))
      ) {
        results.push({
          success: false,
          error: `${ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${file.mimeType}`,
        });
        continue;
      }

      try {
        // Download the file from Slack
        const slackService = getSlackService();
        const fileBuffer = await slackService.downloadFile(file.downloadUrl);

        // Create a File object from the buffer
        const fileObj = new File([fileBuffer], file.name, {
          type: file.mimeType,
        });

        // Upload using the helper function
        const result = await _createFileAndTriggerJob(
          fileObj,
          _tenantId,
          _userId,
          FILE_SOURCES.SLACK,
        );
        results.push(result);
      } catch (downloadError) {
        logger.error("Failed to download Slack file", {
          fileId: file.id,
          error: downloadError,
        });
        results.push({
          success: false,
          error: `Failed to download file: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`,
        });
      }
    } catch (error) {
      logger.error("Error processing Slack file", { fileId: file.id, error });
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

async function _createFileAndTriggerJob(
  file: File,
  tenantId: string,
  userId: string,
  source:
    | typeof FILE_SOURCES.WHATSAPP
    | typeof FILE_SOURCES.INTEGRATION
    | typeof FILE_SOURCES.SLACK,
): Promise<ProcessingResult> {
  try {
    const fileId = await uploadFile(file, {
      mimeType: file.type,
      size: file.size,
      source: source as FileSource,
      sourceId: "",
      metadata: {
        originalFileName: file.name,
        communicationSource: source,
      },
      tenantId,
      uploadedBy: userId,
      bucket: "",
    });

    return {
      success: true,
      fileId,
      jobId: "triggered-by-file-manager",
    };
  } catch (error) {
    logger.error("Error creating file and triggering job", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Re-export all database operations
export * from "./operations/index";
