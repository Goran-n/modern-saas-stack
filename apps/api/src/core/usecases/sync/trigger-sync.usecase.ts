import { SyncJobEntity, type SyncJobType } from '../../domain/sync-job/index'
import { IntegrationEntity } from '../../domain/integration/index'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/index'
import type { 
  IntegrationRepository, 
  SyncJobRepository, 
  TenantMemberRepository 
} from '../../ports/index'
import { addSyncJob } from '../../../jobs/queue.config'
import log from '../../../config/logger'

export interface TriggerSyncInput {
  integrationId: string
  tenantId: string
  userId: string
  syncType: SyncJobType
  priority?: number
  metadata?: Record<string, unknown>
}

export interface TriggerSyncOutput {
  syncJob: SyncJobEntity
  jobId: string
}

export class TriggerSyncUseCase {
  constructor(
    private integrationRepository: IntegrationRepository,
    private syncJobRepository: SyncJobRepository,
    private tenantMemberRepository: TenantMemberRepository
  ) {}

  async execute(input: TriggerSyncInput): Promise<TriggerSyncOutput> {
    // Validate permissions
    await this.validatePermissions(input)

    // Validate integration
    const integration = await this.validateIntegration(input.integrationId, input.tenantId)

    // Check for existing running jobs
    await this.checkExistingJobs(input.integrationId)

    // Create sync job entity
    const syncJob = SyncJobEntity.create({
      integrationId: input.integrationId,
      tenantId: input.tenantId,
      jobType: input.syncType,
      priority: input.priority || 0,
      metadata: {
        ...input.metadata,
        triggeredBy: input.userId,
        provider: integration.provider,
      },
    })

    // Save sync job to database
    const savedSyncJob = await this.syncJobRepository.save(syncJob)

    // Add job to queue
    const jobOptions: any = {
      metadata: {
        syncJobId: savedSyncJob.id,
        ...input.metadata,
      },
    }
    if (input.priority !== undefined) {
      jobOptions.priority = input.priority
    }
    
    const job = await addSyncJob(
      input.integrationId,
      input.tenantId,
      input.syncType,
      jobOptions
    )

    log.info('Sync job triggered', {
      syncJobId: savedSyncJob.id,
      integrationId: input.integrationId,
      tenantId: input.tenantId,
      syncType: input.syncType,
      queueJobId: job.id,
    })

    return {
      syncJob: savedSyncJob,
      jobId: job.id || '',
    }
  }

  private async validatePermissions(input: TriggerSyncInput): Promise<void> {
    const membership = await this.tenantMemberRepository.findByUserAndTenant(
      input.userId,
      input.tenantId
    )

    if (!membership || !membership.isActive()) {
      throw new BusinessRuleError(
        'USER_NOT_MEMBER',
        'User must be an active member of the tenant'
      )
    }

    // Check if user has appropriate role for sync operations
    // For now, allow owners and admins to trigger syncs
    if (!membership.hasRoleOrHigher('admin')) {
      throw new BusinessRuleError(
        'INSUFFICIENT_PERMISSIONS',
        'User does not have permission to trigger sync operations'
      )
    }
  }

  private async validateIntegration(
    integrationId: string,
    tenantId: string
  ): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findById(integrationId)

    if (!integration) {
      throw new NotFoundError('Integration', integrationId)
    }

    if (integration.tenantId !== tenantId) {
      throw new BusinessRuleError(
        'INTEGRATION_NOT_FOUND',
        'Integration not found for this tenant'
      )
    }

    if (!integration.isActive()) {
      throw new BusinessRuleError(
        'INTEGRATION_NOT_ACTIVE',
        'Integration must be active to trigger sync'
      )
    }

    if (!integration.hasValidAuth()) {
      throw new BusinessRuleError(
        'INTEGRATION_INVALID_AUTH',
        'Integration has invalid authentication credentials'
      )
    }

    return integration
  }

  private async checkExistingJobs(integrationId: string): Promise<void> {
    const runningJobs = await this.syncJobRepository.findRunningJobs()
    const existingJob = runningJobs.find(job => job.integrationId === integrationId)

    if (existingJob) {
      throw new BusinessRuleError(
        'SYNC_ALREADY_RUNNING',
        `Sync job ${existingJob.id} is already running for this integration`
      )
    }
  }
}