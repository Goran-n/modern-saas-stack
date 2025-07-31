import { getDb } from "@figgy/shared-db";
import { sql } from "drizzle-orm";

async function checkEmailTables() {
  try {
    const db = getDb();
    
    // Check if email tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'email_%'
    `);
    
    console.log("Email tables found:", tables);
    
    // Check if email enums exist
    const enums = await db.execute(sql`
      SELECT typname 
      FROM pg_type 
      WHERE typname IN ('email_provider', 'email_connection_status', 'email_processing_status')
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);
    
    console.log("Email enums found:", enums);
    
    // If tables don't exist, try to create them
    if (!tables || tables.length === 0) {
      console.log("Email tables not found. Creating them now...");
      
      // Create enums (check if they exist first)
      const existingEnums = await db.execute(sql`
        SELECT typname FROM pg_type WHERE typname IN ('email_provider', 'email_connection_status', 'email_processing_status')
      `);
      
      const enumNames = existingEnums.map((row: any) => row.typname);
      
      if (!enumNames.includes('email_provider')) {
        await db.execute(sql`
          CREATE TYPE email_provider AS ENUM ('gmail', 'outlook', 'imap')
        `);
      }
      if (!enumNames.includes('email_connection_status')) {
        await db.execute(sql`
          CREATE TYPE email_connection_status AS ENUM ('active', 'inactive', 'error', 'expired')
        `);
      }
      if (!enumNames.includes('email_processing_status')) {
        await db.execute(sql`
          CREATE TYPE email_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed')
        `);
      }
      
      // Create email_connections table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          provider email_provider NOT NULL,
          email_address VARCHAR(255) NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at TIMESTAMP,
          imap_host VARCHAR(255),
          imap_port INTEGER,
          imap_username VARCHAR(255),
          imap_password TEXT,
          folder_filter JSONB NOT NULL DEFAULT '["INBOX"]'::jsonb,
          sender_filter JSONB NOT NULL DEFAULT '[]'::jsonb,
          subject_filter JSONB NOT NULL DEFAULT '[]'::jsonb,
          webhook_subscription_id VARCHAR(255),
          webhook_expires_at TIMESTAMP,
          status email_connection_status NOT NULL DEFAULT 'active',
          last_sync_at TIMESTAMP,
          last_error TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by TEXT NOT NULL
        )
      `);
      
      // Create email_processing_log table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_processing_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
          message_id VARCHAR(255) NOT NULL,
          thread_id VARCHAR(255),
          email_date TIMESTAMP NOT NULL,
          from_address VARCHAR(255),
          subject TEXT,
          attachment_count INTEGER NOT NULL DEFAULT 0,
          attachments_total_size INTEGER DEFAULT 0,
          processing_status email_processing_status NOT NULL DEFAULT 'pending',
          processed_at TIMESTAMP,
          processing_duration_ms INTEGER,
          file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          error_message TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(connection_id, message_id)
        )
      `);
      
      // Create email_rate_limits table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_rate_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
          emails_per_minute INTEGER NOT NULL DEFAULT 10,
          attachments_per_hour INTEGER NOT NULL DEFAULT 100,
          total_size_per_day INTEGER NOT NULL DEFAULT 1000000000,
          custom_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log("Email tables created successfully!");
    } else {
      console.log("Email tables already exist.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error checking/creating email tables:", error);
    process.exit(1);
  }
}

checkEmailTables();