#!/usr/bin/env bun

import { createDrizzleClient } from '@kibly/shared-db';
import { getConfig } from '@kibly/config';
import { sql } from 'drizzle-orm';
import { readFile } from 'fs/promises';

async function main() {
  try {
    getConfig().validate();
    const config = getConfig().getCore();
    const db = createDrizzleClient(config.DATABASE_URL);
    
    console.log('Running migration: 20240712_create_files_table.sql');
    
    // Read the migration file
    const migrationSQL = await readFile('/Users/goran/Projects/kibly/supabase/migrations/20240712_create_files_table.sql', 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} statements to execute`);
    
    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await db.execute(sql.raw(statement));
        console.log('✓ Success');
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('⚠️  Already exists, skipping');
        } else {
          console.error('✗ Error:', error.message);
          throw error;
        }
      }
    }
    
    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();