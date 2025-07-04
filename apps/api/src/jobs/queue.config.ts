import { Queue, Job, type QueueOptions } from 'bullmq'
import { getRedisConfig } from '../config/config'
import log from '../config/logger'

// Simple Redis connection config for BullMQ
const rawRedisConfig = getRedisConfig()
const redisConnection: any = {
  host: rawRedisConfig.host,
  port: rawRedisConfig.port,
}
if (rawRedisConfig.username) {
  redisConnection.username = rawRedisConfig.username
}
if (rawRedisConfig.password) {
  redisConnection.password = rawRedisConfig.password
}
if (rawRedisConfig.tls) {
  redisConnection.tls = rawRedisConfig.tls
}

// Job data interfaces
export interface SyncJobData {
  integrationId: string
  tenantId: string
  syncType: 'full' | 'incremental' | 'manual' | 'webhook' | 'initial'
  priority: number
  metadata?: Record<string, unknown>
}

export interface ImportTransactionsJobData {
  integrationId: string
  tenantId: string
  syncJobId: string
  accountIds?: string[]
  dateFrom?: string
  dateTo?: string
}

export interface ImportSuppliersJobData {
  integrationId: string
  tenantId: string
  syncJobId: string
  modifiedSince?: string
  includeArchived?: boolean
}

export interface ImportAccountsJobData {
  integrationId: string
  tenantId: string
  syncJobId: string
  includeArchived?: boolean
}

export interface ImportInvoicesJobData {
  integrationId: string
  tenantId: string
  syncJobId: string
  modifiedSince?: string
  invoiceTypes?: ('ACCPAY' | 'ACCREC')[]
  statuses?: string[]
}

export interface ImportManualJournalsJobData {
  integrationId: string
  tenantId: string
  syncJobId: string
  modifiedSince?: string
}

export interface ImportBankStatementsJobData {
  integrationId: string
  tenantId: string
  syncJobId: string
  accountIds?: string[]
  modifiedSince?: string
  fromDate?: string
  toDate?: string
}

export interface EnrichTransactionsJobData {
  tenantId: string
  transactionIds: string[]
  syncJobId?: string
}

// Queue names
export const QUEUE_NAMES = {
  SYNC_INTEGRATION: 'sync-integration',
  IMPORT_TRANSACTIONS: 'import-transactions',
  IMPORT_SUPPLIERS: 'import-suppliers',
  IMPORT_ACCOUNTS: 'import-accounts',
  IMPORT_INVOICES: 'import-invoices',
  IMPORT_MANUAL_JOURNALS: 'import-manual-journals',
  IMPORT_BANK_STATEMENTS: 'import-bank-statements',
  ENRICH_TRANSACTIONS: 'enrich-transactions',
} as const

// Default queue options
const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
}

// Default worker options

// Queue instances
export const syncIntegrationQueue = new Queue<SyncJobData>(
  QUEUE_NAMES.SYNC_INTEGRATION,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      delay: 0,
      priority: 0,
    },
  }
)

export const importTransactionsQueue = new Queue<ImportTransactionsJobData>(
  QUEUE_NAMES.IMPORT_TRANSACTIONS,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  }
)

export const importSuppliersQueue = new Queue<ImportSuppliersJobData>(
  QUEUE_NAMES.IMPORT_SUPPLIERS,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  }
)

export const importAccountsQueue = new Queue<ImportAccountsJobData>(
  QUEUE_NAMES.IMPORT_ACCOUNTS,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    },
  }
)

export const importInvoicesQueue = new Queue<ImportInvoicesJobData>(
  QUEUE_NAMES.IMPORT_INVOICES,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  }
)

export const importManualJournalsQueue = new Queue<ImportManualJournalsJobData>(
  QUEUE_NAMES.IMPORT_MANUAL_JOURNALS,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    },
  }
)

export const importBankStatementsQueue = new Queue<ImportBankStatementsJobData>(
  QUEUE_NAMES.IMPORT_BANK_STATEMENTS,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  }
)

export const enrichTransactionsQueue = new Queue<EnrichTransactionsJobData>(
  QUEUE_NAMES.ENRICH_TRANSACTIONS,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      delay: 1000, // Small delay to batch enrichment requests
      attempts: 2,
    },
  }
)

// Helper functions
export async function addSyncJob(
  integrationId: string,
  tenantId: string,
  syncType: SyncJobData['syncType'],
  options?: {
    priority?: number
    delay?: number
    metadata?: Record<string, unknown>
  }
): Promise<Job<SyncJobData>> {
  const jobData: SyncJobData = {
    integrationId,
    tenantId,
    syncType,
    priority: options?.priority || 0,
    metadata: options?.metadata || {},
  }

  return await syncIntegrationQueue.add(
    `sync-${integrationId}-${Date.now()}`,
    jobData,
    {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `sync-${integrationId}-${syncType}-${Date.now()}`,
    }
  )
}

export async function addImportTransactionsJob(
  data: ImportTransactionsJobData,
  options?: {
    priority?: number
    delay?: number
  }
): Promise<Job<ImportTransactionsJobData>> {
  return await importTransactionsQueue.add(
    `import-${data.integrationId}-${Date.now()}`,
    data,
    {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `import-${data.integrationId}-${Date.now()}`,
    }
  )
}

export async function addImportSuppliersJob(
  data: ImportSuppliersJobData,
  options?: {
    priority?: number
    delay?: number
  }
): Promise<Job<ImportSuppliersJobData>> {
  return await importSuppliersQueue.add(
    `import-suppliers-${data.integrationId}-${Date.now()}`,
    data,
    {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `import-suppliers-${data.integrationId}-${Date.now()}`,
    }
  )
}

export async function addImportAccountsJob(
  data: ImportAccountsJobData,
  options?: {
    priority?: number
    delay?: number
  }
): Promise<Job<ImportAccountsJobData>> {
  return await importAccountsQueue.add(
    `import-accounts-${data.integrationId}-${Date.now()}`,
    data,
    {
      priority: options?.priority || 1, // Higher priority for accounts
      delay: options?.delay || 0,
      jobId: `import-accounts-${data.integrationId}-${Date.now()}`,
    }
  )
}

export async function addImportInvoicesJob(
  data: ImportInvoicesJobData,
  options?: {
    priority?: number
    delay?: number
  }
): Promise<Job<ImportInvoicesJobData>> {
  return await importInvoicesQueue.add(
    `import-invoices-${data.integrationId}-${Date.now()}`,
    data,
    {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `import-invoices-${data.integrationId}-${Date.now()}`,
    }
  )
}

export async function addImportManualJournalsJob(
  data: ImportManualJournalsJobData,
  options?: {
    priority?: number
    delay?: number
  }
): Promise<Job<ImportManualJournalsJobData>> {
  return await importManualJournalsQueue.add(
    `import-journals-${data.integrationId}-${Date.now()}`,
    data,
    {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `import-journals-${data.integrationId}-${Date.now()}`,
    }
  )
}

export async function addImportBankStatementsJob(
  data: ImportBankStatementsJobData,
  options?: {
    priority?: number
    delay?: number
  }
): Promise<Job<ImportBankStatementsJobData>> {
  return await importBankStatementsQueue.add(
    `import-statements-${data.integrationId}-${Date.now()}`,
    data,
    {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `import-statements-${data.integrationId}-${Date.now()}`,
    }
  )
}

export async function addEnrichTransactionsJob(
  data: EnrichTransactionsJobData,
  options?: {
    priority?: number
    delay?: number
  }
): Promise<Job<EnrichTransactionsJobData>> {
  return await enrichTransactionsQueue.add(
    `enrich-${data.tenantId}-${Date.now()}`,
    data,
    {
      priority: options?.priority || 0,
      delay: options?.delay || 1000, // Default 1s delay for batching
      jobId: `enrich-${data.tenantId}-${Date.now()}`,
    }
  )
}

// Queue monitoring
export async function getQueueStats() {
  const [
    syncStats,
    importTransStats,
    importSuppliersStats,
    importAccountsStats,
    importInvoicesStats,
    importJournalsStats,
    importStatementsStats,
    enrichStats
  ] = await Promise.all([
    syncIntegrationQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    importTransactionsQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    importSuppliersQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    importAccountsQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    importInvoicesQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    importManualJournalsQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    importBankStatementsQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    enrichTransactionsQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
  ])

  return {
    syncIntegration: syncStats,
    importTransactions: importTransStats,
    importSuppliers: importSuppliersStats,
    importAccounts: importAccountsStats,
    importInvoices: importInvoicesStats,
    importManualJournals: importJournalsStats,
    importBankStatements: importStatementsStats,
    enrichTransactions: enrichStats,
  }
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  log.info('Closing job queues...')
  
  await Promise.all([
    syncIntegrationQueue.close(),
    importTransactionsQueue.close(),
    importSuppliersQueue.close(),
    importAccountsQueue.close(),
    importInvoicesQueue.close(),
    importManualJournalsQueue.close(),
    importBankStatementsQueue.close(),
    enrichTransactionsQueue.close(),
  ])
  
  log.info('Job queues closed')
}

// Error handling for queues
syncIntegrationQueue.on('error', (error) => {
  log.error('Sync integration queue error:', error)
})

importTransactionsQueue.on('error', (error) => {
  log.error('Import transactions queue error:', error)
})

importSuppliersQueue.on('error', (error) => {
  log.error('Import suppliers queue error:', error)
})

importAccountsQueue.on('error', (error) => {
  log.error('Import accounts queue error:', error)
})

importInvoicesQueue.on('error', (error) => {
  log.error('Import invoices queue error:', error)
})

importManualJournalsQueue.on('error', (error) => {
  log.error('Import manual journals queue error:', error)
})

importBankStatementsQueue.on('error', (error) => {
  log.error('Import bank statements queue error:', error)
})

enrichTransactionsQueue.on('error', (error) => {
  log.error('Enrich transactions queue error:', error)
})