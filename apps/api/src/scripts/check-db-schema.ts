import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'

async function checkSchema() {
  const dbConfig = getDatabaseConfig()
  if (!dbConfig.url) {
    log.error('DATABASE_URL is required')
    process.exit(1)
  }
  
  const client = postgres(dbConfig.url, { max: 1 })
  const drizzleDb = drizzle(client)
  
  try {
    // Check if user_channels table has the new columns
    const result = await drizzleDb.execute(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_channels'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `)
    
    log.info('Current user_channels columns:')
    result.forEach((row: any) => {
      log.info(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
    })
    
    // Check if auth_data column exists
    const hasAuthData = result.some((row: any) => row.column_name === 'auth_data')
    const hasIsVerified = result.some((row: any) => row.column_name === 'is_verified')
    const hasVerificationCode = result.some((row: any) => row.column_name === 'verification_code')
    const hasVerificationExpiresAt = result.some((row: any) => row.column_name === 'verification_expires_at')
    
    log.info('\nColumn status:')
    log.info(`  - auth_data: ${hasAuthData ? 'EXISTS (needs removal)' : 'REMOVED ✓'}`)
    log.info(`  - is_verified: ${hasIsVerified ? 'EXISTS ✓' : 'MISSING (needs creation)'}`)
    log.info(`  - verification_code: ${hasVerificationCode ? 'EXISTS ✓' : 'MISSING (needs creation)'}`)
    log.info(`  - verification_expires_at: ${hasVerificationExpiresAt ? 'EXISTS ✓' : 'MISSING (needs creation)'}`)
    
    // Check migration history
    const migrations = await drizzleDb.execute(`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 10;
    `)
    
    log.info('\nRecent migrations:')
    migrations.forEach((row: any, index: number) => {
      log.info(`  ${index + 1}. ${row.hash} - ${new Date(row.created_at).toISOString()}`)
    })
    
    await client.end()
    process.exit(0)
  } catch (error) {
    log.error('Failed to check schema:', error)
    await client.end()
    process.exit(1)
  }
}

checkSchema()