import { Injectable, Inject } from '../lib/di/decorators'
import { SyncJobEntity } from '../core/domain/sync-job'
import type { IntegrationRepository } from '../core/ports/integration.repository'
import type { SyncJobRepository } from '../core/ports/sync-job.repository'
import type { Logger } from 'pino'
import { Queue } from 'bullmq'
import { getRedisClient } from '@kibly/shared-utils'

export interface SyncTriggerOptions {
  syncType: 'full' | 'incremental' | 'manual' | 'webhook'
  priority?: number
  accountIds?: string[]
  dateFrom?: Date
  dateTo?: Date
}

// Alias for backward compatibility
export type TriggerSyncOptions = SyncTriggerOptions

export interface SyncLogEntry {
  id: string
  integrationId: string
  type: string
  status: string
  progress: number
  startedAt: Date | undefined
  completedAt: Date | undefined
  results?: {
    imported?: number
    updated?: number
    skipped?: number
    errors?: number
    transactionsImported?: number
    transactionsUpdated?: number
    transactionsSkipped?: number
  }
  error: string | undefined
}

@Injectable('SyncManagementService', 'request')
export class SyncManagementService {
  private syncQueue: Queue | null = null

  constructor(
    @Inject('IntegrationRepository') private integrationRepository: IntegrationRepository,
    @Inject('SyncJobRepository') private syncJobRepository: SyncJobRepository,
    @Inject('Logger') private logger: Logger
  ) {
    this.initializeQueue()
  }

  private async initializeQueue(): Promise<void> {
    try {
      const redis = await getRedisClient()
      if (redis) {
        this.syncQueue = new Queue('sync-integration', {
          connection: redis,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            },
            removeOnComplete: true,
            removeOnFail: false
          }
        })
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize sync queue')
    }
  }

  async triggerSync(
    integrationId: string, 
    options: SyncTriggerOptions
  ): Promise<SyncJobEntity> {
    // Get integration to validate
    const integration = await this.integrationRepository.findById(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    if (integration.status !== 'active') {
      throw new Error('Integration is not active')
    }

    // Create sync job record
    const syncJob = SyncJobEntity.create({
      integrationId: integration.id,
      tenantId: integration.tenantId,
      jobType: options.syncType,
      priority: options.priority || 5,
      metadata: {
        accountIds: options.accountIds,
        dateFrom: options.dateFrom?.toISOString(),
        dateTo: options.dateTo?.toISOString()
      }
    })
    
    const savedJob = await this.syncJobRepository.save(syncJob)

    // Queue the job if queue is available
    if (this.syncQueue) {
      try {
        await this.syncQueue.add(
          'sync-integration',
          {
            syncJobId: syncJob.id,
            integrationId: integration.id,
            tenantId: integration.tenantId,
            ...options
          },
          {
            priority: options.priority || 5,
            delay: 0
          }
        )

        this.logger.info(
          { syncJobId: syncJob.id, integrationId, syncType: options.syncType },
          'Sync job queued successfully'
        )
      } catch (error) {
        // Update job status to failed if queuing fails
        syncJob.fail('Failed to queue sync job')
        await this.syncJobRepository.save(syncJob)
        throw error
      }
    } else {
      this.logger.warn({ syncJobId: syncJob.id }, 'Sync queue not available, job created but not queued')
    }

    return savedJob
  }

  async getSyncLogs(
    integrationId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ logs: SyncLogEntry[]; total: number }> {
    const jobs = await this.syncJobRepository.findByIntegrationId(integrationId, limit, offset)
    const total = await this.syncJobRepository.countByIntegrationId(integrationId)

    const logs: SyncLogEntry[] = jobs.map(job => {
      const logEntry: SyncLogEntry = {
        id: job.id,
        integrationId: job.integrationId,
        type: job.jobType,
        status: job.status,
        progress: job.progress,
        startedAt: job.startedAt || undefined,
        completedAt: job.completedAt || undefined,
        error: job.error || undefined
      }
      
      // Add results only if they exist
      if (job.result) {
        logEntry.results = {
          imported: job.result.transactionsImported,
          updated: job.result.transactionsUpdated,
          skipped: job.result.transactionsSkipped,
          errors: job.result.errors?.length || 0,
        }
      }
      
      return logEntry
    })

    return { logs, total }
  }

  async cancelSync(syncJobId: string): Promise<void> {
    const syncJob = await this.syncJobRepository.findById(syncJobId)
    if (!syncJob) {
      throw new Error('Sync job not found')
    }

    if (!syncJob.isPending() && !syncJob.isRunning()) {
      throw new Error('Can only cancel pending or running sync jobs')
    }

    // Update job status
    syncJob.cancel()
    await this.syncJobRepository.save(syncJob)

    // Remove from queue if possible
    if (this.syncQueue) {
      try {
        const job = await this.syncQueue.getJob(syncJobId)
        if (job && ['waiting', 'active', 'delayed'].includes(await job.getState())) {
          await job.remove()
        }
      } catch (error) {
        this.logger.warn({ error, syncJobId }, 'Failed to remove job from queue')
      }
    }

    this.logger.info({ syncJobId }, 'Sync job cancelled')
  }

  async getActiveSyncs(_tenantId: string): Promise<SyncJobEntity[]> {
    return this.syncJobRepository.findRunningJobs()
  }

  async updateSyncProgress(
    syncJobId: string, 
    progress: number, 
    _results?: Partial<SyncJobEntity['result']>
  ): Promise<void> {
    const job = await this.syncJobRepository.findById(syncJobId)
    if (job) {
      job.updateProgress(progress)
      await this.syncJobRepository.save(job)
    }
  }

  async completeSyncJob(
    syncJobId: string, 
    results: SyncJobEntity['result'], 
    error?: string
  ): Promise<void> {
    const syncJob = await this.syncJobRepository.findById(syncJobId)
    if (!syncJob) {
      throw new Error(`Sync job not found: ${syncJobId}`)
    }
    
    if (error) {
      syncJob.fail(error)
    } else if (results) {
      syncJob.complete(results)
    }
    
    await this.syncJobRepository.save(syncJob)

    // Update integration last sync time
    if (!error) {
      const integration = await this.integrationRepository.findById(syncJob.integrationId)
      if (integration) {
        integration.recordSuccessfulSync()
        await this.integrationRepository.save(integration)
      }
    }
  }
}