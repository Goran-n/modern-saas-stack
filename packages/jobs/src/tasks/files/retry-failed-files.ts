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

export const retryFailedFiles = task({
  id: "retry-failed-files",
  maxDuration: 30,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 15000,
  },
  queue: {
    concurrencyLimit: 3,
  },
  run: async ({ 
    tenantId,
    maxRetries = 3,
    olderThanMinutes = 30
  }: {
    tenantId?: string;
    maxRetries?: number;
    olderThanMinutes?: number;
  }) => {
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);
    
    logger.info("Starting failed files retry job", {
      tenantId,
      maxRetries,
      olderThanMinutes,
    });
    
    try {
      // Calculate timestamp for files older than specified minutes
      const olderThan = new Date();
      olderThan.setMinutes(olderThan.getMinutes() - olderThanMinutes);
      
      // Query for failed files that haven't exceeded retry limit
      const conditions = [
        eq(filesTable.processingStatus, "failed"),
        lt(filesTable.updatedAt, olderThan),
      ];
      
      // Add tenant filter if specified
      if (tenantId) {
        conditions.push(eq(filesTable.tenantId, tenantId));
      }
      
      const failedFiles = await db
        .select()
        .from(filesTable)
        .where(and(...conditions))
        .limit(50); // Process up to 50 files at a time
      
      logger.info("Found failed files to retry", {
        count: failedFiles.length,
      });
      
      let retriedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      for (const file of failedFiles) {
        try {
          const metadata = (file.metadata as any) || {};
          const retryCount = metadata.retryCount || 0;
          
          // Skip if exceeded max retries
          if (retryCount >= maxRetries) {
            logger.info("Skipping file - max retries exceeded", {
              fileId: file.id,
              retryCount,
              maxRetries,
            });
            skippedCount++;
            continue;
          }
          
          // Skip if file is too large (was marked as failed due to size)
          if (metadata.error === "file_too_large") {
            logger.info("Skipping file - permanently too large", {
              fileId: file.id,
              size: file.size,
            });
            skippedCount++;
            continue;
          }
          
          logger.info("Retrying failed file", {
            fileId: file.id,
            fileName: file.fileName,
            retryCount,
            previousError: metadata.errorMessage,
          });
          
          // Update retry count in metadata
          await db
            .update(filesTable)
            .set({
              metadata: {
                ...metadata,
                retryCount: retryCount + 1,
                lastRetryAt: new Date().toISOString(),
              },
              processingStatus: "pending", // Reset to pending for retry
              updatedAt: new Date(),
            })
            .where(eq(filesTable.id, file.id));
          
          // Trigger categorize-file job
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
              delay: "5s", // Small delay between retries
            }
          );
          
          retriedCount++;
        } catch (error) {
          logger.error("Failed to retry file", {
            fileId: file.id,
            error,
          });
          errors.push(`Failed to retry file ${file.id}: ${error}`);
        }
      }
      
      logger.info("Failed files retry job completed", {
        totalFound: failedFiles.length,
        retriedCount,
        skippedCount,
        errorCount: errors.length,
      });
      
      return {
        success: true,
        totalFound: failedFiles.length,
        retriedCount,
        skippedCount,
        errors,
      };
    } catch (error) {
      logger.error("Failed files retry job failed", {
        error,
      });
      throw error;
    }
  },
});

/**
 * Schedule periodic retry of failed files
 * This can be called by a cron job or manually triggered
 */
export const scheduleFailedFilesRetry = task({
  id: "schedule-failed-files-retry",
  run: async () => {
    logger.info("Scheduling failed files retry for all tenants");
    
    // Trigger retry job for all tenants
    await tasks.trigger("retry-failed-files", {
      maxRetries: 3,
      olderThanMinutes: 30,
    });
    
    return { scheduled: true };
  },
});