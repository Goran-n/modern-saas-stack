import { Worker, Job } from 'bullmq'
import { getRedisConfig } from '../../config/config'
import { 
  type SyncJobData, 
  type ImportTransactionsJobData,
  type ImportSuppliersJobData,
  type ImportAccountsJobData,
  type ImportInvoicesJobData,
  type ImportManualJournalsJobData,
  type ImportBankStatementsJobData,
  QUEUE_NAMES,
  addImportTransactionsJob,
  addImportSuppliersJob,
  addImportAccountsJob,
  addImportInvoicesJob,
  addImportManualJournalsJob,
  addImportBankStatementsJob
} from '../queue.config'
import { getImportTransactionsUseCase } from '../../infrastructure/bootstrap'
import log from '../../config/logger'

// Simple Redis connection config for processors
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

// Sync integration processor
export const syncIntegrationProcessor = new Worker<SyncJobData>(
  QUEUE_NAMES.SYNC_INTEGRATION,
  async (job: Job<SyncJobData>) => {
    const { integrationId, tenantId, syncType, metadata } = job.data
    
    log.info('Processing sync integration job', {
      jobId: job.id,
      integrationId,
      tenantId,
      syncType,
    })

    try {
      // Update job progress
      await job.updateProgress(10)

      // Determine which entities to sync
      const entitiesToSync = metadata?.entities as string[] || ['all']
      const includeAll = entitiesToSync.includes('all')
      const jobPromises = []
      
      // 1. Import Chart of Accounts (should be first)
      if (includeAll || entitiesToSync.includes('accounts')) {
        const accountsJobData: ImportAccountsJobData = {
          integrationId,
          tenantId,
          syncJobId: metadata?.syncJobId as string,
        }
        if (metadata?.includeArchived !== undefined) {
          accountsJobData.includeArchived = metadata.includeArchived as boolean
        }
        jobPromises.push(
          addImportAccountsJob(accountsJobData, { priority: 10 }) // Higher priority
        )
      }
      
      await job.updateProgress(20)
      
      // 2. Import Suppliers/Contacts
      if (includeAll || entitiesToSync.includes('suppliers')) {
        const suppliersJobData: ImportSuppliersJobData = {
          integrationId,
          tenantId,
          syncJobId: metadata?.syncJobId as string,
        }
        if (metadata?.modifiedSince) {
          suppliersJobData.modifiedSince = metadata.modifiedSince as string
        }
        if (metadata?.includeArchived !== undefined) {
          suppliersJobData.includeArchived = metadata.includeArchived as boolean
        }
        jobPromises.push(
          addImportSuppliersJob(suppliersJobData, { priority: 5 })
        )
      }
      
      await job.updateProgress(30)
      
      // 3. Import Invoices/Bills
      if (includeAll || entitiesToSync.includes('invoices')) {
        const invoicesJobData: ImportInvoicesJobData = {
          integrationId,
          tenantId,
          syncJobId: metadata?.syncJobId as string,
        }
        if (metadata?.modifiedSince !== undefined) {
          invoicesJobData.modifiedSince = metadata.modifiedSince as string
        }
        if (metadata?.invoiceTypes !== undefined) {
          invoicesJobData.invoiceTypes = metadata.invoiceTypes as ('ACCPAY' | 'ACCREC')[]
        }
        if (metadata?.statuses !== undefined) {
          invoicesJobData.statuses = metadata.statuses as string[]
        }
        jobPromises.push(
          addImportInvoicesJob(invoicesJobData, { priority: 3 })
        )
      }
      
      await job.updateProgress(40)
      
      // 4. Import Bank Transactions
      if (includeAll || entitiesToSync.includes('transactions')) {
        const transactionsJobData: ImportTransactionsJobData = {
          integrationId,
          tenantId,
          syncJobId: metadata?.syncJobId as string,
        }
        if (metadata?.accountIds) {
          transactionsJobData.accountIds = metadata.accountIds as string[]
        }
        if (metadata?.dateFrom) {
          transactionsJobData.dateFrom = metadata.dateFrom as string
        }
        if (metadata?.dateTo) {
          transactionsJobData.dateTo = metadata.dateTo as string
        }
        jobPromises.push(
          addImportTransactionsJob(transactionsJobData, { priority: 2 })
        )
      }
      
      await job.updateProgress(50)
      
      // 5. Import Bank Statements
      if (includeAll || entitiesToSync.includes('bankStatements')) {
        const statementsJobData: ImportBankStatementsJobData = {
          integrationId,
          tenantId,
          syncJobId: metadata?.syncJobId as string,
        }
        if (metadata?.accountIds) {
          statementsJobData.accountIds = metadata.accountIds as string[]
        }
        if (metadata?.modifiedSince) {
          statementsJobData.modifiedSince = metadata.modifiedSince as string
        }
        if (metadata?.dateFrom) {
          statementsJobData.fromDate = metadata.dateFrom as string
        }
        if (metadata?.dateTo) {
          statementsJobData.toDate = metadata.dateTo as string
        }
        jobPromises.push(
          addImportBankStatementsJob(statementsJobData, { priority: 2 })
        )
      }
      
      await job.updateProgress(60)
      
      // 6. Import Manual Journals
      if (includeAll || entitiesToSync.includes('journals')) {
        const journalsJobData: ImportManualJournalsJobData = {
          integrationId,
          tenantId,
          syncJobId: metadata?.syncJobId as string,
        }
        if (metadata?.modifiedSince) {
          journalsJobData.modifiedSince = metadata.modifiedSince as string
        }
        jobPromises.push(
          addImportManualJournalsJob(journalsJobData, { priority: 1 })
        )
      }
      
      // Add all jobs to queues
      const importJobs = await Promise.all(jobPromises)
      
      await job.updateProgress(100)
      
      log.info('Sync integration job delegated to import jobs', {
        jobId: job.id,
        importJobCount: importJobs.length,
        importJobIds: importJobs.map(j => j.id),
        integrationId,
      })
      
      return {
        success: true,
        importJobIds: importJobs.map(j => j.id),
        message: `Sync job delegated to ${importJobs.length} import jobs`,
      }
    } catch (error) {
      log.error('Sync integration job failed', {
        jobId: job.id,
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
    maxStalledCount: 1,
    stalledInterval: 30000,
  }
)

// Import transactions processor
export const importTransactionsProcessor = new Worker<ImportTransactionsJobData>(
  QUEUE_NAMES.IMPORT_TRANSACTIONS,
  async (job: Job<ImportTransactionsJobData>) => {
    const { integrationId, tenantId, syncJobId } = job.data
    
    log.info('Processing import transactions job', {
      jobId: job.id,
      integrationId,
      tenantId,
      syncJobId,
    })

    try {
      // Use the real ImportTransactionsUseCase from DI container
      const importTransactionsUseCase = getImportTransactionsUseCase()
      
      log.info('Starting real transaction import from Xero', {
        jobId: job.id,
        integrationId,
        tenantId,
        syncJobId,
      })

      await job.updateProgress(25)

      // Execute the real use case
      const executeInput: any = {
        integrationId,
        tenantId,
        syncJobId,
      }
      if (job.data.accountIds) {
        executeInput.accountIds = job.data.accountIds
      }
      if (job.data.dateFrom) {
        executeInput.dateFrom = new Date(job.data.dateFrom)
      }
      if (job.data.dateTo) {
        executeInput.dateTo = new Date(job.data.dateTo)
      }
      
      const result = await importTransactionsUseCase.execute(executeInput)

      await job.updateProgress(100)

      log.info('Import transactions job completed successfully', {
        jobId: job.id,
        integrationId,
        result,
      })

      return result
    } catch (error) {
      log.error('Import transactions job failed', {
        jobId: job.id,
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    maxStalledCount: 1,
    stalledInterval: 30000,
  }
)

// Error handlers
syncIntegrationProcessor.on('completed', (job) => {
  log.info('Sync integration job completed', { jobId: job.id })
})

syncIntegrationProcessor.on('failed', (job, err) => {
  log.error('Sync integration job failed', { 
    jobId: job?.id, 
    error: err.message 
  })
})

importTransactionsProcessor.on('completed', (job) => {
  log.info('Import transactions job completed', { jobId: job.id })
})

importTransactionsProcessor.on('failed', (job, err) => {
  log.error('Import transactions job failed', { 
    jobId: job?.id, 
    error: err.message 
  })
})

// Import suppliers processor
export const importSuppliersProcessor = new Worker<ImportSuppliersJobData>(
  QUEUE_NAMES.IMPORT_SUPPLIERS,
  async (job: Job<ImportSuppliersJobData>) => {
    const { integrationId, tenantId, syncJobId } = job.data
    
    log.info('Processing import suppliers job', {
      jobId: job.id,
      integrationId,
      tenantId,
      syncJobId,
    })

    try {
      // TODO: Get ImportSuppliersUseCase from DI container
      // const importSuppliersUseCase = getImportSuppliersUseCase()
      
      await job.updateProgress(25)
      
      // Placeholder for now
      log.warn('ImportSuppliersUseCase not yet integrated with DI container')
      
      await job.updateProgress(100)
      
      return {
        totalFetched: 0,
        created: 0,
        updated: 0,
        errors: 0,
        message: 'Suppliers import processor not yet implemented',
      }
    } catch (error) {
      log.error('Import suppliers job failed', {
        jobId: job.id,
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    maxStalledCount: 1,
    stalledInterval: 30000,
  }
)

// Import accounts processor
export const importAccountsProcessor = new Worker<ImportAccountsJobData>(
  QUEUE_NAMES.IMPORT_ACCOUNTS,
  async (job: Job<ImportAccountsJobData>) => {
    const { integrationId, tenantId, syncJobId } = job.data
    
    log.info('Processing import accounts job', {
      jobId: job.id,
      integrationId,
      tenantId,
      syncJobId,
    })

    try {
      // TODO: Get ImportAccountsUseCase from DI container
      // const importAccountsUseCase = getImportAccountsUseCase()
      
      await job.updateProgress(25)
      
      // Placeholder for now
      log.warn('ImportAccountsUseCase not yet integrated with DI container')
      
      await job.updateProgress(100)
      
      return {
        totalFetched: 0,
        created: 0,
        updated: 0,
        errors: 0,
        message: 'Accounts import processor not yet implemented',
      }
    } catch (error) {
      log.error('Import accounts job failed', {
        jobId: job.id,
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    maxStalledCount: 1,
    stalledInterval: 30000,
  }
)

// Import invoices processor
export const importInvoicesProcessor = new Worker<ImportInvoicesJobData>(
  QUEUE_NAMES.IMPORT_INVOICES,
  async (job: Job<ImportInvoicesJobData>) => {
    const { integrationId, tenantId, syncJobId } = job.data
    
    log.info('Processing import invoices job', {
      jobId: job.id,
      integrationId,
      tenantId,
      syncJobId,
    })

    try {
      // TODO: Get ImportInvoicesUseCase from DI container
      // const importInvoicesUseCase = getImportInvoicesUseCase()
      
      await job.updateProgress(25)
      
      // Placeholder for now
      log.warn('ImportInvoicesUseCase not yet integrated with DI container')
      
      await job.updateProgress(100)
      
      return {
        totalFetched: 0,
        created: 0,
        updated: 0,
        errors: 0,
        message: 'Invoices import processor not yet implemented',
      }
    } catch (error) {
      log.error('Import invoices job failed', {
        jobId: job.id,
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    maxStalledCount: 1,
    stalledInterval: 30000,
  }
)

// Import manual journals processor
export const importManualJournalsProcessor = new Worker<ImportManualJournalsJobData>(
  QUEUE_NAMES.IMPORT_MANUAL_JOURNALS,
  async (job: Job<ImportManualJournalsJobData>) => {
    const { integrationId, tenantId, syncJobId } = job.data
    
    log.info('Processing import manual journals job', {
      jobId: job.id,
      integrationId,
      tenantId,
      syncJobId,
    })

    try {
      // TODO: Get ImportManualJournalsUseCase from DI container
      // const importManualJournalsUseCase = getImportManualJournalsUseCase()
      
      await job.updateProgress(25)
      
      // Placeholder for now
      log.warn('ImportManualJournalsUseCase not yet integrated with DI container')
      
      await job.updateProgress(100)
      
      return {
        totalFetched: 0,
        created: 0,
        updated: 0,
        errors: 0,
        message: 'Manual journals import processor not yet implemented',
      }
    } catch (error) {
      log.error('Import manual journals job failed', {
        jobId: job.id,
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    maxStalledCount: 1,
    stalledInterval: 30000,
  }
)

// Import bank statements processor
export const importBankStatementsProcessor = new Worker<ImportBankStatementsJobData>(
  QUEUE_NAMES.IMPORT_BANK_STATEMENTS,
  async (job: Job<ImportBankStatementsJobData>) => {
    const { integrationId, tenantId, syncJobId } = job.data
    
    log.info('Processing import bank statements job', {
      jobId: job.id,
      integrationId,
      tenantId,
      syncJobId,
    })

    try {
      // TODO: Get ImportBankStatementsUseCase from DI container
      // const importBankStatementsUseCase = getImportBankStatementsUseCase()
      
      await job.updateProgress(25)
      
      // Placeholder for now
      log.warn('ImportBankStatementsUseCase not yet integrated with DI container')
      
      await job.updateProgress(100)
      
      return {
        totalFetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        message: 'Bank statements import processor not yet implemented',
      }
    } catch (error) {
      log.error('Import bank statements job failed', {
        jobId: job.id,
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    maxStalledCount: 1,
    stalledInterval: 30000,
  }
)

// Graceful shutdown
export async function stopSyncProcessors(): Promise<void> {
  log.info('Stopping sync processors...')
  
  await Promise.all([
    syncIntegrationProcessor.close(),
    importTransactionsProcessor.close(),
    importSuppliersProcessor.close(),
    importAccountsProcessor.close(),
    importInvoicesProcessor.close(),
    importManualJournalsProcessor.close(),
    importBankStatementsProcessor.close(),
  ])
  
  log.info('Sync processors stopped')
}