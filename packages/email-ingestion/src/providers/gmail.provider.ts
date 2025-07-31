import { getConfig } from "@figgy/config";
import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import type {
  EmailAttachment,
  EmailMessage,
  ListMessagesOptions,
  OAuthTokens,
} from "../types";
import { BaseEmailProvider } from "./base.provider";

export class GmailProvider extends BaseEmailProvider {
  private oauth2Client?: OAuth2Client;
  private gmailClient?: gmail_v1.Gmail;
  
  constructor() {
    super("gmail");
  }
  
  /**
   * Get OAuth2 authorization URL
   */
  override getAuthUrl(redirectUri: string, state: string): string {
    const config = getConfig().getCore();
    
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }
    
    this.oauth2Client = new OAuth2Client(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state,
      prompt: "consent",
    });
  }
  
  /**
   * Exchange authorization code for tokens
   */
  override async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const config = getConfig().getCore();
    
    if (!this.oauth2Client) {
      this.oauth2Client = new OAuth2Client(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
    }
    
    const { tokens } = await this.oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error("No access token received");
    }
    
    const result: OAuthTokens = {
      accessToken: tokens.access_token,
    };
    
    if (tokens.refresh_token) {
      result.refreshToken = tokens.refresh_token;
    }
    
    if (tokens.expiry_date) {
      result.expiresAt = new Date(tokens.expiry_date);
    }
    
    if (tokens.scope) {
      result.scope = tokens.scope;
    }
    
    return result;
  }
  
  /**
   * Refresh access token
   */
  override async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const config = getConfig().getCore();
    
    if (!this.oauth2Client) {
      this.oauth2Client = new OAuth2Client(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET
      );
    }
    
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token");
    }
    
    const result: OAuthTokens = {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
    };
    
    if (credentials.expiry_date) {
      result.expiresAt = new Date(credentials.expiry_date);
    }
    
    if (credentials.scope) {
      result.scope = credentials.scope;
    }
    
    return result;
  }
  
  /**
   * Connect to Gmail API
   */
  protected async doConnect(): Promise<void> {
    if (!this.tokens) {
      throw new Error("OAuth tokens required for Gmail connection");
    }
    
    const config = getConfig().getCore();
    
    this.oauth2Client = new OAuth2Client(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET
    );
    
    this.oauth2Client.setCredentials({
      access_token: this.tokens.accessToken,
      refresh_token: this.tokens.refreshToken || null,
    });
    
    this.gmailClient = google.gmail({
      version: 'v1',
      auth: this.oauth2Client,
    });
    
    // Test connection
    await this.gmailClient.users.getProfile({ userId: "me" });
  }
  
  /**
   * Disconnect from Gmail API
   */
  protected async doDisconnect(): Promise<void> {
    delete this.oauth2Client;
    delete this.gmailClient;
  }
  
  /**
   * List available folders/labels
   */
  async listFolders(): Promise<string[]> {
    this.ensureConnected();
    
    const response = await this.gmailClient!.users.labels.list({
      userId: "me",
    });
    
    const labels = response.data.labels || [];
    return labels
      .filter(label => label.name && label.type !== "system")
      .map(label => label.name!);
  }
  
  /**
   * List messages in a folder
   */
  async listMessages(folder: string, options: ListMessagesOptions): Promise<EmailMessage[]> {
    this.ensureConnected();
    
    const query: string[] = [];
    
    // Add label filter
    if (folder !== "INBOX") {
      query.push(`label:${folder}`);
    } else {
      query.push("in:inbox");
    }
    
    // Add unread filter
    if (options.unreadOnly) {
      query.push("is:unread");
    }
    
    // Add date filter
    if (options.since) {
      const dateStr = options.since.toISOString().split("T")[0];
      query.push(`after:${dateStr}`);
    }
    
    // Add attachment filter
    query.push("has:attachment");
    
    const listParams: any = {
      userId: "me",
      q: query.join(" "),
      maxResults: options.limit || 50,
    };
    
    if (options.pageToken) {
      listParams.pageToken = options.pageToken;
    }
    
    const response = await this.gmailClient!.users.messages.list(listParams);
    
    const messages: EmailMessage[] = [];
    
    if (response.data.messages) {
      for (const msgRef of response.data.messages) {
        if (msgRef.id) {
          try {
            const message = await this.getMessage(msgRef.id);
            messages.push(message);
          } catch (error) {
            this.logger.error("Failed to fetch message", { messageId: msgRef.id, error });
          }
        }
      }
    }
    
    return this.filterMessages(messages);
  }
  
  /**
   * Get a specific message
   */
  async getMessage(messageId: string): Promise<EmailMessage> {
    this.ensureConnected();
    
    const response = await this.gmailClient!.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });
    
    const msg = response.data;
    const payload = msg.payload!;
    const headers = payload.headers || [];
    
    // Extract headers
    const getHeader = (name: string): string => {
      const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || "";
    };
    
    // Parse attachments
    const attachments: EmailAttachment[] = [];
    this.parseAttachments(payload, attachments);
    
    const result: EmailMessage = {
      messageId: msg.id!,
      from: getHeader("from"),
      to: getHeader("to").split(",").map(e => e.trim()),
      subject: getHeader("subject"),
      date: new Date(parseInt(msg.internalDate || "0")),
      body: this.extractBody(payload),
      attachments,
    };
    
    if (msg.threadId) {
      result.threadId = msg.threadId;
    }
    
    if (msg.labelIds) {
      result.labels = msg.labelIds;
    }
    
    return result;
  }
  
  /**
   * Download an attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    this.ensureConnected();
    
    const response = await this.gmailClient!.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });
    
    if (!response.data.data) {
      throw new Error("No attachment data received");
    }
    
    // Decode base64url
    const base64 = response.data.data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  }
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    this.ensureConnected();
    
    await this.gmailClient!.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });
  }
  
  /**
   * Subscribe to Gmail push notifications via Pub/Sub
   */
  override async subscribeToWebhook(_webhookUrl: string): Promise<string> {
    this.ensureConnected();
    
    const config = getConfig().getCore();
    
    if (!config.GOOGLE_PUBSUB_TOPIC) {
      throw new Error("GOOGLE_PUBSUB_TOPIC not configured");
    }
    
    const response = await this.gmailClient!.users.watch({
      userId: "me",
      requestBody: {
        topicName: config.GOOGLE_PUBSUB_TOPIC,
        labelIds: ["INBOX"],
      },
    });
    
    return response.data.historyId || "";
  }
  
  /**
   * Unsubscribe from webhooks
   */
  override async unsubscribeFromWebhook(_subscriptionId: string): Promise<void> {
    this.ensureConnected();
    
    await this.gmailClient!.users.stop({
      userId: "me",
    });
  }
  
  /**
   * Parse attachments from message payload
   */
  private parseAttachments(
    part: gmail_v1.Schema$MessagePart,
    attachments: EmailAttachment[]
  ): void {
    if (part.filename && part.body?.attachmentId) {
      const attachment: EmailAttachment = {
        id: part.body.attachmentId,
        fileName: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body.size || 0,
        inline: false,
      };
      
      // Check if it's an inline image
      const headers = part.headers || [];
      const contentDisposition = headers.find(
        h => h.name?.toLowerCase() === "content-disposition"
      );
      if (contentDisposition?.value?.includes("inline")) {
        attachment.inline = true;
        const contentId = headers.find(h => h.name?.toLowerCase() === "content-id");
        if (contentId?.value) {
          attachment.contentId = contentId.value.replace(/[<>]/g, "");
        }
      }
      
      if (this.shouldProcessAttachment(attachment)) {
        attachments.push(attachment);
      }
    }
    
    // Recursively check parts
    if (part.parts) {
      for (const subPart of part.parts) {
        this.parseAttachments(subPart, attachments);
      }
    }
  }
  
  /**
   * Extract body text from message
   */
  private extractBody(payload: gmail_v1.Schema$MessagePart): string {
    let body = "";
    
    const extractText = (part: gmail_v1.Schema$MessagePart): void => {
      if (part.mimeType === "text/plain" && part.body?.data) {
        const decoded = Buffer.from(part.body.data, "base64").toString("utf-8");
        body += decoded + "\n";
      }
      
      if (part.parts) {
        for (const subPart of part.parts) {
          extractText(subPart);
        }
      }
    };
    
    extractText(payload);
    return body.trim();
  }
}