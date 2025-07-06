import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { container, TOKENS } from '../shared/utils/container'
import type { SyncApplicationService } from '../core/application/sync.application-service'

// Input validation schemas
const triggerSyncSchema = z.object({
  integrationId: z.string().uuid(),
  syncType: z.enum(['full', 'incremental', 'manual', 'webhook']).default('manual'),
  priority: z.number().min(0).max(10).optional(),
  accountIds: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

const getSyncJobsSchema = z.object({
  status: z.array(z.string()).optional(),
  jobType: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

const syncJobIdSchema = z.object({
  syncJobId: z.string().uuid(),
})

const integrationSyncJobsSchema = z.object({
  integrationId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

const transactionSummarySchema = z.object({
  integrationId: z.string().uuid(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

export const syncRouter = router({
  // Trigger a sync job
  triggerSync: tenantProcedure
    .input(triggerSyncSchema)
    .mutation(async ({ input, ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      const command: any = {
        integrationId: input.integrationId,
        tenantId: ctx.tenantContext.tenantId,
        userId: ctx.user?.id || '',
        syncType: input.syncType,
      }
      if (input.priority !== undefined) command.priority = input.priority
      if (input.accountIds !== undefined) command.accountIds = input.accountIds
      if (input.dateFrom) command.dateFrom = new Date(input.dateFrom)
      if (input.dateTo) command.dateTo = new Date(input.dateTo)
      
      return await syncAppService.triggerSync(command, ctx.tenantContext.membership)
    }),

  // Get sync jobs for the tenant
  getSyncJobs: tenantProcedure
    .input(getSyncJobsSchema)
    .query(async ({ input, ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      const query: any = {
        tenantId: ctx.tenantContext.tenantId,
        limit: input.limit,
        offset: input.offset,
      }
      if (input.status !== undefined) query.status = input.status
      if (input.jobType !== undefined) query.jobType = input.jobType
      if (input.dateFrom) query.dateFrom = new Date(input.dateFrom)
      if (input.dateTo) query.dateTo = new Date(input.dateTo)
      
      return await syncAppService.getSyncJobs(query, ctx.tenantContext.membership)
    }),

  // Get specific sync job
  getSyncJob: tenantProcedure
    .input(syncJobIdSchema)
    .query(async ({ input, ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      return await syncAppService.getSyncJob(
        input.syncJobId,
        ctx.tenantContext.tenantId,
        ctx.tenantContext.membership
      )
    }),

  // Get sync jobs for a specific integration
  getIntegrationSyncJobs: tenantProcedure
    .input(integrationSyncJobsSchema)
    .query(async ({ input, ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      return await syncAppService.getIntegrationSyncJobs({
        integrationId: input.integrationId,
        tenantId: ctx.tenantContext.tenantId,
        limit: input.limit,
        offset: input.offset,
      }, ctx.tenantContext.membership)
    }),

  // Cancel a sync job
  cancelSyncJob: tenantProcedure
    .input(syncJobIdSchema)
    .mutation(async ({ input, ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      return await syncAppService.cancelSyncJob({
        syncJobId: input.syncJobId,
        tenantId: ctx.tenantContext.tenantId,
        userId: ctx.user?.id || '',
      }, ctx.tenantContext.membership)
    }),

  // Retry a failed sync job
  retrySyncJob: tenantProcedure
    .input(syncJobIdSchema)
    .mutation(async ({ input, ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      return await syncAppService.retrySyncJob({
        syncJobId: input.syncJobId,
        tenantId: ctx.tenantContext.tenantId,
        userId: ctx.user?.id || '',
      }, ctx.tenantContext.membership)
    }),

  // Get sync statistics for the tenant
  getSyncStatistics: tenantProcedure
    .query(async ({ ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      return await syncAppService.getSyncStatistics(
        ctx.tenantContext.tenantId,
        ctx.tenantContext.membership
      )
    }),

  // Get transaction import summary for an integration
  getTransactionSummary: tenantProcedure
    .input(transactionSummarySchema)
    .query(async ({ input, ctx }) => {
      const syncAppService = container.resolve<SyncApplicationService>(TOKENS.SYNC_APPLICATION_SERVICE)
      
      const query: any = {
        integrationId: input.integrationId,
        tenantId: ctx.tenantContext.tenantId,
      }
      if (input.dateFrom) query.dateFrom = new Date(input.dateFrom)
      if (input.dateTo) query.dateTo = new Date(input.dateTo)
      
      return await syncAppService.getTransactionSummary(query, ctx.tenantContext.membership)
    }),
})