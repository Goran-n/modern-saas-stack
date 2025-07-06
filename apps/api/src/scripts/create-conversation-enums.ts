import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'

const dbConfig = getDatabaseConfig()

if (!dbConfig.url) {
  log.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = postgres(dbConfig.url, { max: 1 })

async function createEnums() {
  try {
    log.info('Creating conversation enum types...')
    
    // Create enum types
    await sql`CREATE TYPE channel_type AS ENUM ('whatsapp', 'slack', 'teams', 'email')`
    await sql`CREATE TYPE channel_status AS ENUM ('pending', 'active', 'inactive', 'failed')`
    await sql`CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'closed')`
    await sql`CREATE TYPE message_direction AS ENUM ('inbound', 'outbound')`
    await sql`CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'voice', 'system')`
    
    log.info('✅ Enum types created successfully')
    process.exit(0)
  } catch (error: any) {
    if (error.code === '42710') { // Type already exists
      log.info('✅ Enum types already exist')
      process.exit(0)
    }
    log.error('❌ Failed to create enum types:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

createEnums()