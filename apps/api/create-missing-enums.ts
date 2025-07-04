import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getDatabaseConfig } from './src/config/config'

const dbConfig = getDatabaseConfig()
const sql = postgres(dbConfig.url!, { max: 1 })

async function createMissingEnums() {
  try {
    console.log('Creating missing enum types...')
    
    // Create enum types that might be missing
    await sql`
      DO $$ BEGIN
        CREATE TYPE "sync_job_type" AS ENUM('full', 'incremental', 'manual', 'webhook', 'initial');
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Type sync_job_type already exists';
      END $$;
    `
    
    await sql`
      DO $$ BEGIN
        CREATE TYPE "sync_job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Type sync_job_status already exists';
      END $$;
    `
    
    await sql`
      DO $$ BEGIN
        CREATE TYPE "provider_type" AS ENUM('xero', 'quickbooks', 'sage', 'other');
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Type provider_type already exists';
      END $$;
    `
    
    await sql`
      DO $$ BEGIN
        CREATE TYPE "transaction_status" AS ENUM('pending', 'validated', 'posted', 'reconciled', 'disputed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Type transaction_status already exists';
      END $$;
    `
    
    await sql`
      DO $$ BEGIN
        CREATE TYPE "enrichment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'manual');
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Type enrichment_status already exists';
      END $$;
    `
    
    console.log('✅ Enum types created successfully')
  } catch (error) {
    console.error('❌ Error creating enum types:', error)
  } finally {
    await sql.end()
  }
}

createMissingEnums()