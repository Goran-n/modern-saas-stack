#!/usr/bin/env tsx

/**
 * Test script for WhatsApp integration end-to-end flow
 * 
 * This script tests:
 * 1. Phone number registration
 * 2. Verification code generation
 * 3. Phone verification
 * 4. Message handling via webhook
 */

import { container, setupContainer } from '../src/shared/utils/container'
import { TOKENS } from '../src/shared/utils/container'
import { drizzleDb } from '../src/database/client'
import log from '../src/config/logger'
import type { UserChannelService } from '../src/services/user-channel.service'
import type { ConversationService } from '../src/services/conversation.service'
import { getTwilioConfig } from '../src/config/config'

async function testWhatsAppFlow() {
  try {
    // Setup container
    await setupContainer()
    
    // Check Twilio configuration
    const twilioConfig = getTwilioConfig()
    if (!twilioConfig.isConfigured) {
      log.error('Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER')
      process.exit(1)
    }
    
    log.info('Starting WhatsApp integration test', {
      twilioNumber: twilioConfig.whatsappNumber,
      webhookUrl: twilioConfig.webhookUrl,
    })
    
    // Test data
    const testTenantId = 'test-tenant-123'
    const testUserId = 'test-user-123'
    const testPhoneNumber = '+447904523456' // Replace with your test number
    
    // Get services
    const userChannelService = container.resolve(TOKENS.USER_CHANNEL_SERVICE) as UserChannelService
    const conversationService = container.resolve(TOKENS.CONVERSATION_SERVICE) as ConversationService
    
    // Step 1: Register WhatsApp number
    log.info('Step 1: Registering WhatsApp number', { phoneNumber: testPhoneNumber })
    
    const channel = await userChannelService.registerWhatsApp({
      userId: testUserId,
      tenantId: testTenantId,
      phoneNumber: testPhoneNumber,
      channelName: 'Test WhatsApp Channel',
    })
    
    log.info('WhatsApp number registered', {
      channelId: channel.id,
      status: channel.status,
      isVerified: channel.isVerified,
    })
    
    // Step 2: Simulate verification (in production, user would receive SMS)
    if (!channel.isVerified) {
      log.info('Step 2: Simulating phone verification')
      
      // Get the verification code from the database (for testing only!)
      const result = await drizzleDb
        .selectFrom('user_channels')
        .select(['verification_code'])
        .where('id', '=', channel.id)
        .executeTakeFirst()
      
      if (result?.verification_code) {
        log.info('Found verification code', { code: result.verification_code })
        
        // Verify the phone
        const verifiedChannel = await userChannelService.verifyPhone({
          channelId: channel.id,
          verificationCode: result.verification_code,
        })
        
        log.info('Phone verified successfully', {
          channelId: verifiedChannel.id,
          isVerified: verifiedChannel.isVerified,
        })
      }
    }
    
    // Step 3: Simulate incoming message via webhook
    log.info('Step 3: Simulating incoming WhatsApp message')
    
    await conversationService.processIncomingWhatsAppMessage({
      tenantId: testTenantId,
      from: testPhoneNumber,
      to: twilioConfig.whatsappNumber!.replace('whatsapp:', ''),
      body: 'Test message from WhatsApp',
      messageSid: `test-message-${Date.now()}`,
    })
    
    log.info('Incoming message processed successfully')
    
    // Step 4: Send outbound message
    log.info('Step 4: Testing outbound message')
    
    // Get the conversation
    const conversations = await conversationService.listUserConversations({
      userId: testUserId,
      limit: 1,
    })
    
    if (conversations.conversations.length > 0) {
      const conversation = conversations.conversations[0]
      
      const outboundMessage = await conversationService.sendMessage({
        conversationId: conversation.id,
        userId: testUserId,
        content: 'Test outbound message from Kibly',
      })
      
      log.info('Outbound message sent', {
        messageId: outboundMessage.id,
        direction: outboundMessage.direction,
      })
    }
    
    log.info('✅ WhatsApp integration test completed successfully')
    
    // Cleanup (optional)
    log.info('Cleaning up test data...')
    await drizzleDb
      .deleteFrom('conversation_messages')
      .where('conversation_id', 'in', 
        drizzleDb
          .selectFrom('conversations')
          .select('id')
          .where('user_id', '=', testUserId)
      )
      .execute()
    
    await drizzleDb
      .deleteFrom('conversations')
      .where('user_id', '=', testUserId)
      .execute()
    
    await drizzleDb
      .deleteFrom('user_channels')
      .where('user_id', '=', testUserId)
      .execute()
    
    log.info('Test data cleaned up')
    
  } catch (error) {
    log.error('Test failed', { error })
    process.exit(1)
  }
  
  process.exit(0)
}

// Run the test
testWhatsAppFlow().catch(error => {
  log.error('Unhandled error', { error })
  process.exit(1)
})