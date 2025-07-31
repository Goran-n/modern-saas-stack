import { getConfig } from "@figgy/config";
import { Client } from "@microsoft/microsoft-graph-client";
import type {
  EmailAttachment,
  EmailMessage,
  ListMessagesOptions,
  OAuthTokens,
} from "../types";
import { BaseEmailProvider } from "./base.provider";

export class OutlookProvider extends BaseEmailProvider {
  private graphClient?: Client;
  
  constructor() {
    super("outlook");
  }
  
  /**
   * Get OAuth2 authorization URL
   */
  override getAuthUrl(redirectUri: string, state: string): string {
    const config = getConfig().getCore();
    
    if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_TENANT_ID) {
      throw new Error("Microsoft OAuth credentials not configured");
    }
    
    const scopes = [
      "Mail.Read",
      "Mail.ReadWrite",
      "offline_access",
    ].join(" ");
    
    const params = new URLSearchParams({
      client_id: config.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: scopes,
      state,
    });
    
    return `https://login.microsoftonline.com/${config.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  override async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const config = getConfig().getCore();
    
    if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET || !config.MICROSOFT_TENANT_ID) {
      throw new Error("Microsoft OAuth credentials not configured");
    }
    
    const tokenUrl = `https://login.microsoftonline.com/${config.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: config.MICROSOFT_CLIENT_ID,
      client_secret: config.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    
    const data = await response.json() as any;
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }
  
  /**
   * Refresh access token
   */
  override async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const config = getConfig().getCore();
    
    if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET || !config.MICROSOFT_TENANT_ID) {
      throw new Error("Microsoft OAuth credentials not configured");
    }
    
    const tokenUrl = `https://login.microsoftonline.com/${config.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: config.MICROSOFT_CLIENT_ID,
      client_secret: config.MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }
    
    const data = await response.json() as any;
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }
  
  /**
   * Connect to Microsoft Graph API
   */
  protected async doConnect(): Promise<void> {
    if (!this.tokens) {
      throw new Error("OAuth tokens required for Outlook connection");
    }
    
    // Custom authentication provider
    const authProvider = {
      getAccessToken: async () => {
        // Check if token is expired
        if (this.tokens!.expiresAt && this.tokens!.expiresAt < new Date()) {
          if (this.tokens!.refreshToken) {
            this.tokens = await this.refreshTokens(this.tokens!.refreshToken);
          } else {
            throw new Error("Access token expired and no refresh token available");
          }
        }
        return this.tokens!.accessToken;
      },
    };
    
    this.graphClient = Client.initWithMiddleware({
      authProvider,
    });
    
    // Test connection
    await this.graphClient.api("/me").get();
  }
  
  /**
   * Disconnect from Microsoft Graph API
   */
  protected async doDisconnect(): Promise<void> {
    delete this.graphClient;
  }
  
  /**
   * List available folders
   */
  async listFolders(): Promise<string[]> {
    this.ensureConnected();
    
    const folders = await this.graphClient!
      .api("/me/mailFolders")
      .select("displayName,id")
      .get();
    
    return folders.value.map((folder: any) => folder.displayName);
  }
  
  /**
   * List messages in a folder
   */
  async listMessages(folder: string, options: ListMessagesOptions): Promise<EmailMessage[]> {
    this.ensureConnected();
    
    let query = this.graphClient!.api("/me/messages");
    
    // Build filter
    const filters: string[] = ["hasAttachments eq true"];
    
    // Add folder filter
    if (folder !== "INBOX") {
      const folderId = await this.getFolderId(folder);
      query = this.graphClient!.api(`/me/mailFolders/${folderId}/messages`);
    }
    
    // Add unread filter
    if (options.unreadOnly) {
      filters.push("isRead eq false");
    }
    
    // Add date filter
    if (options.since) {
      filters.push(`receivedDateTime ge ${options.since.toISOString()}`);
    }
    
    query = query
      .filter(filters.join(" and "))
      .select("id,subject,from,toRecipients,receivedDateTime,hasAttachments,isRead")
      .orderby("receivedDateTime desc")
      .top(options.limit || 50);
    
    if (options.pageToken) {
      query = query.skipToken(options.pageToken);
    }
    
    const response = await query.get();
    
    const messages: EmailMessage[] = [];
    
    for (const msg of response.value) {
      try {
        const fullMessage = await this.getMessage(msg.id);
        messages.push(fullMessage);
      } catch (error) {
        this.logger.error("Failed to fetch message", { messageId: msg.id, error });
      }
    }
    
    return this.filterMessages(messages);
  }
  
  /**
   * Get a specific message
   */
  async getMessage(messageId: string): Promise<EmailMessage> {
    this.ensureConnected();
    
    const message = await this.graphClient!
      .api(`/me/messages/${messageId}`)
      .expand("attachments")
      .get();
    
    const attachments: EmailAttachment[] = [];
    
    if (message.attachments && message.attachments.length > 0) {
      for (const att of message.attachments) {
        if (att["@odata.type"] === "#microsoft.graph.fileAttachment") {
          const attachment: EmailAttachment = {
            id: att.id,
            fileName: att.name,
            mimeType: att.contentType,
            size: att.size,
            inline: att.isInline || false,
            contentId: att.contentId,
          };
          
          if (this.shouldProcessAttachment(attachment)) {
            attachments.push(attachment);
          }
        }
      }
    }
    
    return {
      messageId: message.id,
      threadId: message.conversationId,
      from: message.from.emailAddress.address,
      to: message.toRecipients.map((r: any) => r.emailAddress.address),
      subject: message.subject,
      date: new Date(message.receivedDateTime),
      body: message.bodyPreview,
      attachments,
      folder: message.parentFolderId,
    };
  }
  
  /**
   * Download an attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    this.ensureConnected();
    
    const attachment = await this.graphClient!
      .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
      .get();
    
    if (attachment["@odata.type"] !== "#microsoft.graph.fileAttachment") {
      throw new Error("Not a file attachment");
    }
    
    return Buffer.from(attachment.contentBytes, "base64");
  }
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    this.ensureConnected();
    
    await this.graphClient!
      .api(`/me/messages/${messageId}`)
      .patch({
        isRead: true,
      });
  }
  
  /**
   * Subscribe to Microsoft Graph webhooks
   */
  override async subscribeToWebhook(webhookUrl: string): Promise<string> {
    this.ensureConnected();
    
    const expirationDateTime = new Date();
    expirationDateTime.setHours(expirationDateTime.getHours() + 48); // Max 3 days
    
    const subscription = await this.graphClient!
      .api("/subscriptions")
      .post({
        changeType: "created",
        notificationUrl: webhookUrl,
        resource: "/me/messages",
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: this.config!.id, // Use connection ID as client state
      });
    
    return subscription.id;
  }
  
  /**
   * Unsubscribe from webhooks
   */
  override async unsubscribeFromWebhook(subscriptionId: string): Promise<void> {
    this.ensureConnected();
    
    await this.graphClient!
      .api(`/subscriptions/${subscriptionId}`)
      .delete();
  }
  
  /**
   * Get folder ID by name
   */
  private async getFolderId(folderName: string): Promise<string> {
    const folders = await this.graphClient!
      .api("/me/mailFolders")
      .filter(`displayName eq '${folderName}'`)
      .select("id")
      .get();
    
    if (folders.value.length === 0) {
      throw new Error(`Folder not found: ${folderName}`);
    }
    
    return folders.value[0].id;
  }
}