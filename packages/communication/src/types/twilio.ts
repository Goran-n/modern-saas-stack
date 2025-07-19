import { z } from "zod";

// Twilio WhatsApp webhook payload schema
export const TwilioWhatsAppWebhookSchema = z
  .object({
    MessageSid: z.string(),
    SmsSid: z.string(),
    AccountSid: z.string(),
    MessagingServiceSid: z.string().optional(),
    From: z.string(), // [prefix]+1234567890
    To: z.string(), // [prefix]+0987654321
    Body: z.string(),
    NumMedia: z.string(),
    // Media fields (MediaUrl0, MediaContentType0, etc.)
    // These are dynamic based on NumMedia
  })
  .passthrough(); // Allow additional fields like MediaUrl0, MediaUrl1, etc.

// Helper to extract media from Twilio webhook
export function extractTwilioMedia(payload: Record<string, any>): Array<{
  url: string;
  contentType: string;
}> {
  const numMedia = parseInt(payload.NumMedia || "0");
  const media: Array<{ url: string; contentType: string }> = [];

  for (let i = 0; i < numMedia; i++) {
    const url = payload[`MediaUrl${i}`];
    const contentType = payload[`MediaContentType${i}`];
    if (url && contentType) {
      media.push({ url, contentType });
    }
  }

  return media;
}

// Type for parsed Twilio message
export interface ParsedTwilioMessage {
  messageSid: string;
  from: string; // Phone number without prefix
  to: string;
  body: string;
  media: Array<{
    url: string;
    contentType: string;
  }>;
  timestamp: Date;
}
