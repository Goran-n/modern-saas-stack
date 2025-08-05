import { getConfig } from "@figgy/config";
import {
  eq,
  and,
  lt,
  files as filesTable,
  getDatabaseConnection,
} from "@figgy/shared-db";
import { SupabaseStorageClient } from "@figgy/supabase-storage";
import { logger } from "@figgy/utils";
import { task } from "@trigger.dev/sdk/v3";

/**
 * Cleanup orphaned uploads that were started but never completed
 * These are files stuck in 'pending_upload' status for too long
 */
export const cleanupOrphanedUploads = task({
  id: "cleanup-orphaned-uploads",
  maxDuration: 60,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 15000,
  },
  run: async ({ 
    tenantId,
    olderThanMinutes = 30
  }: {
    tenantId?: string;
    olderThanMinutes?: number;
  }) => {
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);
    
    logger.info("Starting orphaned uploads cleanup", {
      tenantId,
      olderThanMinutes,
    });
    
    try {
      // Calculate timestamp for files older than specified minutes
      const olderThan = new Date();
      olderThan.setMinutes(olderThan.getMinutes() - olderThanMinutes);
      
      // Query for files stuck in pending_upload status
      const conditions = [
        eq(filesTable.processingStatus, "pending_upload"),
        lt(filesTable.createdAt, olderThan),
      ];
      
      // Add tenant filter if specified
      if (tenantId) {
        conditions.push(eq(filesTable.tenantId, tenantId));
      }
      
      const orphanedFiles = await db
        .select()
        .from(filesTable)
        .where(and(...conditions))
        .limit(100); // Process up to 100 files at a time
      
      logger.info("Found orphaned uploads", {
        count: orphanedFiles.length,
      });
      
      let cleanedCount = 0;
      let verifiedCount = 0;
      const errors: string[] = [];
      
      for (const file of orphanedFiles) {
        try {
          // Initialize storage client
          const storage = new SupabaseStorageClient({
            url: config.SUPABASE_URL,
            serviceRoleKey: config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
            bucket: file.bucket,
          });
          
          // Check if file exists in storage
          // We'll try to use the storage client directly to check existence
          let fileExistsInStorage = false;
          const filePath = file.pathTokens.join("/");
          
          try {
            // Use the getStorageClient method to access the underlying client
            const storageClient = storage.getStorageClient();
            const { data, error } = await storageClient
              .from(file.bucket)
              .download(filePath);
            
            fileExistsInStorage = !error && !!data;
          } catch (checkError) {
            // File doesn't exist
            fileExistsInStorage = false;
          }
          
          if (fileExistsInStorage) {
            // File exists in storage, update status to pending
            logger.info("Orphaned file found in storage, updating status", {
              fileId: file.id,
              fileName: file.fileName,
            });
            
            await db
              .update(filesTable)
              .set({
                processingStatus: "pending",
                updatedAt: new Date(),
              })
              .where(eq(filesTable.id, file.id));
            
            verifiedCount++;
          } else {
            // File doesn't exist in storage, clean up DB record
            logger.info("Orphaned file not found in storage, deleting record", {
              fileId: file.id,
              fileName: file.fileName,
            });
            
            await db
              .delete(filesTable)
              .where(eq(filesTable.id, file.id));
            
            cleanedCount++;
          }
        } catch (error) {
          logger.error("Failed to process orphaned file", {
            fileId: file.id,
            error,
          });
          errors.push(`Failed to process file ${file.id}: ${error}`);
        }
      }
      
      logger.info("Orphaned uploads cleanup completed", {
        totalFound: orphanedFiles.length,
        cleanedCount,
        verifiedCount,
        errorCount: errors.length,
      });
      
      return {
        success: true,
        totalFound: orphanedFiles.length,
        cleanedCount,
        verifiedCount,
        errors,
      };
    } catch (error) {
      logger.error("Orphaned uploads cleanup failed", {
        error,
      });
      throw error;
    }
  },
});

/**
 * Schedule periodic cleanup of orphaned uploads
 * This should be called by a cron job every 30 minutes
 */
export const scheduleOrphanedUploadsCleanup = task({
  id: "schedule-orphaned-uploads-cleanup",
  run: async () => {
    logger.info("Scheduling orphaned uploads cleanup for all tenants");
    
    // Trigger cleanup job for all tenants
    await cleanupOrphanedUploads.trigger({
      olderThanMinutes: 30,
    });
    
    return { scheduled: true };
  },
});