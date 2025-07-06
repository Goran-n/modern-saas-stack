import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'

async function verifySchema() {
  const dbConfig = getDatabaseConfig()
  if (!dbConfig.url) {
    log.error('DATABASE_URL is required')
    process.exit(1)
  }
  
  const client = postgres(dbConfig.url, { max: 1 })
  
  try {
    // Check user_channels columns
    const columns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_channels'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `
    
    log.info('Current user_channels columns:')
    columns.forEach(col => {
      log.info(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // Check specific columns
    const columnNames = columns.map(c => c.column_name)
    const hasAuthData = columnNames.includes('auth_data')
    const hasIsVerified = columnNames.includes('is_verified')
    const hasVerificationCode = columnNames.includes('verification_code')
    const hasVerificationExpiresAt = columnNames.includes('verification_expires_at')
    
    log.info('\nColumn verification:')
    log.info(`  ✓ auth_data removed: ${!hasAuthData}`)
    log.info(`  ✓ is_verified exists: ${hasIsVerified}`)
    log.info(`  ✓ verification_code exists: ${hasVerificationCode}`)
    log.info(`  ✓ verification_expires_at exists: ${hasVerificationExpiresAt}`)
    
    const allGood = !hasAuthData && hasIsVerified && hasVerificationCode && hasVerificationExpiresAt
    
    if (allGood) {
      log.info('\n✅ Database schema is fully up to date!')
    } else {
      log.error('\n❌ Database schema is not fully updated')
    }
    
    await client.end()
    process.exit(allGood ? 0 : 1)
  } catch (error) {
    log.error('Failed to verify schema:', error)
    await client.end()
    process.exit(1)
  }
}

verifySchema()