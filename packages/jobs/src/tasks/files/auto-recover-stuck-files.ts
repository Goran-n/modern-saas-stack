import { getConfig } from "@figgy/config";
import {
  eq,
  and,
  lt,
  files as filesTable,
  getDatabaseConnection,
} from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { task, tasks } from "@trigger.dev/sdk/v3";
import { CategorizeFileSchema } from "@figgy/types";

/**
 * Automatically recover files stuck in processing state
 * These are files that started processing but never completed
 */
export const autoRecoverStuckFiles = task({
  id: "auto-recover-stuck-files",
  maxDuration: 30,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 15000,
  },
  run: async ({ 
    tenantId,
    timeoutMinutes = 5
  }: {
    tenantId?: string;
    timeoutMinutes?: number;
  }) => {
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);
    
    logger.info("Starting stuck files recovery", {
      tenantId,
      timeoutMinutes,
    });
    
    try {
      // Calculate timestamp for files stuck longer than timeout
      const stuckSince = new Date();
      stuckSince.setMinutes(stuckSince.getMinutes() - timeoutMinutes);
      
      // Query for files stuck in processing status
      const conditions = [
        eq(filesTable.processingStatus, "processing"),
        lt(filesTable.updatedAt, stuckSince),
      ];
      
      // Add tenant filter if specified
      if (tenantId) {
        conditions.push(eq(filesTable.tenantId, tenantId));
      }
      
      const stuckFiles = await db
        .select()
        .from(filesTable)
        .where(and(...conditions))
        .limit(50); // Process up to 50 files at a time
      
      logger.info("Found stuck files", {
        count: stuckFiles.length,
      });
      
      let recoveredCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      for (const file of stuckFiles) {
        try {
          const metadata = (file.metadata as any) || {};
          const previousAttempts = metadata.recoveryAttempts || 0;
          
          // If file has been stuck too many times, mark as failed
          if (previousAttempts >= 3) {
            logger.warn("File stuck too many times, marking as failed", {
              fileId: file.id,
              fileName: file.fileName,
              recoveryAttempts: previousAttempts,
            });
            
            await db
              .update(filesTable)
              .set({
                processingStatus: "failed",
                metadata: {
                  ...metadata,
                  error: "processing_timeout",
                  errorMessage: `Processing timed out after ${previousAttempts + 1} recovery attempts`,
                  lastRecoveryAt: new Date().toISOString(),
                  recoveryAttempts: previousAttempts + 1,
                },
                updatedAt: new Date(),
              })
              .where(eq(filesTable.id, file.id));
            
            failedCount++;
            continue;
          }
          
          logger.info("Recovering stuck file", {
            fileId: file.id,
            fileName: file.fileName,
            stuckDuration: Date.now() - file.updatedAt.getTime(),
            previousAttempts,
          });
          
          // Reset to pending status for retry
          await db
            .update(filesTable)
            .set({
              processingStatus: "pending",
              metadata: {
                ...metadata,
                recoveryAttempts: previousAttempts + 1,
                lastRecoveryAt: new Date().toISOString(),
                recoveryReason: "processing_timeout",
              },
              updatedAt: new Date(),
            })
            .where(eq(filesTable.id, file.id));
          
          // Re-trigger categorization
          await tasks.trigger(
            "categorize-file",
            {
              fileId: file.id,
              tenantId: file.tenantId,
              mimeType: file.mimeType,
              source: file.source,
              size: file.size,
              pathTokens: file.pathTokens,
            } satisfies typeof CategorizeFileSchema._type,
            {
              queue: {
                name: `tenant-${file.tenantId}`,
              },
              delay: "2s", // Small delay before retry
            }
          );
          
          recoveredCount++;
        } catch (error) {
          logger.error("Failed to recover stuck file", {
            fileId: file.id,
            error,
          });
          errors.push(`Failed to recover file ${file.id}: ${error}`);
        }
      }
      
      logger.info("Stuck files recovery completed", {
        totalFound: stuckFiles.length,
        recoveredCount,
        failedCount,
        errorCount: errors.length,
      });
      
      return {
        success: true,
        totalFound: stuckFiles.length,
        recoveredCount,
        failedCount,
        errors,
      };
    } catch (error) {
      logger.error("Stuck files recovery failed", {
        error,
      });
      throw error;
    }
  },
});

/**
 * Schedule periodic recovery of stuck files
 * This should be called by a cron job every 15 minutes
 */
export const scheduleStuckFilesRecovery = task({
  id: "schedule-stuck-files-recovery",
  run: async () => {
    logger.info("Scheduling stuck files recovery for all tenants");
    
    // Trigger recovery job for all tenants
    await autoRecoverStuckFiles.trigger({
      timeoutMinutes: 5,
    });
    
    return { scheduled: true };
  },
});