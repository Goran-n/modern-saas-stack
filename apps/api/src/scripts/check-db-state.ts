import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'

const dbConfig = getDatabaseConfig()

if (!dbConfig.url) {
  log.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(dbConfig.url)

async function checkDatabaseState() {
  try {
    log.info('=== CHECKING DATABASE STATE ===')
    
    // Check what tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    
    console.log('📋 Tables:', tables.map(t => t.table_name))
    
    // Check what enums exist
    const enums = await client`
      SELECT typname as enum_name, array_agg(enumlabel ORDER BY enumsortorder) as values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typtype = 'e'
      GROUP BY typname
      ORDER BY typname
    `
    
    console.log('🏷️  Enums:')
    enums.forEach(e => {
      console.log(`  - ${e.enum_name}: [${e.values.join(', ')}]`)
    })
    
    // Check migration status
    try {
      const migrations = await client`
        SELECT id, hash, created_at 
        FROM drizzle.__drizzle_migrations 
        ORDER BY created_at
      `
      
      console.log('📦 Applied migrations:')
      migrations.forEach(m => {
        console.log(`  - ${m.id} (${m.created_at})`)
      })
    } catch (error) {
      console.log('📦 No migrations table found or accessible')
    }
    
    // Check if specific tables exist that we need
    const criticalTables = ['tenants', 'integrations', 'transactions', 'sync_jobs']
    
    for (const tableName of criticalTables) {
      try {
        const result = await client`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        `
        const exists = result[0].count > 0
        console.log(`✅ Table ${tableName}: ${exists ? 'EXISTS' : 'MISSING'}`)
      } catch (error) {
        console.log(`❌ Error checking table ${tableName}:`, error)
      }
    }
    
  } catch (error) {
    log.error('Failed to check database state:', error)
  } finally {
    await client.end()
  }
}

checkDatabaseState()