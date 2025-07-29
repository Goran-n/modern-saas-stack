#!/usr/bin/env bun

import { getConfig } from "@figgy/config";
import { files, getDatabaseConnection, eq, and, sql } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";

const logger = createLogger("check-thumbnails");

const configManager = getConfig();
configManager.validate();
const config = configManager.getCore();
const db = getDatabaseConnection(config.DATABASE_URL);

// Get all PDFs with thumbnails
const pdfsWithThumbnails = await db
  .select()
  .from(files)
  .where(
    sql`${files.mimeType} = 'application/pdf' AND ${files.thumbnailPath} IS NOT NULL`
  );

logger.info("PDFs with thumbnails", { count: pdfsWithThumbnails.length });
if (pdfsWithThumbnails.length > 0) {
  logger.info("First 5 PDFs with thumbnails", {
    files: pdfsWithThumbnails.slice(0, 5).map(file => ({
      name: file.displayName || file.fileName,
      id: file.id,
      thumbnailPath: file.thumbnailPath,
      updatedAt: file.updatedAt?.toISOString()
    }))
  });
}

// Get PDFs still missing thumbnails  
const pdfsWithoutThumbnails = await db
  .select()
  .from(files)
  .where(
    sql`${files.mimeType} = 'application/pdf' AND ${files.thumbnailPath} IS NULL`
  );

logger.info("PDFs missing thumbnails", { count: pdfsWithoutThumbnails.length });
if (pdfsWithoutThumbnails.length > 0) {
  logger.info("First 5 PDFs without thumbnails", {
    files: pdfsWithoutThumbnails.slice(0, 5).map(file => ({
      name: file.displayName || file.fileName,
      id: file.id
    }))
  });
}

process.exit(0);