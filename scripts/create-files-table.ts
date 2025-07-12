#!/usr/bin/env bun

import { sql } from 'drizzle-orm';
import { createDrizzleClient } from '@kibly/shared-db';
import { getConfig } from '@kibly/config';

async function main() {
  try {
    getConfig().validate();
    const config = getConfig().getCore();
    const db = createDrizzleClient(config.DATABASE_URL);
    
    console.log('Creating files table...');
    
    // Check if table already exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'files'
      );
    `);
    
    if ((tableCheck as any)[0]?.exists) {
      console.log('Files table already exists!');
      process.exit(0);
    }
    
    // Create enum type
    await db.execute(sql`
      CREATE TYPE file_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed')
    `).catch(e => {
      if (!e.message.includes('already exists')) throw e;
      console.log('Enum file_processing_status already exists');
    });
    
    // Create table
    await db.execute(sql`
      CREATE TABLE files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name TEXT NOT NULL,
        path_tokens TEXT[] NOT NULL,
        mime_type TEXT NOT NULL,
        size BIGINT NOT NULL,
        metadata JSONB,
        source TEXT NOT NULL CHECK (source IN ('integration', 'user_upload', 'whatsapp')),
        source_id TEXT,
        tenant_id UUID NOT NULL,
        uploaded_by UUID NOT NULL,
        processing_status file_processing_status DEFAULT 'pending',
        bucket TEXT NOT NULL DEFAULT 'vault',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✓ Created files table');
    
    // Create indexes
    await db.execute(sql`CREATE INDEX idx_files_tenant_id ON files(tenant_id)`);
    await db.execute(sql`CREATE INDEX idx_files_source ON files(source)`);
    await db.execute(sql`CREATE INDEX idx_files_processing_status ON files(processing_status)`);
    await db.execute(sql`CREATE INDEX idx_files_created_at ON files(created_at DESC)`);
    console.log('✓ Created indexes');
    
    // Enable RLS
    await db.execute(sql`ALTER TABLE files ENABLE ROW LEVEL SECURITY`);
    console.log('✓ Enabled RLS');
    
    // Create RLS policies
    await db.execute(sql`
      CREATE POLICY "Users can insert files for their tenant"
      ON files
      FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = auth.jwt()->>'tenant_id')
    `);
    
    await db.execute(sql`
      CREATE POLICY "Users can view files from their tenant"
      ON files
      FOR SELECT
      TO authenticated
      USING (tenant_id = auth.jwt()->>'tenant_id')
    `);
    
    await db.execute(sql`
      CREATE POLICY "Users can update files from their tenant"
      ON files
      FOR UPDATE
      TO authenticated
      USING (tenant_id = auth.jwt()->>'tenant_id')
      WITH CHECK (tenant_id = auth.jwt()->>'tenant_id')
    `);
    
    await db.execute(sql`
      CREATE POLICY "Users can delete files from their tenant"
      ON files
      FOR DELETE
      TO authenticated
      USING (tenant_id = auth.jwt()->>'tenant_id')
    `);
    
    await db.execute(sql`
      CREATE POLICY "Service role has full access to files"
      ON files
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    `);
    
    console.log('✓ Created RLS policies');
    console.log('\nFiles table created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to create files table:', error);
    process.exit(1);
  }
}

main();