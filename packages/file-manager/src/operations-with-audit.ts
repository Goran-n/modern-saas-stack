// @ts-ignore - audit module exists but TypeScript can't find it
import { 
  createAuditHelper,
  type AuditContext
} from "@figgy/audit";
import { v4 as uuidv4 } from "uuid";
import * as originalOps from "./operations";
import { getDb } from "./db";
import type { CreateFileInput } from "./types";

/**
 * Create audit context for file operations
 */
function createFileAuditContext(
  tenantId: string,
  userId?: string,
  sessionId?: string,
  correlationId?: string
): AuditContext {
  const context: AuditContext = {
    tenantId,
    correlationId: correlationId || uuidv4(),
    db: getDb(),
  };
  
  if (userId !== undefined) {
    context.userId = userId;
  }
  if (sessionId !== undefined) {
    context.sessionId = sessionId;
  }
  
  return context;
}

/**
 * Upload a file with comprehensive audit tracking
 */
export async function uploadFileWithAudit(
  file: File,
  input: CreateFileInput,
  auditContext: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  } = {}
): Promise<string> {
  const context = createFileAuditContext(
    input.tenantId,
    auditContext.userId,
    auditContext.sessionId,
    auditContext.correlationId
  );
  
  const audit = createAuditHelper(context);

  return await audit.trackDecision(
    {
      entityType: 'file',
      entityId: 'pending', // Will be updated after creation
      eventType: 'file.upload',
      decision: `Upload file "${file.name}" (${file.size} bytes, ${file.type})`,
      context: {
        fileProcessing: {
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          source: input.source,
          processingStep: 'upload',
        },
      },
      metadata: {
        originalFileName: file.name,
        pathTokens: input.pathTokens,
        source: input.source,
        bucket: input.bucket,
      },
    },
    async () => {
      // Step 1: File validation decisions
      await audit.logDecision({
        entityType: 'file',
        entityId: 'validation',
        eventType: 'file.validation',
        decision: `Validate file type ${file.type} and size ${file.size} bytes`,
        context: {
          fileProcessing: {
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            processingStep: 'validation',
          },
        },
        metadata: {
          maxSize: 10 * 1024 * 1024, // 10MB limit
          allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'], // etc
        },
      });

      // Execute the actual upload
      const fileId = await originalOps.uploadFile(file, input);

      // Step 2: Audit the successful upload with the actual file ID
      await audit.logDecision({
        entityType: 'file',
        entityId: fileId,
        eventType: 'file.uploaded',
        decision: `File successfully uploaded and stored`,
        context: {
          fileProcessing: {
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            processingStep: 'stored',
          },
        },
        metadata: {
          fileId,
          storagePath: input.pathTokens.join('/'),
        },
      });

      // Step 3: Audit categorization job trigger
      await audit.logDecision({
        entityType: 'file',
        entityId: fileId,
        eventType: 'file.categorization_queued',
        decision: `Categorization job queued for processing`,
        context: {
          fileProcessing: {
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            processingStep: 'categorization_queued',
          },
        },
        metadata: {
          queueName: `tenant-${input.tenantId}`,
        },
      });

      return fileId;
    }
  );
}

/**
 * Upload file from base64 with audit tracking
 */
export async function uploadFileFromBase64WithAudit(
  input: {
    fileName: string;
    mimeType: string;
    size: number;
    base64Data: string;
    tenantId: string;
    uploadedBy: string;
    source?: string;
    metadata?: Record<string, any>;
  },
  auditContext: {
    sessionId?: string;
    correlationId?: string;
  } = {}
): Promise<{
  id: string;
  fileName: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}> {
  const context = createFileAuditContext(
    input.tenantId,
    input.uploadedBy,
    auditContext.sessionId,
    auditContext.correlationId
  );
  
  const audit = createAuditHelper(context);

  return await audit.trackDecision(
    {
      entityType: 'file',
      entityId: 'pending',
      eventType: 'file.upload_base64',
      decision: `Upload file from base64 "${input.fileName}" (${input.size} bytes)`,
      context: {
        fileProcessing: {
          fileName: input.fileName,
          mimeType: input.mimeType,
          size: input.size,
          source: input.source || 'user_upload',
          processingStep: 'base64_upload',
        },
      },
      metadata: {
        dataSize: input.base64Data.length,
        source: input.source || 'user_upload',
      },
    },
    async () => {
      // Execute the upload
      const result = await originalOps.uploadFileFromBase64(input);

      // Audit successful upload
      await audit.logDecision({
        entityType: 'file',
        entityId: result.id,
        eventType: 'file.uploaded',
        decision: `File successfully uploaded from base64 data`,
        context: {
          fileProcessing: {
            fileName: result.fileName,
            mimeType: result.mimeType,
            size: result.size,
            processingStep: 'stored',
          },
        },
        metadata: {
          fileId: result.id,
          originalSize: input.size,
          processedSize: result.size,
        },
      });

      return result;
    }
  );
}

/**
 * Reprocess file with audit tracking
 */
export async function reprocessFileWithAudit(
  fileId: string,
  tenantId: string,
  auditContext: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  } = {}
): Promise<{ jobHandle: string }> {
  const context = createFileAuditContext(
    tenantId,
    auditContext.userId,
    auditContext.sessionId,
    auditContext.correlationId
  );
  
  const audit = createAuditHelper(context);

  return await audit.trackDecision(
    {
      entityType: 'file',
      entityId: fileId,
      eventType: 'file.reprocess',
      decision: `User requested file reprocessing - clearing existing data and re-triggering categorization`,
      context: {
        fileProcessing: {
          processingStep: 'reprocess_initiated',
        },
        userAction: {
          action: 'reprocess_file',
          interface: 'web',
        },
      },
      metadata: {
        trigger: 'manual',
        reason: 'user_requested',
      },
    },
    async () => {
      // Step 1: Audit data cleanup decision
      await audit.logDecision({
        entityType: 'file',
        entityId: fileId,
        eventType: 'file.cleanup',
        decision: `Clearing existing extractions and resetting file status for reprocessing`,
        context: {
          fileProcessing: {
            processingStep: 'cleanup',
          },
        },
      });

      // Execute the reprocessing
      const result = await originalOps.reprocessFile(fileId, tenantId);

      // Step 2: Audit job trigger
      await audit.logDecision({
        entityType: 'file',
        entityId: fileId,
        eventType: 'file.reprocess_queued',
        decision: `Reprocessing job queued successfully`,
        context: {
          fileProcessing: {
            processingStep: 'reprocess_queued',
          },
        },
        metadata: {
          jobHandle: result.jobHandle,
          queueName: `tenant-${tenantId}`,
        },
      });

      return result;
    }
  );
}

/**
 * Delete file with audit tracking
 */
export async function deleteFileWithAudit(
  fileId: string,
  tenantId: string,
  auditContext: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  } = {}
): Promise<void> {
  const context = createFileAuditContext(
    tenantId,
    auditContext.userId,
    auditContext.sessionId,
    auditContext.correlationId
  );
  
  const audit = createAuditHelper(context);

  return await audit.trackDecision(
    {
      entityType: 'file',
      entityId: fileId,
      eventType: 'file.delete',
      decision: `Delete file and remove from storage`,
      context: {
        fileProcessing: {
          processingStep: 'deletion',
        },
        userAction: {
          action: 'delete_file',
          interface: 'web',
        },
      },
      metadata: {
        trigger: 'manual',
        permanentDelete: true,
      },
    },
    async () => {
      // Get file info before deletion for audit
      const fileInfo = await originalOps.getFileById(fileId, tenantId);
      
      if (fileInfo) {
        await audit.logDecision({
          entityType: 'file',
          entityId: fileId,
          eventType: 'file.deletion_confirmed',
          decision: `Confirmed file deletion: ${fileInfo.fileName}`,
          context: {
            fileProcessing: {
              fileName: fileInfo.fileName,
              mimeType: fileInfo.mimeType,
              size: fileInfo.size,
              processingStep: 'deletion_confirmed',
            },
          },
          metadata: {
            fileSize: fileInfo.size,
            processingStatus: fileInfo.processingStatus,
          },
        });
      }

      // Execute the deletion
      await originalOps.deleteFile(fileId, tenantId);

      // Final audit log
      await audit.logDecision({
        entityType: 'file',
        entityId: fileId,
        eventType: 'file.deleted',
        decision: `File successfully deleted from storage and database`,
        context: {
          fileProcessing: {
            processingStep: 'deleted',
          },
        },
      });
    }
  );
}

/**
 * Process batch files with audit tracking
 */
export async function processBatchFilesWithAudit(
  fileIds: string[],
  tenantId: string,
  auditContext: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  } = {}
): Promise<{ triggered: number; jobHandle: string }> {
  const context = createFileAuditContext(
    tenantId,
    auditContext.userId,
    auditContext.sessionId,
    auditContext.correlationId
  );
  
  const audit = createAuditHelper(context);

  return await audit.trackDecision(
    {
      entityType: 'file',
      entityId: `batch-${fileIds.length}`,
      eventType: 'file.batch_process',
      decision: `Process ${fileIds.length} files in batch`,
      context: {
        fileProcessing: {
          processingStep: 'batch_processing',
        },
        userAction: {
          action: 'batch_process',
          interface: 'web',
        },
      },
      metadata: {
        fileCount: fileIds.length,
        fileIds,
        trigger: 'manual',
      },
    },
    async () => {
      const result = await originalOps.processBatchFiles(fileIds, tenantId);

      // Audit each individual file in the batch
      for (const fileId of fileIds) {
        await audit.logDecision({
          entityType: 'file',
          entityId: fileId,
          eventType: 'file.batch_queued',
          decision: `File queued for batch processing`,
          context: {
            fileProcessing: {
              processingStep: 'batch_queued',
            },
          },
          metadata: {
            batchId: result.jobHandle,
            batchSize: fileIds.length,
          },
        });
      }

      return result;
    }
  );
}

// Re-export all original operations for compatibility
export * from "./operations";