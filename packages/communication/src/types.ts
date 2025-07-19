import { z } from 'zod';

// Platform types
export enum Platform {
  WHATSAPP = 'whatsapp',
  SLACK = 'slack'
}

// Removed MessageSource - use Platform enum or FILE_SOURCES from file-manager instead

// Processing result
export interface ProcessingResult {
  success: boolean;
  fileId?: string | undefined;
  jobId?: string | undefined;
  error?: string | undefined;
}

// WhatsApp webhook payload schemas
export const WhatsAppWebhookPayloadSchema = z.object({
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string()
        }),
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          timestamp: z.string(),
          type: z.enum(['text', 'image', 'document', 'audio', 'video']),
          text: z.object({
            body: z.string()
          }).optional(),
          document: z.object({
            filename: z.string().optional(),
            mime_type: z.string(),
            sha256: z.string(),
            id: z.string()
          }).optional(),
          image: z.object({
            mime_type: z.string(),
            sha256: z.string(),
            id: z.string()
          }).optional()
        })).optional()
      })
    }))
  }))
});

// Slack webhook payload schemas
export const SlackEventPayloadSchema = z.object({
  token: z.string(),
  team_id: z.string(),
  api_app_id: z.string(),
  event: z.object({
    type: z.string(),
    user: z.string(),
    ts: z.string(),
    channel: z.string(),
    files: z.array(z.object({
      id: z.string(),
      name: z.string(),
      mimetype: z.string(),
      size: z.number(),
      url_private: z.string(),
      url_private_download: z.string()
    })).optional()
  }),
  type: z.literal('event_callback'),
  event_id: z.string(),
  event_time: z.number()
});

// Parsed message types
export interface ParsedWhatsAppMessage {
  messageId: string;
  phoneNumber: string;
  timestamp: Date;
  type: 'text' | 'document' | 'image';
  content?: string | undefined;
  mediaId?: string | undefined;
  fileName?: string | undefined;
  mimeType?: string | undefined;
}

export interface ParsedSlackMessage {
  messageId: string;
  userId: string;
  channelId: string;
  workspaceId: string;
  timestamp: Date;
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
  }>;
}

