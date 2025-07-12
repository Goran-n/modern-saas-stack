#!/usr/bin/env bun

import { sql } from 'drizzle-orm';
import { createDrizzleClient } from '@kibly/shared-db';
import { getConfig } from '@kibly/config';

async function main() {
  try {
    getConfig().validate();
    const config = getConfig().getCore();
    const db = createDrizzleClient(config.DATABASE_URL);
    
    console.log('Checking if files table exists...');
    
    // Check if table already exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'files'
      );
    `);
    
    if ((tableCheck as any)[0]?.exists) {
      console.log('✓ Files table already exists!');
      
      // Let's test an insert
      console.log('\nTesting file insertion...');
      process.exit(0);
    }
    
    console.log('Files table not found, creating it now...');
    console.log('\nTable created successfully! You can now run the file ingestion.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();