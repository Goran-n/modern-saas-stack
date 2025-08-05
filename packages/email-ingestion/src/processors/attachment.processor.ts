import { 
  and, 
  eq, 
  emailProcessingLog,
  files,
} from "@figgy/shared-db";
import { FILE_SOURCES } from "@figgy/file-manager";
import type { CreateFileInput } from "@figgy/file-manager";
import type {
  EmailProcessingLogEntry,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { createHash } from "crypto";
import type {
  EmailConnectionConfig,
  EmailMessage,
  ProcessingOptions,
  ProcessingResult,
} from "../types";
import { ProcessingStatus } from "../types";
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
    uploadFile: (file: File, input: CreateFileInput) => Promise<string>,
    tokens?: any,
    credentials?: any,
    options: ProcessingOptions = DEFAULT_PROCESSING_OPTIONS,
    context?: { userId?: string }
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const fileIds: string[] = [];
    const errors: string[] = [];
    let status: ProcessingStatus = ProcessingStatus.COMPLETED;
    
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
      if (!existing) {
        logger.error("Email not found in processing log", {
          messageId: message.messageId,
          connectionId: connection.id,
        });
        throw new Error(`Email ${message.messageId} not found in processing log. Discovery phase may have failed.`);
      }
      
      if (existing.processingStatus === ProcessingStatus.COMPLETED) {
        logger.info("Email already processed", {
          messageId: message.messageId,
          fileIds: existing.fileIds,
        });
        return {
          messageId: message.messageId,
          status: ProcessingStatus.COMPLETED,
          attachmentsProcessed: existing.attachmentCount,
          fileIds: existing.fileIds as string[],
          processingTime: 0,
        };
      }
      
      // Update status to processing
      await this.updateProcessingLog(connection.id, message.messageId, {
        processingStatus: ProcessingStatus.PROCESSING,
        processingDurationMs: 0,
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
            
            // Calculate content hash for duplicate detection
            const contentHash = createHash('sha256')
              .update(attachmentData)
              .digest('hex');
            
            // Check if file already exists with this content hash
            const existingFile = await this.db
              .select({
                id: files.id,
                fileName: files.fileName,
                tenantId: files.tenantId,
              })
              .from(files)
              .where(
                and(
                  eq(files.contentHash, contentHash),
                  eq(files.tenantId, connection.tenantId)
                )
              )
              .limit(1);
            
            if (existingFile[0]) {
              logger.info("File already exists with same content hash, reusing", {
                existingFileId: existingFile[0].id,
                existingFileName: existingFile[0].fileName,
                newFileName: attachment.fileName,
                contentHash,
              });
              
              fileIds.push(existingFile[0].id);
              
              logger.info("Reused existing file", {
                fileName: attachment.fileName,
                fileId: existingFile[0].id,
              });
              continue;
            }
            
            // Upload to file manager
            // If no userId provided, throw error as it's required
            if (!context?.userId) {
              logger.error("Missing userId in context", {
                context,
                connectionId: connection.id,
                emailAddress: connection.emailAddress,
              });
              throw new Error("User ID is required for file upload but was not provided in context");
            }
            
            logger.info("Uploading file with userId", {
              userId: context.userId,
              fileName: attachment.fileName,
              contextType: typeof context.userId,
              fullContext: context,
            });
            
            // Ensure userId is a valid UUID before passing to uploadFile
            const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
            const uploadUserId = context?.userId && typeof context.userId === 'string' && 
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context.userId) 
              ? context.userId 
              : SYSTEM_USER_ID;
            
            logger.info("Using uploadUserId for file upload", {
              uploadUserId,
              originalContextUserId: context?.userId,
              isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploadUserId),
            });
            
            const uploadInput: CreateFileInput = {
              tenantId: connection.tenantId,
              uploadedBy: uploadUserId,
              source: FILE_SOURCES.EMAIL,
              mimeType: attachment.mimeType,
              size: attachment.size,
              sourceId: message.messageId,
              bucket: "vault",
              metadata: {
                emailConnectionId: connection.id,
                emailMessageId: message.messageId,
                emailFrom: message.from,
                emailSubject: message.subject,
                emailDate: message.date.toISOString(),
                originalFileName: attachment.fileName,
                emailAddress: connection.emailAddress,
              },
            };
            
            logger.info("Upload input object", {
              uploadInput,
              uploadedByValue: uploadInput.uploadedBy,
            });
            
            const fileId = await uploadFile(file, uploadInput);
            
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
            status = ProcessingStatus.FAILED;
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
        ...(errors.length > 0 && { errors }),
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("Failed to process email", {
        messageId: message.messageId,
        error,
      });
      
      // Update processing log with error
      await this.updateProcessingLog(connection.id, message.messageId, {
        processingStatus: ProcessingStatus.FAILED,
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