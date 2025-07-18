#!/usr/bin/env bun

import { getDatabaseConnection, files, eq } from '@kibly/shared-db';
import { getConfig } from '@kibly/config';

async function main() {
  const fileId = process.argv[2];
  
  getConfig().validate();
  const config = getConfig().getCore();
  const db = getDatabaseConnection(config.DATABASE_URL);
  
  if (fileId) {
    // Check specific file
    const [file] = await db.select().from(files).where(eq(files.id, fileId));
    if (file) {
      console.log('File found:', JSON.stringify(file, null, 2));
    } else {
      console.log('File not found');
    }
  } else {
    // List all files
    const allFiles = await db.select().from(files).limit(10);
    console.log(`Found ${allFiles.length} files:`);
    allFiles.forEach(f => {
      console.log(`- ${f.id}: ${f.fileName} (${f.processingStatus})`);
    });
  }
  
  process.exit(0);
}

main().catch(console.error);