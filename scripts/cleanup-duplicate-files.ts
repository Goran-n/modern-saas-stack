#!/usr/bin/env bun
import { and, eq, files, sql, getDatabaseConnection } from "@figgy/shared-db";
import { remove } from "@figgy/supabase-storage";
import { createLogger } from "@figgy/utils";
import { getClient } from "@figgy/file-manager";
import { getConfig } from "@figgy/config";

const logger = createLogger("cleanup-duplicate-files");

interface DuplicateGroup {
  contentHash: string;
  fileSize: number;
  source: string;
  sourceId: string | null;
  tenantId: string;
  files: Array<{
    id: string;
    fileName: string;
    pathTokens: string[];
    bucket: string;
    createdAt: Date;
  }>;
}

async function findDuplicateFiles(): Promise<DuplicateGroup[]> {
  const config = getConfig();
  
  try {
    // Validate config first
    if (!config.isValid()) {
      config.validate();
    }
  } catch (error) {
    logger.error("Config validation failed", { error });
    throw error;
  }
  
  const dbUrl = config.getForFileManager().DATABASE_URL;
  const db = getDatabaseConnection(dbUrl);
  
  // Find all files grouped by content hash, size, source, and sourceId
  const duplicateGroups = await db
    .select({
      contentHash: files.contentHash,
      fileSize: files.fileSize,
      source: files.source,
      sourceId: files.sourceId,
      tenantId: files.tenantId,
      count: sql<number>`count(*)`,
    })
    .from(files)
    .where(sql`${files.contentHash} IS NOT NULL`)
    .groupBy(
      files.contentHash,
      files.fileSize,
      files.source,
      files.sourceId,
      files.tenantId
    )
    .having(sql`count(*) > 1`);

  logger.info("Found duplicate groups", { count: duplicateGroups.length });

  const duplicateGroupsWithFiles: DuplicateGroup[] = [];

  // For each duplicate group, get all the files
  for (const group of duplicateGroups) {
    const duplicateFiles = await db
      .select({
        id: files.id,
        fileName: files.fileName,
        pathTokens: files.pathTokens,
        bucket: files.bucket,
        createdAt: files.createdAt,
      })
      .from(files)
      .where(
        and(
          eq(files.tenantId, group.tenantId),
          eq(files.contentHash, group.contentHash!),
          eq(files.fileSize, group.fileSize!),
          eq(files.source, group.source),
          group.sourceId ? eq(files.sourceId, group.sourceId) : sql`${files.sourceId} IS NULL`
        )
      )
      .orderBy(files.createdAt); // Keep oldest

    if (duplicateFiles.length > 1) {
      duplicateGroupsWithFiles.push({
        contentHash: group.contentHash!,
        fileSize: group.fileSize!,
        source: group.source,
        sourceId: group.sourceId,
        tenantId: group.tenantId,
        files: duplicateFiles,
      });
    }
  }

  return duplicateGroupsWithFiles;
}

async function cleanupDuplicates(dryRun: boolean = true) {
  logger.info("Starting duplicate file cleanup", { dryRun });

  const duplicateGroups = await findDuplicateFiles();
  const config = getConfig();
  const dbUrl = config.getForFileManager().DATABASE_URL;
  const db = getDatabaseConnection(dbUrl);
  const client = getClient();

  let totalDeleted = 0;
  let totalErrors = 0;

  for (const group of duplicateGroups) {
    logger.info("Processing duplicate group", {
      contentHash: group.contentHash,
      source: group.source,
      sourceId: group.sourceId,
      fileCount: group.files.length,
      files: group.files.map(f => ({ id: f.id, name: f.fileName, created: f.createdAt })),
    });

    // Keep the oldest file (first in the array since we ordered by createdAt)
    const fileToKeep = group.files[0];
    const filesToDelete = group.files.slice(1);

    logger.info("Keeping file", {
      id: fileToKeep.id,
      fileName: fileToKeep.fileName,
      createdAt: fileToKeep.createdAt,
    });

    for (const fileToDelete of filesToDelete) {
      logger.info("Would delete file", {
        id: fileToDelete.id,
        fileName: fileToDelete.fileName,
        createdAt: fileToDelete.createdAt,
      });

      if (!dryRun) {
        try {
          // Delete from storage
          const filePath = fileToDelete.pathTokens.join("/");
          await remove(client, {
            bucket: fileToDelete.bucket,
            path: fileToDelete.pathTokens,
          });

          // Delete from database
          await db.delete(files).where(eq(files.id, fileToDelete.id));

          logger.info("Deleted duplicate file", {
            id: fileToDelete.id,
            fileName: fileToDelete.fileName,
          });

          totalDeleted++;
        } catch (error) {
          logger.error("Failed to delete file", {
            id: fileToDelete.id,
            error,
          });
          totalErrors++;
        }
      }
    }
  }

  logger.info("Cleanup complete", {
    dryRun,
    duplicateGroups: duplicateGroups.length,
    totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.files.length - 1, 0),
    totalDeleted,
    totalErrors,
  });
}

// Main execution
const isDryRun = process.argv.includes("--dry-run") || process.argv.includes("-d");
const forceRun = process.argv.includes("--force") || process.argv.includes("-f");

if (!isDryRun && !forceRun) {
  logger.warn("This will permanently delete duplicate files!");
  logger.warn("Run with --dry-run to see what would be deleted");
  logger.warn("Run with --force to actually delete files");
  process.exit(1);
}

cleanupDuplicates(isDryRun)
  .then(() => {
    logger.info("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Script failed", { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });