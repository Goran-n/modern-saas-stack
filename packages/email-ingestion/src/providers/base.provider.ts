import { createLogger, type Logger } from "@figgy/utils";
import type {
  EmailAttachment,
  EmailConnectionConfig,
  EmailMessage,
  IEmailProvider,
  IMAPCredentials,
  ListMessagesOptions,
  OAuthTokens,
} from "../types";

export abstract class BaseEmailProvider implements IEmailProvider {
  protected logger: Logger;
  protected config?: EmailConnectionConfig;
  protected tokens?: OAuthTokens;
  protected credentials?: IMAPCredentials;
  protected connected: boolean = false;
  
  constructor(providerName: string) {
    this.logger = createLogger(`email-provider-${providerName}`);
  }
  
  /**
   * Connect to the email provider
   */
  async connect(
    config: EmailConnectionConfig,
    tokens?: OAuthTokens,
    credentials?: IMAPCredentials
  ): Promise<void> {
    this.config = config;
    this.tokens = tokens;
    this.credentials = credentials;
    
    this.logger.info("Connecting to email provider", {
      provider: config.provider,
      emailAddress: config.emailAddress,
    });
    
    try {
      await this.doConnect();
      this.connected = true;
      this.logger.info("Successfully connected to email provider");
    } catch (error) {
      this.connected = false;
      this.logger.error("Failed to connect to email provider", { error });
      throw error;
    }
  }
  
  /**
   * Disconnect from the email provider
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    this.logger.info("Disconnecting from email provider");
    
    try {
      await this.doDisconnect();
      this.connected = false;
      this.config = undefined;
      this.tokens = undefined;
      this.credentials = undefined;
      this.logger.info("Successfully disconnected from email provider");
    } catch (error) {
      this.logger.error("Error during disconnect", { error });
      throw error;
    }
  }
  
  /**
   * Ensure the provider is connected
   */
  protected ensureConnected(): void {
    if (!this.connected || !this.config) {
      throw new Error("Provider not connected");
    }
  }
  
  /**
   * Filter messages based on configuration
   */
  protected filterMessages(messages: EmailMessage[]): EmailMessage[] {
    if (!this.config) {
      return messages;
    }
    
    let filtered = messages;
    
    // Apply sender filter
    if (this.config.senderFilter.length > 0) {
      filtered = filtered.filter(msg => 
        this.config!.senderFilter.some(sender => 
          msg.from.toLowerCase().includes(sender.toLowerCase())
        )
      );
    }
    
    // Apply subject filter
    if (this.config.subjectFilter.length > 0) {
      filtered = filtered.filter(msg =>
        this.config!.subjectFilter.some(subject =>
          msg.subject.toLowerCase().includes(subject.toLowerCase())
        )
      );
    }
    
    return filtered;
  }
  
  /**
   * Check if attachment should be processed
   */
  protected shouldProcessAttachment(attachment: EmailAttachment): boolean {
    // Skip inline images
    if (attachment.inline) {
      return false;
    }
    
    // Check size limit (25MB)
    const maxSize = 25 * 1024 * 1024;
    if (attachment.size > maxSize) {
      this.logger.warn("Attachment too large", {
        fileName: attachment.fileName,
        size: attachment.size,
        maxSize,
      });
      return false;
    }
    
    // Check mime type
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    
    if (!allowedMimeTypes.some(type => attachment.mimeType.includes(type))) {
      this.logger.warn("Unsupported attachment type", {
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
      });
      return false;
    }
    
    return true;
  }
  
  // Abstract methods to be implemented by specific providers
  protected abstract doConnect(): Promise<void>;
  protected abstract doDisconnect(): Promise<void>;
  
  abstract listFolders(): Promise<string[]>;
  abstract listMessages(folder: string, options: ListMessagesOptions): Promise<EmailMessage[]>;
  abstract getMessage(messageId: string): Promise<EmailMessage>;
  abstract getAttachment(messageId: string, attachmentId: string): Promise<Buffer>;
  abstract markAsRead(messageId: string): Promise<void>;
  
  // Optional OAuth methods
  getAuthUrl?(redirectUri: string, state: string): string;
  exchangeCodeForTokens?(code: string, redirectUri: string): Promise<OAuthTokens>;
  refreshTokens?(refreshToken: string): Promise<OAuthTokens>;
  
  // Optional webhook methods
  subscribeToWebhook?(webhookUrl: string): Promise<string>;
  unsubscribeFromWebhook?(subscriptionId: string): Promise<void>;
}