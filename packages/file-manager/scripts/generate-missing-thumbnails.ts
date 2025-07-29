#!/usr/bin/env bun
import { getConfig } from "@figgy/config";
import { eq, and, isNull, files, getDatabaseConnection } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import { program } from "commander";

program
  .name("generate-missing-thumbnails")
  .description("Generate thumbnails for PDF files that don't have them")
  .option("-t, --tenant <tenantId>", "Process files for specific tenant only")
  .option("-l, --limit <number>", "Maximum number of files to process", "100")
  .option("-d, --dry-run", "Show what would be processed without triggering jobs")
  .parse();

const options = program.opts();

async function generateMissingThumbnails() {
  try {
    // Validate config
    const configManager = getConfig();
    configManager.validate();
    const config = configManager.getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);

    logger.info("Starting thumbnail generation for files without thumbnails", {
      tenant: options.tenant || "all",
      limit: options.limit,
      dryRun: options.dryRun || false,
    });

    // Build query conditions
    const conditions = [
      eq(files.mimeType, "application/pdf"),
      isNull(files.thumbnailPath),
    ];

    if (options.tenant) {
      conditions.push(eq(files.tenantId, options.tenant));
    }

    // Find PDF files without thumbnails
    const missingThumbnails = await db
      .select({
        id: files.id,
        fileName: files.fileName,
        tenantId: files.tenantId,
        mimeType: files.mimeType,
        createdAt: files.createdAt,
      })
      .from(files)
      .where(and(...conditions))
      .limit(parseInt(options.limit))
      .orderBy(files.createdAt);

    if (missingThumbnails.length === 0) {
      logger.info("No PDF files found without thumbnails");
      return;
    }

    logger.info(`Found ${missingThumbnails.length} PDF files without thumbnails`);

    if (options.dryRun) {
      logger.info("Dry run mode - files that would be processed:");
      missingThumbnails.forEach((file) => {
        console.log(`- ${file.fileName} (${file.id}) - Tenant: ${file.tenantId}`);
      });
      return;
    }

    // Trigger thumbnail generation jobs
    let successCount = 0;
    let errorCount = 0;

    for (const file of missingThumbnails) {
      try {
        await tasks.trigger(
          "generate-thumbnail",
          {
            fileId: file.id,
            tenantId: file.tenantId,
            mimeType: file.mimeType,
          },
          {
            queue: {
              name: `thumbnail-${file.tenantId}`,
            },
          },
        );

        successCount++;
        logger.info(`Triggered thumbnail generation for: ${file.fileName}`, {
          fileId: file.id,
          tenantId: file.tenantId,
        });
      } catch (error) {
        errorCount++;
        logger.error(`Failed to trigger thumbnail generation for: ${file.fileName}`, {
          fileId: file.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Thumbnail generation complete", {
      total: missingThumbnails.length,
      success: successCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error("Failed to generate missing thumbnails", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run the script
generateMissingThumbnails();