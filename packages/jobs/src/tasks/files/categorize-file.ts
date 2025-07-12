import { categorizeFileSchema } from "../../schemas/file";
import { createDrizzleClient, files as filesTable, eq } from "@kibly/shared-db";
import { logger } from "@kibly/utils";
import { getConfig } from "@kibly/config";
import { schemaTask } from "@trigger.dev/sdk/v3";

export const categorizeFile = schemaTask({
  id: "categorize-file",
  schema: categorizeFileSchema,
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({ fileId, tenantId, mimeType, source }) => {
    // Validate configuration before using it
    getConfig().validate();
    const config = getConfig().getCore();
    const db = createDrizzleClient(config.DATABASE_URL);
    
    try {
      logger.info("Starting file categorization", {
        fileId,
        tenantId,
        mimeType,
        source,
      });

      // Update processing status to 'processing'
      await db
        .update(filesTable)
        .set({
          processingStatus: "processing",
          updatedAt: new Date(),
        })
        .where(eq(filesTable.id, fileId));

      // TODO: Implement actual categorization logic
      // For now, just simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update processing status to 'completed'
      await db
        .update(filesTable)
        .set({
          processingStatus: "completed",
          metadata: {
            categorized: true,
            category: "uncategorized", // Placeholder
            processedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(filesTable.id, fileId));

      logger.info("File categorization completed", {
        fileId,
        tenantId,
      });

      return {
        fileId,
        status: "completed",
        category: "uncategorized",
      };
    } catch (error) {
      logger.error("File categorization failed", {
        fileId,
        tenantId,
        error,
      });

      // Update processing status to 'failed'
      await db
        .update(filesTable)
        .set({
          processingStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(filesTable.id, fileId));

      throw error;
    }
  },
});