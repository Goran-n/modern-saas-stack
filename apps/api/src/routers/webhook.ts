/**
 * Webhook router using the new type system
 * This demonstrates how to use the centralized types, DTOs, and validation
 */

import { Hono } from 'hono'
import type { HonoVariables } from '../types/hono'
import log from '../config/logger'
import { getTwilioWhatsAppService } from '../integrations/messaging/twilio'
import { getTwilioConfig, getAIConfig } from '../config/config'
import {
  // Import enums
  MessageDirection,
  MessageType,
  ChannelType
} from '@kibly/shared-types'
import type {
  // Import DTOs
  WebhookMessageDTO,
  WebhookStatusDTO,
  // Import orchestration types
  OrchestrationJobData,
  OrchestrationRequest
} from '@kibly/shared-types'
import { z } from 'zod'
import type { WebhookJobData } from '../jobs/processors/conversation.processor'
import { conversationQueue } from '../jobs/queues'

// Validation schemas for webhook data
const twilioMessageWebhookSchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string().optional(),
  MessageSid: z.string(),
  NumMedia: z.string().default('0'),
  AccountSid: z.string(),
  ProfileName: z.string().optional(),
})

const twilioStatusWebhookSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.enum(['queued', 'sent', 'delivered', 'undelivered', 'failed', 'read']),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
  To: z.string(),
  From: z.string(),
})

export function createWebhookRouter(app: Hono<{ Variables: HonoVariables }>) {
  // Twilio WhatsApp webhook
  app.post('/webhooks/twilio/whatsapp', async (c) => {
    const signature = c.req.header('X-Twilio-Signature')
    
    try {
      // Parse form data
      const body = await c.req.parseBody()
      
      // Validate webhook signature if configured
      const twilioConfig = getTwilioConfig()
      if (twilioConfig.isConfigured && twilioConfig.webhookUrl) {
        const twilioService = getTwilioWhatsAppService()
        const params = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
        
        const isValid = twilioService.validateWebhookSignature(
          signature,
          twilioConfig.webhookUrl,
          params
        )
        
        if (!isValid) {
          log.warn('Invalid Twilio webhook signature')
          return c.text('Forbidden', 403)
        }
      }
      
      // Parse and validate webhook data
      const parsedData = twilioMessageWebhookSchema.safeParse(body)
      if (!parsedData.success) {
        log.error('Invalid webhook data', { 
          errors: parsedData.error.errors,
          body 
        })
        // Still return 200 to avoid Twilio retries
        return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
          'Content-Type': 'text/xml',
        })
      }
      
      const webhookData = parsedData.data
      
      // Create WebhookMessageDTO
      const messageDto: WebhookMessageDTO = {
        channelType: ChannelType.WHATSAPP,
        from: webhookData.From.replace('whatsapp:', ''),
        to: webhookData.To.replace('whatsapp:', ''),
        content: webhookData.Body || undefined,
        externalMessageId: webhookData.MessageSid,
        direction: MessageDirection.INBOUND,
        messageType: MessageType.TEXT,
        metadata: {
          profileName: webhookData.ProfileName || undefined,
          accountSid: webhookData.AccountSid,
        },
        mediaUrls: [],
        receivedAt: new Date(),
      }
      
      // Extract media URLs if present
      const numMedia = parseInt(webhookData.NumMedia || '0')
      if (numMedia > 0) {
        messageDto.messageType = MessageType.MEDIA
        messageDto.mediaUrls = []
        
        for (let i = 0; i < numMedia; i++) {
          const url = body[`MediaUrl${i}`] as string
          const contentType = body[`MediaContentType${i}`] as string
          
          if (url) {
            messageDto.mediaUrls.push({
              url,
              contentType: contentType || 'unknown',
            })
          }
        }
        
        messageDto.metadata.mediaCount = numMedia
      }
      
      log.info('Received WhatsApp webhook message', {
        from: messageDto.from,
        to: messageDto.to,
        messageType: messageDto.messageType,
        hasContent: !!messageDto.content,
        mediaCount: messageDto.mediaUrls.length,
        externalMessageId: messageDto.externalMessageId,
      })
      
      // Check if AI orchestration is configured
      const aiConfig = getAIConfig()
      if (aiConfig.isConfigured && messageDto.messageType === MessageType.TEXT && messageDto.content) {
        // Queue for AI orchestration
        const orchestrationData: OrchestrationJobData = {
          type: 'process_message',
          payload: {
            message: {
              content: messageDto.content || '',
              mediaUrls: messageDto.mediaUrls?.map(m => m.url) || [],
              messageId: messageDto.externalMessageId,
              from: messageDto.from // This already has 'whatsapp:' prefix removed
            },
            source: 'whatsapp',
            userId: '', // Will be determined in processor
            tenantId: '', // Will be determined in processor
            channelId: '', // Will be determined in processor
            mode: 'async'
          } as OrchestrationRequest
        }
        
        await conversationQueue.add('orchestrate_message', orchestrationData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        })
        
        log.info('Message queued for AI orchestration', {
          from: messageDto.from,
          messageId: messageDto.externalMessageId
        })
      } else {
        // Queue for standard processing (no AI)
        const jobData: WebhookJobData = {
          webhookMessage: messageDto,
          // Tenant will be determined from phone number in processor
          tenantId: 'webhook',
        }
        
        await conversationQueue.add('process_whatsapp_message', jobData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        })
      }
      
      // Return TwiML response immediately (empty response to acknowledge)
      return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
        'Content-Type': 'text/xml',
      })
      
    } catch (error) {
      log.error('Webhook processing error', { error })
      
      // Still return 200 to avoid Twilio retries
      return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
        'Content-Type': 'text/xml',
      })
    }
  })
  
  // Twilio status callback (for delivery receipts)
  app.post('/webhooks/twilio/status', async (c) => {
    try {
      const body = await c.req.parseBody()
      
      // Parse and validate status data
      const parsedData = twilioStatusWebhookSchema.safeParse(body)
      if (!parsedData.success) {
        log.error('Invalid status webhook data', { 
          errors: parsedData.error.errors,
          body 
        })
        return c.text('OK', 200)
      }
      
      const statusData = parsedData.data
      
      // Create WebhookStatusDTO
      const statusDto: WebhookStatusDTO = {
        channelType: ChannelType.WHATSAPP,
        externalMessageId: statusData.MessageSid,
        status: statusData.MessageStatus,
        from: statusData.From.replace('whatsapp:', ''),
        to: statusData.To.replace('whatsapp:', ''),
        errorCode: statusData.ErrorCode || undefined,
        errorMessage: statusData.ErrorMessage || undefined,
        updatedAt: new Date(),
      }
      
      log.info('Received Twilio status callback', {
        externalMessageId: statusDto.externalMessageId,
        status: statusDto.status,
        hasError: !!statusDto.errorCode,
      })
      
      // Queue for async processing with typed payload
      await conversationQueue.add('update_message_status', {
        statusUpdate: statusDto,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      })
      
      return c.text('OK', 200)
    } catch (error) {
      log.error('Status callback error', { error })
      return c.text('OK', 200)
    }
  })
  
  // Health check endpoint for webhook service
  app.get('/webhooks/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/webhooks/twilio/whatsapp',
        '/webhooks/twilio/status',
      ],
    })
  })
}