import { z } from "zod";

/**
 * Twilio configuration schema
 * Environment variables for WhatsApp integration via Twilio
 */
export const twilioSchema = z.object({
  /**
   * Twilio Account SID
   * Found in your Twilio Console
   */
  TWILIO_ACCOUNT_SID: z.string().min(1).describe("Twilio Account SID"),

  /**
   * Twilio Auth Token
   * Keep this secret!
   */
  TWILIO_AUTH_TOKEN: z.string().min(1).describe("Twilio Auth Token"),

  /**
   * Twilio WhatsApp Number
   * Format: +1234567890 (without 'whatsapp:' prefix)
   */
  TWILIO_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\+\d+$/)
    .describe("Twilio WhatsApp number in E.164 format"),

  /**
   * Webhook URL (optional)
   * Used for reference/documentation, actual webhook URL is set in Twilio Console
   */
  TWILIO_WEBHOOK_URL: z
    .string()
    .url()
    .optional()
    .describe("Webhook URL configured in Twilio"),

  /**
   * WhatsApp Webhook Verification Token (optional)
   * Used to verify webhook requests are from Twilio
   */
  WHATSAPP_VERIFY_TOKEN: z
    .string()
    .optional()
    .default("figgy-whatsapp-verify")
    .describe("Token for webhook verification"),
});

export type TwilioConfig = z.infer<typeof twilioSchema>;
