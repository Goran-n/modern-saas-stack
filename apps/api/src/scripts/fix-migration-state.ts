import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'
import * as fs from 'fs'
import * as crypto from 'crypto'

const dbConfig = getDatabaseConfig()

if (!dbConfig.url) {
  log.error('DATABASE_URL is required')
  process.exit(1)
}

const migrationClient = postgres(dbConfig.url, { max: 1 })

async function fixMigrationState() {
  try {
    log.info('Checking migration state...')
    
    // Check which migrations are applied
    const appliedMigrations = await migrationClient`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY id
    `
    
    log.info('Currently applied migrations:')
    for (const migration of appliedMigrations as any[]) {
      log.info(`  - ${migration.id} (hash: ${migration.hash?.substring(0, 8)}...)`)
    }
    
    // Check if migration 5 (0005_pale_maximus.sql) exists but isn't marked as applied
    const migration5Applied = appliedMigrations.some((m: any) => m.id === 5)
    
    if (!migration5Applied) {
      // Check if the files table exists (indicating migration 5 was partially applied)
      const filesTableExists = await migrationClient`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'files'
        )
      `.then(res => (res as any[])[0].exists)
      
      if (filesTableExists) {
        log.info('Files table exists but migration 5 is not marked as applied')
        log.info('Reading migration 5 file to get hash...')
        
        // Read the migration file and calculate its hash
        const migrationContent = fs.readFileSync('./drizzle/0005_pale_maximus.sql', 'utf8')
        const hash = crypto.createHash('sha256').update(migrationContent).digest('hex')
        
        log.info('Marking migration 5 as applied...')
        await migrationClient`
          INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) 
          VALUES (5, ${hash}, ${Date.now()})
        `
        
        log.info('✅ Migration 5 marked as applied')
      } else {
        log.info('Files table does not exist, migration 5 was not applied')
      }
    } else {
      log.info('Migration 5 is already marked as applied')
    }
    
    // Now try to apply any remaining migrations
    log.info('Applying any remaining migrations...')
    
    process.exit(0)
  } catch (error) {
    log.error('❌ Failed to fix migration state:', error)
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

fixMigrationState()