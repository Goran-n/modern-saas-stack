import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'
import * as schema from '../database/schema/index'

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
    log.info('Database URL:', dbConfig.url?.replace(/:[^:]*@/, ':***@')) // Hide password
    
    const result = await migrate(db, { migrationsFolder: './drizzle' })
    log.info('✅ Database migrations completed successfully', result)
  } catch (error) {
    log.error('❌ Migration failed with detailed error:')
    console.error(error)
    
    // Try to get more details
    if (error instanceof Error) {
      log.error('Error name:', error.name)
      log.error('Error message:', error.message)
      log.error('Error stack:', error.stack)
    }
    
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

runMigrations()