import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'
import * as schema from '../database/schema'

const dbConfig = getDatabaseConfig()

if (!dbConfig.url) {
  log.error('DATABASE_URL is required for migrations')
  process.exit(1)
}

const migrationClient = postgres(dbConfig.url, { max: 1 })
const db = drizzle(migrationClient, { schema })

async function runMigrations() {
  try {
    log.info('Running database migrations...')
    
    // Check current migration status
    const result = await migrationClient`
      SELECT COUNT(*) as count 
      FROM drizzle.__drizzle_migrations
    `.catch(() => ({ count: 0 }))
    
    const migrationCount = Array.isArray(result) && result.length > 0 
      ? (result[0] as any)?.count || 0 
      : (result as any)?.count || 0
    log.info(`Found ${migrationCount} existing migrations`)
    
    // Check which migrations have been applied
    const appliedMigrations = await migrationClient`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at
    `.catch(() => [])
    
    log.info('Applied migrations:')
    for (const migration of appliedMigrations as any[]) {
      log.info(`  - ${migration.id} (hash: ${migration.hash?.substring(0, 8)}...)`)
    }
    
    // Check if files table exists
    const filesTableExists = await migrationClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'files'
      )
    `.then(res => (res as any[])[0].exists).catch(() => false)
    
    log.info(`Files table exists: ${filesTableExists}`)
    
    await migrate(db, { migrationsFolder: './drizzle' })
    log.info('✅ Database migrations completed successfully')
    process.exit(0)
  } catch (error: any) {
    // Check if it's just a notice about existing schema
    if (error.message?.includes('already exists')) {
      log.info('✅ Database schema is up to date')
      process.exit(0)
    }
    log.error('❌ Migration failed:', error)
    log.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      severity: error.severity
    })
    
    // Log the full error object to see what we're missing
    console.error('Full error object:', JSON.stringify(error, null, 2))
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

runMigrations()