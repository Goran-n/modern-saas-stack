import { z } from "zod";

// Email provider types
export enum EmailProvider {
  GMAIL = "gmail",
  OUTLOOK = "outlook",
  IMAP = "imap",
}

// Email connection status
export enum ConnectionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
  EXPIRED = "expired",
}

// Email processing status
export enum ProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// OAuth token types
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

// IMAP credentials
export interface IMAPCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
}

// Email connection configuration
export interface EmailConnectionConfig {
  id: string;
  tenantId: string;
  provider: EmailProvider;
  emailAddress: string;
  folderFilter: string[];
  senderFilter: string[];
  subjectFilter: string[];
  status: ConnectionStatus;
  lastSyncAt?: Date;
  lastError?: string;
  metadata?: Record<string, any>;
}

// Email message structure
export interface EmailMessage {
  messageId: string;
  threadId?: string;
  from: string;
  to: string[];
  subject: string;
  date: Date;
  body?: string;
  attachments: EmailAttachment[];
  labels?: string[];
  folder?: string;
}

// Email attachment structure
export interface EmailAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  contentId?: string;
  inline: boolean;
}

// Provider interface
export interface IEmailProvider {
  connect(config: EmailConnectionConfig, tokens?: OAuthTokens, credentials?: IMAPCredentials): Promise<void>;
  disconnect(): Promise<void>;
  
  // OAuth methods
  getAuthUrl?(redirectUri: string, state: string): string;
  exchangeCodeForTokens?(code: string, redirectUri: string): Promise<OAuthTokens>;
  refreshTokens?(refreshToken: string): Promise<OAuthTokens>;
  
  // Email operations
  listFolders(): Promise<string[]>;
  listMessages(folder: string, options: ListMessagesOptions): Promise<EmailMessage[]>;
  getMessage(messageId: string): Promise<EmailMessage>;
  getAttachment(messageId: string, attachmentId: string): Promise<Buffer>;
  markAsRead(messageId: string): Promise<void>;
  
  // Webhook operations
  subscribeToWebhook?(webhookUrl: string): Promise<string>;
  unsubscribeFromWebhook?(subscriptionId: string): Promise<void>;
}

// List messages options
export interface ListMessagesOptions {
  since?: Date;
  unreadOnly?: boolean;
  limit?: number;
  pageToken?: string;
}

// Webhook payload types
export const GmailWebhookPayloadSchema = z.object({
  message: z.object({
    data: z.string(),
    messageId: z.string(),
    publishTime: z.string(),
  }),
  subscription: z.string(),
});

export const OutlookWebhookPayloadSchema = z.object({
  value: z.array(z.object({
    subscriptionId: z.string(),
    changeType: z.string(),
    resource: z.string(),
    resourceData: z.object({
      id: z.string(),
      "@odata.type": z.string(),
      "@odata.id": z.string(),
      "@odata.etag": z.string(),
    }).optional(),
  })),
});

// Processing options
export interface ProcessingOptions {
  downloadAttachments: boolean;
  maxAttachmentSize: number;
  allowedMimeTypes: string[];
  virusScanEnabled: boolean;
}

// Processing result
export interface ProcessingResult {
  messageId: string;
  status: ProcessingStatus;
  attachmentsProcessed: number;
  fileIds: string[];
  errors?: string[];
  processingTime: number;
}

// Email filter configuration
export interface EmailFilterConfig {
  folders: string[];
  senders: {
    include?: string[];
    exclude?: string[];
  };
  subjects: {
    include?: string[];
    exclude?: string[];
    regex?: string;
  };
  hasAttachments: boolean;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

// Rate limiting configuration
export interface RateLimitConfig {
  emailsPerMinute: number;
  attachmentsPerHour: number;
  totalSizePerDay: number;
}

// Export schemas
export type GmailWebhookPayload = z.infer<typeof GmailWebhookPayloadSchema>;
export type OutlookWebhookPayload = z.infer<typeof OutlookWebhookPayloadSchema>;