import { z } from "zod";

/**
 * Email service configuration schema
 */
export const emailSchema = z.object({
  /**
   * Resend API key for sending emails
   * @required
   */
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  /**
   * Email sender address
   * @default 'hello@figgy.com'
   */
  EMAIL_FROM_ADDRESS: z.string().email().default("hello@figgy.com"),

  /**
   * Email sender name
   * @default 'Figgy'
   */
  EMAIL_FROM_NAME: z.string().default("Figgy"),

  /**
   * Base URL for invitation links
   * Uses BASE_URL if not specified
   * @example "https://app.figgy.com"
   */
  INVITATION_BASE_URL: z.string().url().optional(),
});

export type EmailConfig = z.infer<typeof emailSchema>;