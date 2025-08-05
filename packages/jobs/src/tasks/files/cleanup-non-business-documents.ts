import { getConfig } from "@figgy/config";
import { deleteFile } from "@figgy/file-manager";
import {
  eq,
  and,
  files as filesTable,
  documentExtractions,
  getDatabaseConnection,
  sql,
} from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { task } from "@trigger.dev/sdk/v3";

/**
 * Cleanup existing non-business documents from email sources
 * This is a one-time cleanup task for files already in the system
 */
export const cleanupNonBusinessDocuments = task({
  id: "cleanup-non-business-documents",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 15000,
  },
  run: async ({ 
    tenantId,
    batchSize = 50
  }: {
    tenantId?: string;
    batchSize?: number;
  }) => {
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);
    
    logger.info("Starting cleanup of non-business documents", {
      tenantId,
      batchSize,
    });
    
    try {
      // Query for files from email source that are categorized as "other"
      const conditions = [
        eq(filesTable.source, "email"),
        eq(filesTable.processingStatus, "completed"),
        sql`${filesTable.metadata}->>'category' = 'other'`
      ];
      
      // Add tenant filter if specified
      if (tenantId) {
        conditions.push(eq(filesTable.tenantId, tenantId));
      }
      
      const nonBusinessFiles = await db
        .select({
          id: filesTable.id,
          tenantId: filesTable.tenantId,
          fileName: filesTable.fileName,
          metadata: filesTable.metadata,
        })
        .from(filesTable)
        .where(and(...conditions))
        .limit(batchSize);
      
      logger.info("Found non-business documents to clean up", {
        count: nonBusinessFiles.length,
      });
      
      let deletedCount = 0;
      const errors: string[] = [];
      
      for (const file of nonBusinessFiles) {
        try {
          logger.info("Deleting non-business document", {
            fileId: file.id,
            fileName: file.fileName,
            tenantId: file.tenantId,
            metadata: file.metadata,
          });
          
          // Delete any associated extractions first
          await db
            .delete(documentExtractions)
            .where(eq(documentExtractions.fileId, file.id));
          
          // Delete the file (handles storage and database cleanup)
          await deleteFile(file.id, file.tenantId);
          
          deletedCount++;
          
          logger.info("Non-business document deleted", {
            fileId: file.id,
            fileName: file.fileName,
          });
        } catch (error) {
          logger.error("Failed to delete non-business document", {
            fileId: file.id,
            error,
          });
          errors.push(`Failed to delete file ${file.id}: ${error}`);
        }
      }
      
      logger.info("Non-business documents cleanup completed", {
        totalFound: nonBusinessFiles.length,
        deletedCount,
        errorCount: errors.length,
      });
      
      // If there are more files to process, return indicator
      const hasMore = nonBusinessFiles.length === batchSize;
      
      return {
        success: true,
        totalFound: nonBusinessFiles.length,
        deletedCount,
        errors,
        hasMore,
      };
    } catch (error) {
      logger.error("Non-business documents cleanup failed", {
        error,
      });
      throw error;
    }
  },
});

/**
 * Run cleanup for all tenants
 * This can be triggered manually or scheduled
 */
export const cleanupAllNonBusinessDocuments = task({
  id: "cleanup-all-non-business-documents",
  maxDuration: 600, // 10 minutes
  run: async () => {
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);
    
    logger.info("Starting cleanup of non-business documents for all tenants");
    
    try {
      // Get unique tenant IDs that have non-business documents
      const tenants = await db
        .selectDistinct({ tenantId: filesTable.tenantId })
        .from(filesTable)
        .where(
          and(
            eq(filesTable.source, "email"),
            eq(filesTable.processingStatus, "completed"),
            sql`${filesTable.metadata}->>'category' = 'other'`
          )
        );
      
      logger.info("Found tenants with non-business documents", {
        tenantCount: tenants.length,
      });
      
      let totalDeleted = 0;
      let totalErrors = 0;
      
      for (const { tenantId } of tenants) {
        let hasMore = true;
        
        while (hasMore) {
          const result = await cleanupNonBusinessDocuments.trigger({
            tenantId,
            batchSize: 50,
          });
          
          // Wait for the job to complete
          const jobResult = await result;
          
          if ('output' in jobResult && jobResult.output) {
            const output = jobResult.output as {
              deletedCount: number;
              errors: string[];
              hasMore: boolean;
            };
            totalDeleted += output.deletedCount;
            totalErrors += output.errors.length;
            hasMore = output.hasMore;
          } else {
            hasMore = false;
          }
        }
      }
      
      logger.info("All tenants cleanup completed", {
        tenantCount: tenants.length,
        totalDeleted,
        totalErrors,
      });
      
      return {
        success: true,
        tenantCount: tenants.length,
        totalDeleted,
        totalErrors,
      };
    } catch (error) {
      logger.error("All tenants cleanup failed", {
        error,
      });
      throw error;
    }
  },
});