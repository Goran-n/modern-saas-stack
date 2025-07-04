import { 
  SyncJobEntity, 
  type SyncJobType
} from '../core/domain/index'
import { 
  TriggerSyncUseCase
} from '../core/usecases/sync/index'
import type { 
  SyncJobRepository,
  TransactionRepository,
  IntegrationRepository,
  TenantMemberRepository 
} from '../core/ports/index'
import { getQueueStats } from '../jobs/queue.config'
import { NotFoundError, BusinessRuleError } from '../shared/errors/index'
import type { Logger } from 'pino'

export interface SyncFilters {
  status?: string[]
  jobType?: string[]
  dateFrom?: Date
  dateTo?: Date
}

export class SyncService {
  constructor(
    private syncJobRepository: SyncJobRepository,
    private transactionRepository: TransactionRepository,
    private integrationRepository: IntegrationRepository,
    private tenantMemberRepository: TenantMemberRepository,
    private logger: Logger
  ) {}

  async triggerSync(
    integrationId: string,
    tenantId: string,
    userId: string,
    syncType: SyncJobType = 'manual',
    options?: {
      priority?: number
      accountIds?: string[]
      dateFrom?: Date
      dateTo?: Date
    }
  ): Promise<{ syncJob: SyncJobEntity; jobId: string }> {
    const triggerSyncUseCase = new TriggerSyncUseCase(
      this.integrationRepository,
      this.syncJobRepository,
      this.tenantMemberRepository
    )

    return await triggerSyncUseCase.execute({
      integrationId,
      tenantId,
      userId,
      syncType,
      priority: options?.priority ?? 5,
      metadata: {
        accountIds: options?.accountIds,
        dateFrom: options?.dateFrom?.toISOString(),
        dateTo: options?.dateTo?.toISOString(),
      },
    })
  }

  async getSyncJobs(
    tenantId: string,
    _filters?: SyncFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<SyncJobEntity[]> {
    // For now, just get by tenant ID
    // TODO: Implement filtering in repository
    return await this.syncJobRepository.findByTenantId(tenantId, limit, offset)
  }

  async getSyncJobById(
    syncJobId: string,
    tenantId: string
  ): Promise<SyncJobEntity> {
    const syncJob = await this.syncJobRepository.findById(syncJobId)
    
    if (!syncJob) {
      throw new NotFoundError('SyncJob', syncJobId)
    }
    
    if (syncJob.tenantId !== tenantId) {
      throw new BusinessRuleError(
        'SYNC_JOB_NOT_FOUND',
        'Sync job not found for this tenant'
      )
    }
    
    return syncJob
  }

  async getIntegrationSyncJobs(
    integrationId: string,
    tenantId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SyncJobEntity[]> {
    // Verify integration belongs to tenant
    const integration = await this.integrationRepository.findById(integrationId)
    if (!integration || integration.tenantId !== tenantId) {
      throw new NotFoundError('Integration', integrationId)
    }

    return await this.syncJobRepository.findByIntegrationId(integrationId, limit, offset)
  }

  async cancelSyncJob(
    syncJobId: string,
    tenantId: string,
    userId: string
  ): Promise<SyncJobEntity> {
    const syncJob = await this.getSyncJobById(syncJobId, tenantId)
    
    if (syncJob.isFinished()) {
      throw new BusinessRuleError(
        'SYNC_JOB_ALREADY_FINISHED',
        'Cannot cancel a finished sync job'
      )
    }
    
    syncJob.cancel()
    const updatedSyncJob = await this.syncJobRepository.save(syncJob)
    
    this.logger.info('Sync job cancelled', {
      syncJobId,
      tenantId,
      userId,
    })
    
    return updatedSyncJob
  }

  async retrySyncJob(
    syncJobId: string,
    tenantId: string,
    userId: string
  ): Promise<{ syncJob: SyncJobEntity; jobId: string }> {
    const originalSyncJob = await this.getSyncJobById(syncJobId, tenantId)
    
    if (!originalSyncJob.isFailed()) {
      throw new BusinessRuleError(
        'SYNC_JOB_NOT_FAILED',
        'Can only retry failed sync jobs'
      )
    }
    
    // Create new sync job with same parameters
    return await this.triggerSync(
      originalSyncJob.integrationId,
      tenantId,
      userId,
      originalSyncJob.jobType,
      {
        priority: originalSyncJob.priority,
      }
    )
  }

  async getSyncStatistics(tenantId: string): Promise<{
    totalJobs: number
    pendingJobs: number
    runningJobs: number
    completedJobs: number
    failedJobs: number
    recentActivity: SyncJobEntity[]
    queueStats: any
  }> {
    const recentJobs = await this.syncJobRepository.findByTenantId(tenantId, 10, 0)
    
    // Count jobs by status
    const totalJobs = recentJobs.length // This would be a proper count query in real implementation
    const pendingJobs = recentJobs.filter(job => job.isPending()).length
    const runningJobs = recentJobs.filter(job => job.isRunning()).length
    const completedJobs = recentJobs.filter(job => job.isCompleted()).length
    const failedJobs = recentJobs.filter(job => job.isFailed()).length
    
    // Get queue statistics
    const queueStats = await getQueueStats()
    
    return {
      totalJobs,
      pendingJobs,
      runningJobs,
      completedJobs,
      failedJobs,
      recentActivity: recentJobs.slice(0, 5),
      queueStats,
    }
  }

  async getTransactionImportSummary(
    integrationId: string,
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalTransactions: number
    reconciledCount: number
    pendingCount: number
    lastSyncAt: Date | null
    currencies: Record<string, number>
  }> {
    // Verify integration belongs to tenant
    const integration = await this.integrationRepository.findById(integrationId)
    if (!integration || integration.tenantId !== tenantId) {
      throw new NotFoundError('Integration', integrationId)
    }

    const summary = await this.transactionRepository.getTransactionSummary(
      tenantId,
      dateFrom,
      dateTo
    )

    return {
      ...summary,
      lastSyncAt: integration.lastSyncAt,
    }
  }

  async scheduleRegularSync(
    integrationId: string,
    tenantId: string,
    frequency: 'hourly' | 'daily' | 'weekly'
  ): Promise<void> {
    // Verify integration exists and is active
    const integration = await this.integrationRepository.findById(integrationId)
    if (!integration || integration.tenantId !== tenantId) {
      throw new NotFoundError('Integration', integrationId)
    }

    if (!integration.isActive()) {
      throw new BusinessRuleError(
        'INTEGRATION_NOT_ACTIVE',
        'Cannot schedule sync for inactive integration'
      )
    }

    // Calculate next sync time
    const now = new Date()
    let nextSync: Date
    
    switch (frequency) {
      case 'hourly':
        nextSync = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour
        break
      case 'daily':
        nextSync = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
        break
      case 'weekly':
        nextSync = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
        break
    }

    // Update integration settings and schedule
    integration.updateSettings({
      syncFrequency: frequency
    })
    integration.scheduleNextSync(nextSync)
    await this.integrationRepository.save(integration)

    this.logger.info('Regular sync scheduled', {
      integrationId,
      tenantId,
      frequency,
      nextSync: nextSync.toISOString(),
    })

    // TODO: Implement recurring job queue with BullMQ repeat functionality
    // For now, we've stored the schedule in the integration
  }
}