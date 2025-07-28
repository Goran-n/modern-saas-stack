#!/usr/bin/env bun

import { getConfig } from "@figgy/config";
import { files, getDatabaseConnection, eq, sql } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";

const configManager = getConfig();
configManager.validate();
const config = configManager.getCore();
const db = getDatabaseConnection(config.DATABASE_URL);

// Get one PDF without thumbnail
const [pdfFile] = await db
  .select()
  .from(files)
  .where(
    sql`${files.mimeType} = 'application/pdf' AND ${files.thumbnailPath} IS NULL`
  )
  .limit(1);

if (!pdfFile) {
  console.log("No PDFs without thumbnails found");
  process.exit(0);
}

console.log(`\n🎯 Testing fixed thumbnail generation for: ${pdfFile.displayName || pdfFile.fileName}`);
console.log(`   File ID: ${pdfFile.id}`);
console.log(`   Tenant ID: ${pdfFile.tenantId}`);

try {
  const handle = await tasks.trigger(
    "generate-thumbnail",
    {
      fileId: pdfFile.id,
      tenantId: pdfFile.tenantId,
      mimeType: pdfFile.mimeType,
    }
  );
  
  console.log(`\n✅ Job triggered successfully`);
  console.log(`   Job ID: ${handle.id}`);
  
  console.log(`\n⏳ Waiting for job to complete...`);
} catch (error) {
  console.error(`\n❌ Failed to trigger job:`, error);
}

process.exit(0);