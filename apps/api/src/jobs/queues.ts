/**
 * Centralized queue exports for the application
 */

import { Queue } from 'bullmq'
import { getRedisConnection } from '../config/redis'
import type { WebhookJobData } from './processors/conversation.processor'
import type { OrchestrationJobData } from '@kibly/shared-types'

// Get Redis connection
const redis = getRedisConnection()

// Queue instances
export const conversationQueue = new Queue<WebhookJobData | OrchestrationJobData | any>('conversation', { 
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

// Re-export other queues from queue.config
export {
  syncIntegrationQueue,
  importTransactionsQueue,
  importSuppliersQueue,
  importAccountsQueue,
  importInvoicesQueue,
  importManualJournalsQueue,
  importBankStatementsQueue,
  enrichTransactionsQueue,
  // Helper functions
  addSyncJob,
  addImportTransactionsJob,
  addImportSuppliersJob,
  addImportAccountsJob,
  addImportInvoicesJob,
  addImportManualJournalsJob,
  addImportBankStatementsJob,
  addEnrichTransactionsJob,
  getQueueStats,
  closeQueues,
  // Constants
  QUEUE_NAMES,
} from './queue.config'

// Error handling for conversation queue
conversationQueue.on('error', (error) => {
  console.error('Conversation queue error:', error)
})

// Export close all queues function
export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    conversationQueue.close(),
    // closeQueues(), // TODO: Import this from queue.config when available
  ])
}