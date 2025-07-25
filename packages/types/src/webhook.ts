import { z } from 'zod';

// Slack webhook types
export const SlackEventTypeSchema = z.enum([
  'message',
  'app_mention',
  'file_shared',
  'url_verification',
]);

export const SlackEventSchema = z.object({
  type: SlackEventTypeSchema,
  user: z.string(),
  text: z.string().optional(),
  ts: z.string(),
  channel: z.string(),
  thread_ts: z.string().optional(),
  files: z.array(z.object({
    id: z.string(),
    name: z.string(),
    mimetype: z.string(),
    size: z.number(),
  })).optional(),
});

export const SlackWebhookBodySchema = z.object({
  type: z.string(),
  token: z.string().optional(),
  team_id: z.string(),
  event: SlackEventSchema.optional(),
  challenge: z.string().optional(), // For URL verification
});

// WhatsApp webhook types
export const WhatsAppWebhookBodySchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string().optional(),
  MediaUrl0: z.string().url().optional(),
  MediaContentType0: z.string().optional(),
  NumMedia: z.string().optional(),
  MessageSid: z.string(),
});

// Type exports
export type SlackEventType = z.infer<typeof SlackEventTypeSchema>;
export type SlackEvent = z.infer<typeof SlackEventSchema>;
export type SlackWebhookBody = z.infer<typeof SlackWebhookBodySchema>;
export type WhatsAppWebhookBody = z.infer<typeof WhatsAppWebhookBodySchema>;