import type { CommunicationConfig } from "@figgy/config";
import { getConfig } from "@figgy/config";

// Lazy-loaded configuration
let _config: CommunicationConfig | null = null;

function getCommConfig(): CommunicationConfig {
  if (!_config) {
    _config = getConfig().getForCommunication();
  }
  return _config;
}

// Use getters for lazy evaluation
export const FILE_LIMITS = {
  get MAX_SIZE_BYTES() {
    return getCommConfig().COMMUNICATION_MAX_FILE_SIZE;
  },
  get MAX_SIZE_LABEL() {
    return `${Math.round(getCommConfig().COMMUNICATION_MAX_FILE_SIZE / (1024 * 1024))}MB`;
  },
} as const;

export const SUPPORTED_MIME_TYPES = {
  get WHATSAPP() {
    return getCommConfig().COMMUNICATION_WHATSAPP_MIME_TYPES;
  },
  get SLACK() {
    return getCommConfig().COMMUNICATION_SLACK_MIME_TYPES;
  },
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
