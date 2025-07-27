#!/usr/bin/env bun

import { getConfig } from "@figgy/config";
import { and, eq, files, getDatabaseConnection } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";

const logger = createLogger("check-file-script");

async function main() {
  const fileId = process.argv[2];
  const tenantId = process.argv[3];

  if (!tenantId) {
    logger.error("Tenant ID is required as second argument");
    console.error("Usage: bun check-file.ts <fileId> <tenantId>");
    console.error("   or: bun check-file.ts list <tenantId>");
    process.exit(1);
  }

  getConfig().validate();
  const config = getConfig().getCore();
  const db = getDatabaseConnection(config.DATABASE_URL);

  if (fileId && fileId !== "list") {
    // Check specific file with tenant validation
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));
    
    if (file) {
      logger.info("File found", { 
        fileId: file.id,
        fileName: file.fileName,
        processingStatus: file.processingStatus,
        tenantId: file.tenantId
      });
      console.log(JSON.stringify(file, null, 2));
    } else {
      logger.warn("File not found or access denied", { fileId, tenantId });
    }
  } else {
    // List files for specific tenant only
    const tenantFiles = await db
      .select()
      .from(files)
      .where(eq(files.tenantId, tenantId))
      .limit(10);
    
    logger.info(`Found ${tenantFiles.length} files for tenant`, { 
      count: tenantFiles.length, 
      tenantId 
    });
    
    tenantFiles.forEach((f) => {
      console.log(`- ${f.id}: ${f.fileName} (${f.processingStatus})`);
    });
  }

  process.exit(0);
}

main().catch((error) => {
  logger.error("Script failed", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
