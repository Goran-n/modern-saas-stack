import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'

const dbConfig = getDatabaseConfig()

if (!dbConfig.url) {
  log.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(dbConfig.url)

async function checkTables() {
  try {
    log.info('Checking database tables...')
    
    // Check what tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    
    log.info('Existing tables:', tables.map(t => t.table_name))
    
    // Check what enums exist
    const enums = await client`
      SELECT typname as enum_name, array_agg(enumlabel) as values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typtype = 'e'
      GROUP BY typname
      ORDER BY typname
    `
    
    log.info('Existing enums:', enums)
    
    // Check migration status
    const migrations = await client`
      SELECT * FROM drizzle.__drizzle_migrations 
      ORDER BY created_at
    `
    
    log.info('Applied migrations:', migrations)
    
  } catch (error) {
    log.error('Failed to check tables:', error)
  } finally {
    await client.end()
  }
}

checkTables()