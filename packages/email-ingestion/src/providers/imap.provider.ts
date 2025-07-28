import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import type {
  EmailAttachment,
  EmailMessage,
  ListMessagesOptions,
} from "../types";
import { BaseEmailProvider } from "./base.provider";

export class IMAPProvider extends BaseEmailProvider {
  private imapClient?: ImapFlow;
  
  constructor() {
    super("imap");
  }
  
  /**
   * Connect to IMAP server
   */
  protected async doConnect(): Promise<void> {
    if (!this.credentials) {
      throw new Error("IMAP credentials required");
    }
    
    this.imapClient = new ImapFlow({
      host: this.credentials.host,
      port: this.credentials.port,
      secure: this.credentials.tls,
      auth: {
        user: this.credentials.username,
        pass: this.credentials.password,
      },
      logger: false, // Disable ImapFlow's internal logger
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });
    
    await this.imapClient.connect();
    
    this.logger.info("Connected to IMAP server", {
      host: this.credentials.host,
      port: this.credentials.port,
    });
  }
  
  /**
   * Disconnect from IMAP server
   */
  protected async doDisconnect(): Promise<void> {
    if (this.imapClient) {
      await this.imapClient.logout();
      this.imapClient = undefined;
    }
  }
  
  /**
   * List available folders
   */
  async listFolders(): Promise<string[]> {
    this.ensureConnected();
    
    const folders: string[] = [];
    
    const list = await this.imapClient!.list();
    
    const extractFolders = (items: any[]): void => {
      for (const item of items) {
        folders.push(item.path);
        if (item.folders && item.folders.length > 0) {
          extractFolders(item.folders);
        }
      }
    };
    
    extractFolders(list);
    
    return folders;
  }
  
  /**
   * List messages in a folder
   */
  async listMessages(folder: string, options: ListMessagesOptions): Promise<EmailMessage[]> {
    this.ensureConnected();
    
    // Select the folder
    await this.imapClient!.mailboxOpen(folder, { readOnly: true });
    
    // Build search criteria
    const searchCriteria: any[] = [];
    
    // Has attachments - IMAP doesn't have direct support, we'll filter later
    searchCriteria.push("ALL");
    
    if (options.unreadOnly) {
      searchCriteria.push("UNSEEN");
    }
    
    if (options.since) {
      searchCriteria.push(["SINCE", options.since]);
    }
    
    // Search for messages
    const messages: EmailMessage[] = [];
    const limit = options.limit || 50;
    
    try {
      // Get message sequence numbers
      const searchResults = await this.imapClient!.search(searchCriteria);
      
      if (searchResults.length === 0) {
        return [];
      }
      
      // Get the most recent messages
      const sequences = Array.from(searchResults)
        .sort((a, b) => b - a)
        .slice(0, limit);
      
      for (const seq of sequences) {
        try {
          const { source } = await this.imapClient!.download(seq.toString(), {
            uid: true,
          });
          
          const parsed = await simpleParser(source, {
            streamAttachments: false,
          });
          
          // Only include if it has attachments
          if (parsed.attachments && parsed.attachments.length > 0) {
            const message = this.parsedMailToEmailMessage(parsed, seq.toString());
            messages.push(message);
          }
        } catch (error) {
          this.logger.error("Failed to fetch message", { sequence: seq, error });
        }
      }
    } catch (error) {
      this.logger.error("Failed to search messages", { folder, error });
      throw error;
    }
    
    return this.filterMessages(messages);
  }
  
  /**
   * Get a specific message
   */
  async getMessage(messageId: string): Promise<EmailMessage> {
    this.ensureConnected();
    
    // For IMAP, messageId is the UID
    const { source } = await this.imapClient!.download(messageId, {
      uid: true,
    });
    
    const parsed = await simpleParser(source, {
      streamAttachments: false,
    });
    
    return this.parsedMailToEmailMessage(parsed, messageId);
  }
  
  /**
   * Download an attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    this.ensureConnected();
    
    // For IMAP, we need to download the entire message and extract the attachment
    const { source } = await this.imapClient!.download(messageId, {
      uid: true,
    });
    
    const parsed = await simpleParser(source, {
      streamAttachments: false,
    });
    
    const attachment = parsed.attachments.find(
      att => this.generateAttachmentId(att) === attachmentId
    );
    
    if (!attachment) {
      throw new Error(`Attachment not found: ${attachmentId}`);
    }
    
    return attachment.content;
  }
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    this.ensureConnected();
    
    await this.imapClient!.messageFlagsAdd(messageId, ["\\Seen"], {
      uid: true,
    });
  }
  
  /**
   * Convert parsed mail to EmailMessage
   */
  private parsedMailToEmailMessage(parsed: ParsedMail, uid: string): EmailMessage {
    const attachments: EmailAttachment[] = [];
    
    for (const att of parsed.attachments) {
      const attachment: EmailAttachment = {
        id: this.generateAttachmentId(att),
        fileName: att.filename || "attachment",
        mimeType: att.contentType,
        size: att.size,
        inline: att.contentDisposition === "inline",
        contentId: att.contentId,
      };
      
      if (this.shouldProcessAttachment(attachment)) {
        attachments.push(attachment);
      }
    }
    
    const from = parsed.from?.value[0]?.address || "";
    const to = parsed.to?.value.map(addr => addr.address || "") || [];
    
    return {
      messageId: uid,
      from,
      to,
      subject: parsed.subject || "",
      date: parsed.date || new Date(),
      body: parsed.text || "",
      attachments,
    };
  }
  
  /**
   * Generate a stable attachment ID
   */
  private generateAttachmentId(attachment: any): string {
    // Use a combination of properties to create a stable ID
    const parts = [
      attachment.filename || "unknown",
      attachment.contentType,
      attachment.size,
      attachment.checksum || attachment.contentId || "",
    ];
    
    return Buffer.from(parts.join("|")).toString("base64url");
  }
}