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
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

runMigrations()