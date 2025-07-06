import type { SyncJobRepository } from '../core/ports/sync-job.repository'
import type { IntegrationRepository } from '../core/ports/integration.repository'
import type { SyncJobEntity, SyncJobType, SyncJobResult } from '../core/domain/sync-job'
import { SyncJobEntity as SyncJobEntityClass } from '../core/domain/sync-job'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'
import { container, TOKENS } from '../shared/utils/container'
import { conversationQueue } from '../jobs/queues'

export interface TriggerSyncOptions {
  syncType?: SyncJobType
  priority?: number
  metadata?: Record<string, unknown>
  forceFullSync?: boolean
}

export interface SyncJobFilters {
  status?: string[]
  startDate?: Date
  endDate?: Date
  syncType?: SyncJobType
}

export interface SyncStatistics {
  totalJobs: number
  pendingJobs: number
  runningJobs: number
  completedJobs: number
  failedJobs: number
  cancelledJobs: number
  averageDuration: number
  successRate: number
}

export interface TransactionImportSummary {
  totalImported: number
  totalUpdated: number
  totalSkipped: number
  totalErrors: number
  periodStart: Date
  periodEnd: Date
  byMonth: Record<string, {
    imported: number
    updated: number
    skipped: number
    errors: number
  }>
}

export class SyncService {
  constructor() {}

  async triggerSync(
    integrationId: string,
    tenantId: string,
    userId: string,
    syncType: string = 'incremental',
    options: TriggerSyncOptions = {}
  ): Promise<SyncJobEntity> {
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    // Validate integration exists and is active
    const integration = await integrationRepository.findById(EntityId.from(integrationId))
    if (!integration) {
      throw new Error(`Integration with id ${integrationId} not found`)
    }
    
    if (!integration.isActive()) {
      throw new Error(`Integration ${integrationId} is not active`)
    }
    
    if (!integration.hasValidAuth()) {
      throw new Error(`Integration ${integrationId} does not have valid authentication`)
    }
    
    // Check if there's already a running job for this integration
    const runningJobs = await syncJobRepository.findRunningJobs()
    const hasRunningJob = runningJobs.some(job => job.integrationId === integrationId)
    if (hasRunningJob) {
      throw new Error(`A sync job is already running for integration ${integrationId}`)
    }
    
    // Determine sync type
    const jobType: SyncJobType = options.forceFullSync ? 'full' : 
      (syncType === 'full' ? 'full' : 
       syncType === 'manual' ? 'manual' : 
       syncType === 'webhook' ? 'webhook' : 'incremental')
    
    // Create sync job
    const syncJob = SyncJobEntityClass.create({
      integrationId,
      tenantId,
      jobType,
      priority: options.priority || 5,
      metadata: {
        ...options.metadata,
        triggeredBy: userId,
        integrationProvider: integration.provider
      }
    })
    
    // Save job to database
    const savedJob = await syncJobRepository.save(syncJob)
    
    // Queue the job for processing
    await conversationQueue.add('process_sync_job', {
      syncJobId: savedJob.id,
      integrationId,
      tenantId,
      jobType,
      metadata: savedJob.metadata
    }, {
      priority: savedJob.priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    })
    
    return savedJob
  }

  async getSyncJobs(
    tenantId: string,
    filters: SyncJobFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ jobs: SyncJobEntity[]; total: number }> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    // Get all jobs for tenant
    const allJobs = await syncJobRepository.findByTenantId(tenantId)
    
    // Apply filters
    let filteredJobs = allJobs
    
    if (filters.status && filters.status.length > 0) {
      filteredJobs = filteredJobs.filter(job => filters.status!.includes(job.status))
    }
    
    if (filters.syncType) {
      filteredJobs = filteredJobs.filter(job => job.jobType === filters.syncType)
    }
    
    if (filters.startDate) {
      filteredJobs = filteredJobs.filter(job => 
        job.createdAt >= filters.startDate!
      )
    }
    
    if (filters.endDate) {
      filteredJobs = filteredJobs.filter(job => 
        job.createdAt <= filters.endDate!
      )
    }
    
    // Sort by created date descending
    filteredJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    // Apply pagination
    const paginatedJobs = filteredJobs.slice(offset, offset + limit)
    
    return {
      jobs: paginatedJobs,
      total: filteredJobs.length
    }
  }

  async getSyncJobById(syncJobId: string, tenantId: string): Promise<SyncJobEntity | null> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    const job = await syncJobRepository.findById(syncJobId)
    
    // Verify job belongs to tenant
    if (job && job.tenantId !== tenantId) {
      return null
    }
    
    return job
  }

  async getIntegrationSyncJobs(
    integrationId: string,
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ jobs: SyncJobEntity[]; total: number }> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    
    // Verify integration belongs to tenant
    const integration = await integrationRepository.findById(EntityId.from(integrationId))
    if (!integration || integration.tenantId !== tenantId) {
      throw new Error(`Integration ${integrationId} not found or does not belong to tenant`)
    }
    
    const jobs = await syncJobRepository.findByIntegrationId(integrationId, limit, offset)
    const total = await syncJobRepository.countByIntegrationId(integrationId)
    
    return { jobs, total }
  }

  async cancelSyncJob(syncJobId: string, tenantId: string, userId: string): Promise<SyncJobEntity> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    const job = await syncJobRepository.findById(syncJobId)
    if (!job) {
      throw new Error(`Sync job ${syncJobId} not found`)
    }
    
    if (job.tenantId !== tenantId) {
      throw new Error(`Sync job ${syncJobId} does not belong to tenant`)
    }
    
    if (job.isFinished()) {
      throw new Error(`Cannot cancel finished job ${syncJobId}`)
    }
    
    // Cancel the job
    job.cancel()
    job.updateMetadata({
      cancelledBy: userId,
      cancelledAt: new Date().toISOString()
    })
    
    return syncJobRepository.save(job)
  }

  async retrySyncJob(syncJobId: string, tenantId: string, userId: string): Promise<SyncJobEntity> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    
    const job = await syncJobRepository.findById(syncJobId)
    if (!job) {
      throw new Error(`Sync job ${syncJobId} not found`)
    }
    
    if (job.tenantId !== tenantId) {
      throw new Error(`Sync job ${syncJobId} does not belong to tenant`)
    }
    
    if (!job.isFailed() && !job.isCancelled()) {
      throw new Error(`Can only retry failed or cancelled jobs`)
    }
    
    // Verify integration is still active
    const integration = await integrationRepository.findById(EntityId.from(job.integrationId))
    if (!integration || !integration.isActive()) {
      throw new Error(`Integration ${job.integrationId} is not active`)
    }
    
    // Restart the job
    job.restart()
    job.updateMetadata({
      retriedBy: userId,
      retriedAt: new Date().toISOString(),
      previousError: job.error
    })
    
    const savedJob = await syncJobRepository.save(job)
    
    // Re-queue the job for processing
    await conversationQueue.add('process_sync_job', {
      syncJobId: savedJob.id,
      integrationId: job.integrationId,
      tenantId: job.tenantId,
      jobType: job.jobType,
      metadata: savedJob.metadata
    }, {
      priority: savedJob.priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    })
    
    return savedJob
  }

  async getSyncStatistics(tenantId: string): Promise<SyncStatistics> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    const allJobs = await syncJobRepository.findByTenantId(tenantId)
    
    const stats = {
      totalJobs: allJobs.length,
      pendingJobs: 0,
      runningJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      totalDuration: 0,
      successfulJobs: 0
    }
    
    for (const job of allJobs) {
      switch (job.status) {
        case 'pending':
          stats.pendingJobs++
          break
        case 'running':
          stats.runningJobs++
          break
        case 'completed':
          stats.completedJobs++
          stats.successfulJobs++
          break
        case 'failed':
          stats.failedJobs++
          break
        case 'cancelled':
          stats.cancelledJobs++
          break
      }
      
      const duration = job.getDuration()
      if (duration) {
        stats.totalDuration += duration
      }
    }
    
    const finishedJobs = stats.completedJobs + stats.failedJobs + stats.cancelledJobs
    const averageDuration = finishedJobs > 0 ? Math.round(stats.totalDuration / finishedJobs) : 0
    const successRate = stats.totalJobs > 0 ? Math.round((stats.successfulJobs / stats.totalJobs) * 100) : 100
    
    return {
      totalJobs: stats.totalJobs,
      pendingJobs: stats.pendingJobs,
      runningJobs: stats.runningJobs,
      completedJobs: stats.completedJobs,
      failedJobs: stats.failedJobs,
      cancelledJobs: stats.cancelledJobs,
      averageDuration,
      successRate
    }
  }

  async getTransactionImportSummary(
    integrationId: string,
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TransactionImportSummary> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    
    // Verify integration belongs to tenant
    const integration = await integrationRepository.findById(EntityId.from(integrationId))
    if (!integration || integration.tenantId !== tenantId) {
      throw new Error(`Integration ${integrationId} not found or does not belong to tenant`)
    }
    
    const jobs = await syncJobRepository.findByIntegrationId(integrationId)
    
    // Filter by date range
    let filteredJobs = jobs.filter(job => job.isCompleted() && job.result)
    
    if (dateFrom) {
      filteredJobs = filteredJobs.filter(job => job.completedAt! >= dateFrom)
    }
    
    if (dateTo) {
      filteredJobs = filteredJobs.filter(job => job.completedAt! <= dateTo)
    }
    
    // Calculate summary
    const summary: TransactionImportSummary = {
      totalImported: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      periodStart: dateFrom || (filteredJobs.length > 0 ? filteredJobs[filteredJobs.length - 1].completedAt! : new Date()),
      periodEnd: dateTo || (filteredJobs.length > 0 ? filteredJobs[0].completedAt! : new Date()),
      byMonth: {}
    }
    
    for (const job of filteredJobs) {
      const result = job.result!
      summary.totalImported += result.transactionsImported
      summary.totalUpdated += result.transactionsUpdated
      summary.totalSkipped += result.transactionsSkipped
      summary.totalErrors += result.errors.length
      
      // Group by month
      const monthKey = job.completedAt!.toISOString().substring(0, 7) // YYYY-MM
      if (!summary.byMonth[monthKey]) {
        summary.byMonth[monthKey] = {
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 0
        }
      }
      
      summary.byMonth[monthKey].imported += result.transactionsImported
      summary.byMonth[monthKey].updated += result.transactionsUpdated
      summary.byMonth[monthKey].skipped += result.transactionsSkipped
      summary.byMonth[monthKey].errors += result.errors.length
    }
    
    return summary
  }

  async updateSyncJobProgress(syncJobId: string, progress: number): Promise<void> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    const job = await syncJobRepository.findById(syncJobId)
    if (!job) {
      throw new Error(`Sync job ${syncJobId} not found`)
    }
    
    job.updateProgress(progress)
    await syncJobRepository.save(job)
  }

  async completeSyncJob(syncJobId: string, result: SyncJobResult): Promise<void> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    const job = await syncJobRepository.findById(syncJobId)
    if (!job) {
      throw new Error(`Sync job ${syncJobId} not found`)
    }
    
    job.complete(result)
    await syncJobRepository.save(job)
  }

  async failSyncJob(syncJobId: string, error: string): Promise<void> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    
    const job = await syncJobRepository.findById(syncJobId)
    if (!job) {
      throw new Error(`Sync job ${syncJobId} not found`)
    }
    
    job.fail(error)
    await syncJobRepository.save(job)
  }

  // Legacy methods for backward compatibility
  async startSync(integrationId: string, options: any = {}): Promise<any> {
    const syncJob = await this.triggerSync(
      integrationId,
      options.tenantId || 'unknown',
      options.userId || 'system',
      options.syncType || 'incremental',
      options
    )
    
    return {
      id: syncJob.id,
      integrationId: syncJob.integrationId,
      status: syncJob.status,
      startedAt: syncJob.startedAt,
      ...options
    }
  }

  async getSyncHistory(integrationId: string): Promise<any[]> {
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    const jobs = await syncJobRepository.findByIntegrationId(integrationId, 50, 0)
    
    return jobs.map(job => ({
      id: job.id,
      integrationId: job.integrationId,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result,
      error: job.error
    }))
  }
}