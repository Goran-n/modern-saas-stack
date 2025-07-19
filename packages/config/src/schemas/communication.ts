import { z } from "zod";

/**
 * Communication service configuration schema
 * Settings for file uploads and message processing
 */
export const communicationServiceSchema = z.object({
  /**
   * Maximum file size in bytes
   * @default 52428800 (50MB)
   */
  COMMUNICATION_MAX_FILE_SIZE: z.coerce
    .number()
    .int()
    .min(1048576) // 1MB minimum
    .max(104857600) // 100MB maximum
    .default(52428800) // 50MB default
    .describe("Maximum file size allowed for uploads in bytes"),

  /**
   * Supported MIME types for WhatsApp
   * @default ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
   */
  COMMUNICATION_WHATSAPP_MIME_TYPES: z
    .string()
    .default("application/pdf,image/png,image/jpeg,image/jpg")
    .transform((val) => val.split(",").map((s) => s.trim()))
    .describe("Comma-separated list of supported MIME types for WhatsApp"),

  /**
   * Supported MIME types for Slack
   * @default ['application/pdf']
   */
  COMMUNICATION_SLACK_MIME_TYPES: z
    .string()
    .default("application/pdf")
    .transform((val) => val.split(",").map((s) => s.trim()))
    .describe("Comma-separated list of supported MIME types for Slack"),

  /**
   * Default MIME type for unknown files
   * @default 'application/pdf'
   */
  COMMUNICATION_DEFAULT_MIME_TYPE: z
    .string()
    .default("application/pdf")
    .describe("Default MIME type to use when file type is unknown"),

  /**
   * WhatsApp prefix for phone numbers
   * @default 'whatsapp:'
   */
  COMMUNICATION_WHATSAPP_PREFIX: z
    .string()
    .default("whatsapp:")
    .describe("Prefix to add to phone numbers for WhatsApp"),
});

export type CommunicationServiceConfig = z.infer<
  typeof communicationServiceSchema
>;
