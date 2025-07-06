import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applySchemaChanges() {
  const dbConfig = getDatabaseConfig()
  if (!dbConfig.url) {
    log.error('DATABASE_URL is required')
    process.exit(1)
  }
  
  const client = postgres(dbConfig.url, { max: 1 })
  
  try {
    log.info('Applying user_channels schema changes...')
    
    // Read and execute the SQL file
    const sqlPath = join(__dirname, 'apply-user-channels-migration.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    
    // Execute the SQL
    await client.unsafe(sql)
    
    log.info('✅ Schema changes applied successfully!')
    
    // Insert migration record
    try {
      const migrationHash = '0007_add_verification_to_user_channels'
      await client`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${migrationHash}, NOW())
        ON CONFLICT (hash) DO NOTHING
      `
      log.info('✅ Migration record added')
    } catch (migrationError) {
      log.warn('Could not add migration record (may already exist):', migrationError)
    }
    
    await client.end()
    process.exit(0)
  } catch (error) {
    log.error('Failed to apply schema changes:', error)
    await client.end()
    process.exit(1)
  }
}

applySchemaChanges()