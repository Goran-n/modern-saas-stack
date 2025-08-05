import { Client } from "@microsoft/microsoft-graph-client";
import type { 
  Message, 
  MailFolder, 
  FileAttachment
} from "@microsoft/microsoft-graph-types";
import type {
  EmailAttachment,
  EmailMessage,
  ListMessagesOptions,
} from "../types";
import { 
  MessageQueryBuilder, 
  isFileAttachment,
  isGraphError
} from "../types";
import { BaseEmailProvider } from "./base.provider";

export class OutlookProvider extends BaseEmailProvider {
  private graphClient?: Client;
  
  constructor() {
    super("outlook");
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
        // Token refresh should be handled by the OAuth system
        if (this.tokens!.expiresAt && this.tokens!.expiresAt < new Date()) {
          throw new Error("Access token expired - refresh should be handled by OAuth system");
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
    
    return folders.value.map((folder: MailFolder) => folder.displayName || "");
  }
  
  /**
   * List messages in a folder with improved filtering
   */
  async listMessages(folder: string, options: ListMessagesOptions): Promise<EmailMessage[]> {
    this.ensureConnected();
    
    this.logger.info("Listing messages from Outlook", {
      folder,
      options,
    });
    
    try {
      // Build query using the type-safe query builder
      const queryBuilder = new MessageQueryBuilder()
        .select([
          "id",
          "subject", 
          "from",
          "toRecipients",
          "receivedDateTime",
          "hasAttachments",
          "isRead",
          "conversationId",
          "parentFolderId"
        ])
        .top(options.limit || 50);

      // Handle folder selection
      let apiPath = "/me/messages";
      if (folder !== "INBOX") {
        const folderId = await this.getFolderId(folder);
        apiPath = `/me/mailFolders/${folderId}/messages`;
      }

      // Add filters based on options
      if (options.unreadOnly) {
        queryBuilder.filterByReadStatus(false);
      }

      // Handle date filtering carefully
      if (options.since) {
        // For recent dates (within 30 days), use the filter
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (options.since > thirtyDaysAgo) {
          queryBuilder.filterByDate('receivedDateTime', 'ge', options.since);
        } else {
          // For older dates, we'll handle it differently to avoid InefficientFilter
          this.logger.info("Skipping date filter for dates older than 30 days to avoid InefficientFilter");
        }
      } else {
        // For initial sync, limit to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        queryBuilder.filterByDate('receivedDateTime', 'ge', thirtyDaysAgo);
        
        // Add ordering only when we don't have other filters
        queryBuilder.orderBy('receivedDateTime', 'desc');
      }

      // Build and apply query parameters
      const queryParams = queryBuilder.build();
      let query = this.graphClient!.api(apiPath);
      
      // Apply query parameters
      Object.entries(queryParams).forEach(([key, value]) => {
        query = query.query({ [key]: value });
      });

      // Handle pagination
      if (options.pageToken) {
        query = query.skipToken(options.pageToken);
      }

      this.logger.info("Executing Microsoft Graph query", {
        apiPath,
        queryParams,
      });
      
      const response = await query.get();
      
      // Process messages with pagination
      const messages: EmailMessage[] = [];
      let currentResponse = response;
      let pageCount = 0;
      const maxPages = 10; // Limit to 10 pages (500 emails) to prevent runaway queries
      let totalEmailsChecked = 0;
      
      while (currentResponse && pageCount < maxPages) {
        pageCount++;
        totalEmailsChecked += currentResponse.value?.length || 0;
        
        this.logger.info("Processing page of messages", {
          page: pageCount,
          messageCount: currentResponse.value?.length || 0,
          hasNextLink: !!currentResponse['@odata.nextLink'],
          totalCheckedSoFar: totalEmailsChecked,
        });
        
        // Process messages on this page
        for (const msg of currentResponse.value as Message[]) {
          try {
            // Only fetch full details for messages with attachments
            if (msg.hasAttachments) {
              this.logger.info("Fetching message with attachments", {
                messageId: msg.id,
                subject: msg.subject,
                from: msg.from?.emailAddress?.address,
              });
              const fullMessage = await this.getMessage(msg.id!);
              messages.push(fullMessage);
            } else {
              this.logger.debug("Skipping message without attachments", {
                messageId: msg.id,
                subject: msg.subject,
              });
            }
          } catch (error) {
            this.logger.error("Failed to fetch message details", { 
              messageId: msg.id, 
              error 
            });
          }
        }
        
        // Check for next page
        if (currentResponse['@odata.nextLink'] && pageCount < maxPages) {
          try {
            currentResponse = await this.graphClient!
              .api(currentResponse['@odata.nextLink'])
              .get();
          } catch (error) {
            this.logger.error("Failed to fetch next page", { 
              page: pageCount + 1,
              error 
            });
            break;
          }
        } else {
          break;
        }
      }
      
      if (pageCount >= maxPages && currentResponse['@odata.nextLink']) {
        this.logger.warn("Pagination limit reached", {
          pagesProcessed: pageCount,
          totalEmailsChecked,
          messagesWithAttachments: messages.length,
          moreAvailable: true,
        });
      }
      
      this.logger.info("Processed all messages from Outlook", {
        totalPagesProcessed: pageCount,
        totalEmailsChecked,
        messagesWithAttachments: messages.length,
      });
      
      return messages;
    } catch (error) {
      if (isGraphError(error)) {
        this.logger.error("Graph API error", {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode
        });
        
        // If we get InefficientFilter, try a simpler query
        if (error.code === "InefficientFilter") {
          return this.listMessagesSimple(folder, options);
        }
      }
      throw error;
    }
  }
  
  /**
   * Fallback simple message listing for when complex queries fail
   */
  private async listMessagesSimple(
    folder: string, 
    options: ListMessagesOptions
  ): Promise<EmailMessage[]> {
    this.logger.info("Using simple message query due to InefficientFilter");
    
    let apiPath = "/me/messages";
    if (folder !== "INBOX") {
      const folderId = await this.getFolderId(folder);
      apiPath = `/me/mailFolders/${folderId}/messages`;
    }
    
    // Very simple query - just get messages with attachments
    const response = await this.graphClient!
      .api(apiPath)
      .filter("hasAttachments eq true")
      .select("id,subject,from,toRecipients,receivedDateTime,hasAttachments,isRead,conversationId")
      .top(options.limit || 25)
      .get();
    
    const messages: EmailMessage[] = [];
    
    for (const msg of response.value as Message[]) {
      try {
        const fullMessage = await this.getMessage(msg.id!);
        
        // Apply client-side filtering
        if (options.since && fullMessage.date < options.since) {
          continue;
        }
        
        if (options.unreadOnly && msg.isRead) {
          continue;
        }
        
        messages.push(fullMessage);
      } catch (error) {
        this.logger.error("Failed to fetch message", { 
          messageId: msg.id, 
          error 
        });
      }
    }
    
    return messages;
  }
  
  /**
   * Get a specific message with full details
   */
  async getMessage(messageId: string): Promise<EmailMessage> {
    this.ensureConnected();
    
    const message = await this.graphClient!
      .api(`/me/messages/${messageId}`)
      .expand("attachments")
      .get() as Message;
    
    const attachments: EmailAttachment[] = [];
    
    if (message.attachments && message.attachments.length > 0) {
      for (const att of message.attachments) {
        if (isFileAttachment(att)) {
          const attachment: EmailAttachment = {
            id: att.id!,
            fileName: att.name!,
            mimeType: att.contentType!,
            size: att.size!,
            inline: att.isInline || false,
          };
          
          // Add contentId only if it exists
          if (att.contentId) {
            attachment.contentId = att.contentId;
          }
          
          if (this.shouldProcessAttachment(attachment)) {
            attachments.push(attachment);
          }
        }
      }
    }
    
    const emailMessage: EmailMessage = {
      messageId: message.id!,
      from: message.from?.emailAddress?.address || "unknown",
      to: message.toRecipients?.map(r => r.emailAddress?.address || "").filter(Boolean) || [],
      subject: message.subject || "",
      date: new Date(message.receivedDateTime!),
      body: message.bodyPreview || "",
      attachments,
    };

    // Add optional properties only if they have values
    if (message.conversationId) {
      emailMessage.threadId = message.conversationId;
    }
    
    if (message.parentFolderId) {
      emailMessage.folder = message.parentFolderId;
    }

    return emailMessage;
  }
  
  /**
   * Download an attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    this.ensureConnected();
    
    const attachment = await this.graphClient!
      .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
      .get() as FileAttachment;
    
    if (!isFileAttachment(attachment)) {
      throw new Error("Not a file attachment");
    }
    
    return Buffer.from(attachment.contentBytes!, "base64");
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
   * Get folder ID by name
   */
  private async getFolderId(folderName: string): Promise<string> {
    const folders = await this.graphClient!
      .api("/me/mailFolders")
      .filter(`displayName eq '${folderName}'`)
      .select("id")
      .get();
    
    if (!folders.value || folders.value.length === 0) {
      throw new Error(`Folder not found: ${folderName}`);
    }
    
    return folders.value[0].id;
  }
}