#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { getDatabaseConfig } from '../config/config'
import log from '../config/logger'

/**
 * Migration script to update user_channels table for centralized Twilio
 */
async function migrateUserChannels() {
  const dbConfig = getDatabaseConfig()
  const client = postgres(dbConfig.url)
  const db = drizzle(client)
  
  try {
    log.info('Starting user_channels migration...')
    
    // Add new columns
    await db.execute(sql`
      ALTER TABLE user_channels
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP
    `)
    
    log.info('Added new columns')
    
    // Drop auth_data column (after backing up if needed)
    await db.execute(sql`
      ALTER TABLE user_channels
      DROP COLUMN IF EXISTS auth_data
    `)
    
    log.info('Removed auth_data column')
    
    // Update any existing WhatsApp channels to unverified
    await db.execute(sql`
      UPDATE user_channels
      SET is_verified = false,
          status = 'pending'
      WHERE channel_type = 'whatsapp'
    `)
    
    log.info('Migration completed successfully')
    
  } catch (error) {
    log.error('Migration failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Run migration
migrateUserChannels()
  .then(() => {
    log.info('Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    log.error('Migration script failed:', error)
    process.exit(1)
  })