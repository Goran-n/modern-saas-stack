// Communication constants - no need for config
export const FILE_LIMITS = {
  MAX_SIZE_BYTES: 16 * 1024 * 1024, // 16MB
  MAX_SIZE_LABEL: "16MB",
} as const;

export const SUPPORTED_MIME_TYPES = {
  WHATSAPP: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  SLACK: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
    "application/json",
    "application/xml",
  ],
} as const;

export const ERROR_MESSAGES = {
  NO_CONTENT_OR_ATTACHMENTS:
    "Message must contain either text content or attachments",
  MISSING_MIME_TYPE: "Attachment is missing MIME type",
  FILE_SIZE_EXCEEDED: "File exceeds maximum size limit",
  UNSUPPORTED_FILE_TYPE: "Unsupported file type",
  NO_ATTACHMENT: "No valid attachment found",
  PROCESSING_FAILED: "Failed to process document",
  INTERNAL_ERROR: "Internal processing error",
  TEXT_ONLY_MESSAGE: "Text messages are not processed",
  ALL_FILES_FAILED: "All files failed to process",
  SLACK_MISSING_CHANNEL: "Slack message must include channel ID in metadata",
  SLACK_MISSING_WORKSPACE:
    "Slack message must include workspace ID in metadata",
  SLACK_MISSING_URL: "Attachment is missing download URL",
  SLACK_MISSING_SIZE: "Attachment is missing file size",
} as const;

export const ERROR_CODES = {
  NO_ATTACHMENT: "NO_ATTACHMENT",
  PROCESSING_FAILED: "PROCESSING_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  ALL_FILES_FAILED: "ALL_FILES_FAILED",
} as const;

// Communication specific constants
export const COMMUNICATION_DEFAULT_MIME_TYPE = "application/octet-stream";
export const COMMUNICATION_WHATSAPP_PREFIX = "whatsapp:";