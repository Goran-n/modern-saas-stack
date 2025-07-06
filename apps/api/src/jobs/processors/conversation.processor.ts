import { Worker, Job } from 'bullmq'
import { getRedisConnection } from '../../config/redis'
import { container, TOKENS } from '../../shared/utils/container'
import { ConversationService } from '../../services/conversation.service'
import { OrchestrationService } from '../../services/orchestration.service'
import log from '../../config/logger'
import type { WebhookMessageDTO, OrchestrationJobData, OrchestrationRequest } from '@kibly/shared-types'

const redis = getRedisConnection()

// New webhook job data structure
export interface WebhookJobData {
  webhookMessage: WebhookMessageDTO
  tenantId: string
}

// Legacy job data structure
export interface LegacyJobData {
  tenantId: string
  from: string
  to: string
  body?: string
  mediaUrls?: string[]
  messageSid: string
}

// Union type for all job formats
export type ConversationJobData = WebhookJobData | LegacyJobData | OrchestrationJobData

// Type guards
function isWebhookFormat(data: ConversationJobData): data is WebhookJobData {
  return 'webhookMessage' in data && (data as any).webhookMessage !== undefined
}

function isOrchestrationFormat(data: ConversationJobData): data is OrchestrationJobData {
  return 'type' in data && (data as OrchestrationJobData).type === 'process_message'
}

function isOrchestrationRequest(payload: any): payload is OrchestrationRequest {
  return payload && typeof payload === 'object' && 'message' in payload && 'source' in payload
}

export const conversationProcessor = new Worker<ConversationJobData>(
  'conversation',
  async (job: Job<ConversationJobData>) => {
    const startTime = Date.now()
    
    try {
      // Handle orchestration jobs
      if (job.name === 'orchestrate_message' && isOrchestrationFormat(job.data)) {
        try {
          const orchestrationService = container.resolve<OrchestrationService>(TOKENS.ORCHESTRATION_SERVICE)
          if (!orchestrationService) {
            throw new Error('OrchestrationService not found in DI container')
          }
          
          // Type-safe payload access
          const logData: any = { jobId: job.id }
          if (isOrchestrationRequest(job.data.payload)) {
            logData.from = job.data.payload.message.from
            logData.source = job.data.payload.source
            logData.hasContent = !!job.data.payload.message.content
          }
          
          log.info('Processing orchestration job', logData)
          
          await orchestrationService.processAsync(job.data)
          
          const duration = Date.now() - startTime
          const successLogData: any = {
            jobId: job.id,
            duration
          }
          if (isOrchestrationRequest(job.data.payload)) {
            successLogData.from = job.data.payload.message.from
          }
          
          log.info('Orchestration message processed successfully', successLogData)
          
          return
        } catch (error) {
          // Log detailed orchestration error
          const errorLogData: any = {
            jobId: job.id,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : String(error),
            jobData: JSON.stringify(job.data)
          }
          if (isOrchestrationRequest(job.data.payload)) {
            errorLogData.from = job.data.payload.message.from
          }
          
          log.error('Orchestration processing failed', errorLogData)
          throw error
        }
      }
      
      // Extract message data with proper type checking
      let from: string
      let to: string
      let body: string | undefined
      let mediaUrls: string[]
      let messageSid: string
      
      if (isWebhookFormat(job.data)) {
        // New webhook format
        const webhookMessage = job.data.webhookMessage
        from = webhookMessage.from
        to = webhookMessage.to
        body = webhookMessage.content
        messageSid = webhookMessage.externalMessageId
        
        // Convert media URLs from objects to strings
        mediaUrls = webhookMessage.mediaUrls?.map(m => m.url) || []
      } else if ('from' in job.data) {
        // Legacy format
        const legacyData = job.data as LegacyJobData
        from = legacyData.from
        to = legacyData.to
        body = legacyData.body
        messageSid = legacyData.messageSid
        mediaUrls = legacyData.mediaUrls || []
      } else {
        throw new Error('Invalid job data format')
      }
      
      // Validate required fields
      if (!from || !to || !messageSid) {
        throw new Error(`Missing required fields: from=${from}, to=${to}, messageSid=${messageSid}`)
      }
      
      log.info('Processing WhatsApp message', {
        jobId: job.id,
        jobName: job.name,
        from,
        to,
        hasBody: !!body,
        mediaCount: mediaUrls.length,
        messageSid,
        dataStructure: isWebhookFormat(job.data) ? 'webhook' : 'legacy'
      })
      
      // Get conversation service from DI container
      const conversationService = container.resolve<ConversationService>(TOKENS.CONVERSATION_SERVICE)
      if (!conversationService) {
        throw new Error('ConversationService not found in DI container')
      }
      
      // Process the message
      // Get tenantId from job data
      const tenantId = 'tenantId' in job.data ? job.data.tenantId : undefined
      if (!tenantId) {
        throw new Error('Missing tenantId in job data')
      }
      
      const processData: Parameters<typeof conversationService.processIncomingWhatsAppMessage>[0] = {
        tenantId,
        from,
        to,
        messageSid,
        ...(body && { body }),
        ...(mediaUrls.length > 0 && { mediaUrls })
      }
      
      await conversationService.processIncomingWhatsAppMessage(processData)
      
      const duration = Date.now() - startTime
      log.info('WhatsApp message processed successfully', {
        jobId: job.id,
        duration,
        from,
        to,
        messageSid
      })
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Extract message data for logging
      let from: string | undefined
      let to: string | undefined
      
      if (isWebhookFormat(job.data)) {
        from = job.data.webhookMessage.from
        to = job.data.webhookMessage.to
      } else if ('from' in job.data) {
        const legacyData = job.data as LegacyJobData
        from = legacyData.from
        to = legacyData.to
      }
      
      log.error('Failed to process WhatsApp message', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause
        } : String(error),
        jobId: job.id,
        jobName: job.name,
        duration,
        from,
        to,
        tenantId: 'tenantId' in job.data ? job.data.tenantId : undefined,
        dataStructure: isWebhookFormat(job.data) ? 'webhook' : 'legacy',
        rawData: JSON.stringify(job.data)
      })
      
      // Log specific error types
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          log.error('Resource not found error', { 
            resource: error.message,
            from,
            to,
            tenantId: 'tenantId' in job.data ? job.data.tenantId : undefined
          })
        } else if (error.message.includes('resolve')) {
          log.error('Service resolution error', { 
            service: error.message,
            // Note: We can't access private container services, but the error message should be clear enough
          })
        }
      }
      
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 60000, // 100 jobs per minute
    },
  }
)

// Handle worker events
conversationProcessor.on('completed', (job) => {
  log.debug('Conversation job completed', { jobId: job.id })
})

conversationProcessor.on('failed', (job, err) => {
  log.error('Conversation job failed', {
    jobId: job?.id,
    jobName: job?.name,
    attemptsMade: job?.attemptsMade,
    maxAttempts: job?.opts?.attempts,
    error: err.message,
    errorType: err.name,
    stack: err.stack,
    jobData: job ? JSON.stringify(job.data) : 'No job data'
  })
})

conversationProcessor.on('error', (err) => {
  log.error('Conversation worker error', {
    error: err.message,
    stack: err.stack,
  })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('Closing conversation processor...')
  await conversationProcessor.close()
})

process.on('SIGINT', async () => {
  log.info('Closing conversation processor...')
  await conversationProcessor.close()
})