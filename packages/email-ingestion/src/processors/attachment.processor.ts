import { 
  and, 
  eq, 
  emailConnections, 
  emailProcessingLog,
  EmailProcessingLogEntry,
  NewEmailProcessingLogEntry,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import type {
  EmailConnectionConfig,
  EmailMessage,
  ProcessingOptions,
  ProcessingResult,
  ProcessingStatus,
} from "../types";
import { createEmailProvider } from "../providers";
import { getDb } from "../db";

const logger = createLogger("attachment-processor");

const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  downloadAttachments: true,
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/webp",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  virusScanEnabled: false, // TODO: Implement virus scanning
};

export class AttachmentProcessor {
  private db = getDb();
  
  /**
   * Process email attachments
   */
  async processEmail(
    connection: EmailConnectionConfig,
    message: EmailMessage,
    uploadFile: (file: File, input: any) => Promise<string>,
    tokens?: any,
    credentials?: any,
    options: ProcessingOptions = DEFAULT_PROCESSING_OPTIONS
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const fileIds: string[] = [];
    const errors: string[] = [];
    let status: ProcessingStatus = "completed";
    
    logger.info("Processing email attachments", {
      connectionId: connection.id,
      messageId: message.messageId,
      attachmentCount: message.attachments.length,
      from: message.from,
      subject: message.subject,
    });
    
    try {
      // Check if already processed
      const existing = await this.getProcessingLog(connection.id, message.messageId);
      if (existing && existing.processingStatus === "completed") {
        logger.info("Email already processed", {
          messageId: message.messageId,
          fileIds: existing.fileIds,
        });
        return {
          messageId: message.messageId,
          status: "completed",
          attachmentsProcessed: existing.attachmentCount,
          fileIds: existing.fileIds as string[],
          processingTime: 0,
        };
      }
      
      // Create or update processing log entry
      await this.upsertProcessingLog({
        connectionId: connection.id,
        messageId: message.messageId,
        threadId: message.threadId,
        emailDate: message.date,
        fromAddress: message.from,
        subject: message.subject,
        attachmentCount: message.attachments.length,
        attachmentsTotalSize: message.attachments.reduce((sum, att) => sum + att.size, 0),
        processingStatus: "processing",
      });
      
      // Create provider instance
      const provider = createEmailProvider(connection.provider);
      await provider.connect(connection, tokens, credentials);
      
      try {
        // Process each attachment
        for (const attachment of message.attachments) {
          try {
            // Check mime type
            if (!this.isAllowedMimeType(attachment.mimeType, options.allowedMimeTypes)) {
              logger.warn("Skipping attachment with unsupported mime type", {
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
              });
              errors.push(`Unsupported file type: ${attachment.fileName}`);
              continue;
            }
            
            // Check size
            if (attachment.size > options.maxAttachmentSize) {
              logger.warn("Skipping attachment that exceeds size limit", {
                fileName: attachment.fileName,
                size: attachment.size,
                maxSize: options.maxAttachmentSize,
              });
              errors.push(`File too large: ${attachment.fileName}`);
              continue;
            }
            
            // Download attachment
            logger.info("Downloading attachment", {
              fileName: attachment.fileName,
              size: attachment.size,
            });
            
            const attachmentData = await provider.getAttachment(
              message.messageId,
              attachment.id
            );
            
            // TODO: Virus scan if enabled
            if (options.virusScanEnabled) {
              // Implement virus scanning
              logger.warn("Virus scanning not yet implemented");
            }
            
            // Create File object
            const file = new File([attachmentData], attachment.fileName, {
              type: attachment.mimeType,
            });
            
            // Upload to file manager
            const fileId = await uploadFile(file, {
              tenantId: connection.tenantId,
              uploadedBy: connection.emailAddress, // Use email address as uploader
              source: "email",
              mimeType: attachment.mimeType,
              size: attachment.size,
              metadata: {
                emailConnectionId: connection.id,
                emailMessageId: message.messageId,
                emailFrom: message.from,
                emailSubject: message.subject,
                emailDate: message.date.toISOString(),
                originalFileName: attachment.fileName,
              },
              pathTokens: [
                connection.tenantId,
                "email-attachments",
                connection.emailAddress.replace("@", "_at_"),
                message.date.toISOString().split("T")[0],
              ],
            });
            
            fileIds.push(fileId);
            
            logger.info("Successfully processed attachment", {
              fileName: attachment.fileName,
              fileId,
            });
          } catch (error) {
            logger.error("Failed to process attachment", {
              fileName: attachment.fileName,
              error,
            });
            errors.push(`Failed to process ${attachment.fileName}: ${error}`);
            status = "failed";
          }
        }
        
        // Mark email as read
        try {
          await provider.markAsRead(message.messageId);
        } catch (error) {
          logger.error("Failed to mark email as read", { error });
          // Don't fail the entire process if marking as read fails
        }
      } finally {
        await provider.disconnect();
      }
      
      // Update processing log
      await this.updateProcessingLog(connection.id, message.messageId, {
        processingStatus: status,
        processedAt: new Date(),
        processingDurationMs: Date.now() - startTime,
        fileIds,
        errorMessage: errors.length > 0 ? errors.join("; ") : null,
      });
      
      return {
        messageId: message.messageId,
        status,
        attachmentsProcessed: fileIds.length,
        fileIds,
        errors: errors.length > 0 ? errors : undefined,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("Failed to process email", {
        messageId: message.messageId,
        error,
      });
      
      // Update processing log with error
      await this.updateProcessingLog(connection.id, message.messageId, {
        processingStatus: "failed",
        processedAt: new Date(),
        processingDurationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
  
  /**
   * Get processing log entry
   */
  private async getProcessingLog(
    connectionId: string,
    messageId: string
  ): Promise<EmailProcessingLogEntry | null> {
    const [entry] = await this.db
      .select()
      .from(emailProcessingLog)
      .where(
        and(
          eq(emailProcessingLog.connectionId, connectionId),
          eq(emailProcessingLog.messageId, messageId)
        )
      )
      .limit(1);
    
    return entry || null;
  }
  
  /**
   * Create or update processing log entry
   */
  private async upsertProcessingLog(
    data: Omit<NewEmailProcessingLogEntry, "id" | "createdAt">
  ): Promise<void> {
    const existing = await this.getProcessingLog(data.connectionId, data.messageId);
    
    if (existing) {
      await this.db
        .update(emailProcessingLog)
        .set(data)
        .where(eq(emailProcessingLog.id, existing.id));
    } else {
      await this.db.insert(emailProcessingLog).values(data);
    }
  }
  
  /**
   * Update processing log entry
   */
  private async updateProcessingLog(
    connectionId: string,
    messageId: string,
    updates: Partial<EmailProcessingLogEntry>
  ): Promise<void> {
    await this.db
      .update(emailProcessingLog)
      .set(updates)
      .where(
        and(
          eq(emailProcessingLog.connectionId, connectionId),
          eq(emailProcessingLog.messageId, messageId)
        )
      );
  }
  
  /**
   * Check if mime type is allowed
   */
  private isAllowedMimeType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.some(allowed => 
      mimeType.toLowerCase().includes(allowed.toLowerCase())
    );
  }
}