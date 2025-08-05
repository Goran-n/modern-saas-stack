import { getDatabaseConnection } from '@figgy/shared-db';
import { sql } from 'drizzle-orm';

export interface TestDatabase {
  db: ReturnType<typeof getDatabaseConnection>;
  cleanup: () => Promise<void>;
}

/**
 * Sets up a test database for integration testing
 * Uses Docker PostgreSQL on port 5433 for isolation
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const DATABASE_URL = process.env.TEST_DATABASE_URL || 
    'postgresql://test:test@localhost:5433/figgy_test';
  
  // getDatabaseConnection expects just the URL string, not an object
  const db = getDatabaseConnection(DATABASE_URL);
  
  try {
    // Ensure tables exist (simplified version for testing)
    await ensureTablesExist(db);
    
    // Clear all test data
    await cleanTestData(db);
    
    return {
      db,
      cleanup: async () => {
        await cleanTestData(db);
        // Note: Don't close the connection as it's managed by singleton
      }
    };
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Ensures required tables exist for testing
 */
async function ensureTablesExist(db: ReturnType<typeof getDatabaseConnection>) {
  // Create extensions if not exists
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  
  // Create organisations table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS organisations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      organisation_id UUID REFERENCES organisations(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create file processing status enum
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE file_processing_status AS ENUM (
        'pending', 'pending_upload', 'processing', 'completed', 'failed', 'dead_letter'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$
  `);
  
  // Create files table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name TEXT NOT NULL,
      path_tokens TEXT[] NOT NULL,
      mime_type TEXT NOT NULL,
      size BIGINT NOT NULL,
      metadata JSONB,
      source TEXT NOT NULL CHECK (source IN ('integration', 'user_upload', 'whatsapp', 'slack', 'email')),
      source_id TEXT,
      tenant_id UUID NOT NULL,
      uploaded_by UUID NOT NULL,
      processing_status file_processing_status DEFAULT 'pending',
      bucket TEXT NOT NULL DEFAULT 'vault',
      content_hash TEXT,
      file_size BIGINT,
      thumbnail_path TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create other required tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS global_suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_processing_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

/**
 * Cleans all test data from the database
 */
async function cleanTestData(db: ReturnType<typeof getDatabaseConnection>) {
  // Delete in correct order to respect foreign keys
  await db.execute(sql`DELETE FROM email_processing_logs`);
  await db.execute(sql`DELETE FROM files`);
  await db.execute(sql`DELETE FROM suppliers`);
  await db.execute(sql`DELETE FROM global_suppliers`);
  await db.execute(sql`DELETE FROM users WHERE email LIKE '%@test.com'`);
  await db.execute(sql`DELETE FROM organisations WHERE name LIKE 'test-%'`);
}

/**
 * Creates test fixtures in the database
 */
export async function createTestFixtures(db: ReturnType<typeof getDatabaseConnection>) {
  // Create test organisation
  const [org] = await db.execute(sql`
    INSERT INTO organisations (id, name, created_at)
    VALUES (gen_random_uuid(), 'test-org', NOW())
    RETURNING id
  `);
  
  // Create test user
  const [user] = await db.execute(sql`
    INSERT INTO users (id, email, organisation_id, created_at)
    VALUES (gen_random_uuid(), 'test@test.com', ${org.id}, NOW())
    RETURNING id
  `);
  
  return {
    organisationId: org.id,
    userId: user.id,
    tenantId: org.id // In this system, tenantId = organisationId
  };
}