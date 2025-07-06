#!/usr/bin/env tsx
/**
 * Script to check WhatsApp channels in the database
 * Run with: bun run src/scripts/check-whatsapp-channels.ts
 */

import { connectDatabase, getDatabase } from '../database/connection'
import { userChannels } from '../database/schema'
import log from '../config/logger'
import { eq } from 'drizzle-orm'

async function checkWhatsAppChannels() {
  try {
    log.info('Connecting to database...')
    await connectDatabase()
    const db = getDatabase()
    
    // Get all WhatsApp channels
    const whatsappChannels = await db
      .select()
      .from(userChannels)
      .where(eq(userChannels.channel_type, 'whatsapp'))
    
    log.info(`Found ${whatsappChannels.length} WhatsApp channels`)
    
    if (whatsappChannels.length > 0) {
      log.info('WhatsApp channels:')
      whatsappChannels.forEach(channel => {
        log.info({
          id: channel.id,
          userId: channel.user_id,
          tenantId: channel.tenant_id,
          channelIdentifier: channel.channel_identifier,
          isVerified: channel.is_verified,
          status: channel.status,
          createdAt: channel.created_at
        })
      })
    } else {
      log.warn('No WhatsApp channels found in the database')
      log.info('To register a WhatsApp channel, use the API endpoint:')
      log.info('POST /api/user-channels/whatsapp/register')
      log.info('With body: { phoneNumber: "+1234567890", channelName: "My WhatsApp" }')
    }
    
    process.exit(0)
  } catch (error) {
    log.error('Failed to check WhatsApp channels:', error)
    process.exit(1)
  }
}

checkWhatsAppChannels()