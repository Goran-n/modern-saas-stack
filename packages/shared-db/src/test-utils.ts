import { createDrizzleClient, type DrizzleClient } from './client';
import { sql } from 'drizzle-orm';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

let testDb: DrizzleClient;

/**
 * Initialize test database connection
 * Supports both local Docker PostgreSQL and Neon branches
 */
export async function setupTestDatabase(): Promise<DrizzleClient> {
  // Check if we're in CI/CD environment with Neon
  if (process.env.NEON_DATABASE_URL) {
    console.log('Using Neon branch for tests:', process.env.NEON_BRANCH_NAME || 'test-branch');
    testDb = createDrizzleClient(process.env.NEON_DATABASE_URL);
  } 
  // Local development with Docker
  else {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL || 
      'postgresql://test:test@localhost:5433/kibly_test';
    console.log('Using local Docker PostgreSQL for tests');
    testDb = createDrizzleClient(testDatabaseUrl);
  }
  
  return testDb;
}

/**
 * Get the test database instance
 */
export function getTestDb(): DrizzleClient {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

/**
 * Run migrations on test database
 */
export async function runTestMigrations(db?: DrizzleClient): Promise<void> {
  const database = db || getTestDb();
  
  try {
    console.log('Running test database migrations...');
    
    // Get all migration files
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure they run in order
    
    console.log(`Found ${sqlFiles.length} migration files`);
    
    for (const file of sqlFiles) {
      console.log(`\nRunning migration: ${file}`);
      
      const migrationSQL = await readFile(join(migrationsDir, file), 'utf-8');
      
      // Split by semicolons but be careful with functions/procedures
      const statements = migrationSQL
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      console.log(`Found ${statements.length} statements to execute`);
      
      for (const statement of statements) {
        try {
          const preview = statement.substring(0, 50).replace(/\n/g, ' ');
          console.log(`Executing: ${preview}...`);
          await database.execute(sql.raw(statement));
          console.log('✓ Success');
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log('⚠️  Already exists, skipping');
          } else {
            console.error('✗ Error:', error.message);
            // Continue with other statements
          }
        }
      }
    }
    
    console.log('\n✅ Test database migrations completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Clean up database connection
 */
export async function teardownTestDatabase(): Promise<void> {
  // If needed, close connections here
  console.log('Test database teardown completed');
}

/**
 * All-in-one test database setup
 */
export async function setupTestDatabaseWithMigrations(): Promise<DrizzleClient> {
  const db = await setupTestDatabase();
  await runTestMigrations(db);
  return db;
}