#!/usr/bin/env tsx
/**
 * Script to register a test WhatsApp channel
 * Run with: bun run src/scripts/register-test-whatsapp.ts <phoneNumber> <userId> <tenantId>
 */

import { connectDatabase } from '../database/connection'
import { bootstrapDependencies } from '../infrastructure/bootstrap'
import { container, TOKENS } from '../shared/utils/container'
import type { UserChannelService } from '../services/user-channel.service'
import log from '../config/logger'

async function registerTestWhatsApp() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    log.error('Usage: bun run src/scripts/register-test-whatsapp.ts <phoneNumber> <userId> <tenantId>')
    log.error('Example: bun run src/scripts/register-test-whatsapp.ts +1234567890 user123 tenant123')
    process.exit(1)
  }
  
  const [phoneNumber, userId, tenantId] = args
  
  try {
    log.info('Connecting to database...')
    await connectDatabase()
    
    log.info('Bootstrapping dependencies...')
    bootstrapDependencies()
    
    const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
    if (!userChannelService) {
      throw new Error('UserChannelService not found in DI container')
    }
    
    log.info('Registering WhatsApp channel...', {
      phoneNumber,
      userId,
      tenantId
    })
    
    // Check if channel already exists
    const existing = await userChannelService.findByWhatsAppNumber(phoneNumber)
    if (existing) {
      log.warn('Channel already exists:', {
        channelId: existing.id.toString(),
        isVerified: existing.isVerified,
        status: existing.status
      })
      
      if (!existing.isVerified) {
        log.info('Channel is not verified. Auto-verifying for testing...')
        // For testing, directly update the database
        const db = await import('../database/connection').then(m => m.getDatabase())
        const { userChannels } = await import('../database/schema')
        const { eq } = await import('drizzle-orm')
        
        await db.update(userChannels)
          .set({ 
            is_verified: true,
            status: 'active'
          })
          .where(eq(userChannels.id, existing.id.toString()))
          
        log.info('Channel verified and activated')
      }
      
      process.exit(0)
    }
    
    // Create new channel
    const channel = await userChannelService.createChannel({
      userId,
      tenantId,
      channelType: 'whatsapp',
      channelIdentifier: phoneNumber,
      channelName: `Test WhatsApp ${phoneNumber}`
    })
    
    log.info('Channel created:', {
      channelId: channel.id.toString(),
      verificationCode: channel.verificationCode
    })
    
    // For testing, auto-verify the channel
    log.info('Auto-verifying channel for testing...')
    const db = await import('../database/connection').then(m => m.getDatabase())
    const { userChannels } = await import('../database/schema')
    const { eq } = await import('drizzle-orm')
    
    await db.update(userChannels)
      .set({ 
        is_verified: true,
        status: 'active'
      })
      .where(eq(userChannels.id, channel.id.toString()))
    
    log.info('✅ WhatsApp channel registered and verified successfully!')
    log.info('You can now send messages to this number via WhatsApp')
    
    process.exit(0)
  } catch (error) {
    log.error('Failed to register WhatsApp channel:', error)
    process.exit(1)
  }
}

registerTestWhatsApp()