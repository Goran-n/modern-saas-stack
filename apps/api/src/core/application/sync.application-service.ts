import type { Logger } from 'pino'
import type { SyncService } from '../../services/sync.service'
import type { TenantMemberService } from '../../services/tenant-member.service'

export interface TriggerSyncCommand {
  integrationId: string
  tenantId: string
  userId: string
  syncType: 'full' | 'incremental' | 'manual' | 'webhook'
  priority?: number
  accountIds?: string[]
  dateFrom?: Date
  dateTo?: Date
}

export interface GetSyncJobsQuery {
  tenantId: string
  status?: string[]
  jobType?: string[]
  dateFrom?: Date
  dateTo?: Date
  limit: number
  offset: number
}

export interface SyncJobCommand {
  syncJobId: string
  tenantId: string
  userId: string
}

export interface GetIntegrationSyncJobsQuery {
  integrationId: string
  tenantId: string
  limit: number
  offset: number
}

export interface GetTransactionSummaryQuery {
  integrationId: string
  tenantId: string
  dateFrom?: Date
  dateTo?: Date
}

/**
 * Application Service for Sync operations
 * Handles business logic, permissions, and orchestration
 */
export class SyncApplicationService {
  constructor(
    private readonly syncService: SyncService,
    private readonly tenantMemberService: TenantMemberService,
    private readonly logger: Logger
  ) {}

  /**
   * Trigger a sync job with proper permission checking
   */
  async triggerSync(command: TriggerSyncCommand, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'manageCredentials', 'trigger sync')

    this.logger.info('Triggering sync job', {
      integrationId: command.integrationId,
      tenantId: command.tenantId,
      userId: command.userId,
      syncType: command.syncType
    })

    const options: any = {}
    if (command.priority !== undefined) options.priority = command.priority
    if (command.accountIds !== undefined) options.accountIds = command.accountIds
    if (command.dateFrom !== undefined) options.dateFrom = command.dateFrom
    if (command.dateTo !== undefined) options.dateTo = command.dateTo

    return await this.syncService.triggerSync(
      command.integrationId,
      command.tenantId,
      command.userId,
      command.syncType,
      options
    )
  }

  /**
   * Get sync jobs with permission checking
   */
  async getSyncJobs(query: GetSyncJobsQuery, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'view', 'view sync jobs')

    const filters: any = {}
    if (query.status !== undefined) filters.status = query.status
    if (query.jobType !== undefined) filters.jobType = query.jobType
    if (query.dateFrom !== undefined) filters.dateFrom = query.dateFrom
    if (query.dateTo !== undefined) filters.dateTo = query.dateTo

    return await this.syncService.getSyncJobs(
      query.tenantId,
      filters,
      query.limit,
      query.offset
    )
  }

  /**
   * Get a specific sync job
   */
  async getSyncJob(syncJobId: string, tenantId: string, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'view', 'view sync jobs')

    return await this.syncService.getSyncJobById(syncJobId, tenantId)
  }

  /**
   * Get sync jobs for a specific integration
   */
  async getIntegrationSyncJobs(query: GetIntegrationSyncJobsQuery, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'view', 'view sync jobs')

    return await this.syncService.getIntegrationSyncJobs(
      query.integrationId,
      query.tenantId,
      query.limit,
      query.offset
    )
  }

  /**
   * Cancel a sync job
   */
  async cancelSyncJob(command: SyncJobCommand, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'manageCredentials', 'cancel sync jobs')

    this.logger.info('Cancelling sync job', {
      syncJobId: command.syncJobId,
      tenantId: command.tenantId,
      userId: command.userId
    })

    return await this.syncService.cancelSyncJob(
      command.syncJobId,
      command.tenantId,
      command.userId
    )
  }

  /**
   * Retry a failed sync job
   */
  async retrySyncJob(command: SyncJobCommand, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'manageCredentials', 'retry sync jobs')

    this.logger.info('Retrying sync job', {
      syncJobId: command.syncJobId,
      tenantId: command.tenantId,
      userId: command.userId
    })

    return await this.syncService.retrySyncJob(
      command.syncJobId,
      command.tenantId,
      command.userId
    )
  }

  /**
   * Get sync statistics for the tenant
   */
  async getSyncStatistics(tenantId: string, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'view', 'view sync statistics')

    return await this.syncService.getSyncStatistics(tenantId)
  }

  /**
   * Get transaction import summary
   */
  async getTransactionSummary(query: GetTransactionSummaryQuery, membership: any): Promise<any> {
    // Check permissions
    this.validatePermission(membership, 'providers', 'view', 'view transaction summary')

    return await this.syncService.getTransactionImportSummary(
      query.integrationId,
      query.tenantId,
      query.dateFrom,
      query.dateTo
    )
  }

  /**
   * Validate that the user has the required permission
   */
  private validatePermission(
    membership: any,
    module: string,
    permission: string,
    action: string
  ): void {
    const hasPermission = this.tenantMemberService.hasPermission(
      membership,
      module as any,
      permission as any
    )

    if (!hasPermission) {
      this.logger.warn('Permission denied', {
        userId: membership.userId,
        tenantId: membership.tenantId,
        module,
        permission,
        action
      })
      throw new Error(`Insufficient permissions to ${action}`)
    }
  }
}