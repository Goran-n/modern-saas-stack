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

console.log(`\n🎯 Testing thumbnail generation for: ${pdfFile.displayName || pdfFile.fileName}`);
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
  
  // Wait a bit and check if thumbnail was created
  console.log(`\n⏳ Waiting 10 seconds for job to complete...`);
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check if thumbnail was created
  const [updatedFile] = await db
    .select()
    .from(files)
    .where(eq(files.id, pdfFile.id));
    
  if (updatedFile?.thumbnailPath) {
    console.log(`\n🎉 Thumbnail created successfully!`);
    console.log(`   Path: ${updatedFile.thumbnailPath}`);
  } else {
    console.log(`\n❌ Thumbnail not created yet`);
    console.log(`   Check Trigger.dev dashboard for job status`);
  }
} catch (error) {
  console.error(`\n❌ Failed to trigger job:`, error);
}

process.exit(0);