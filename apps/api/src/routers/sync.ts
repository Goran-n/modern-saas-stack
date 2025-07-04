import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { getSyncService } from '../lib/di/services'
import { TenantMemberService } from '../services/tenant-member.service'

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
      const memberService = new TenantMemberService()
      
      // Check permissions - use same permission as integration management
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'manageCredentials'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to trigger sync')
      }

      const syncService = await getSyncService()
      
      const options: any = {}
      if (input.priority !== undefined) options.priority = input.priority
      if (input.accountIds !== undefined) options.accountIds = input.accountIds
      if (input.dateFrom !== undefined) options.dateFrom = new Date(input.dateFrom)
      if (input.dateTo !== undefined) options.dateTo = new Date(input.dateTo)

      return await syncService.triggerSync(
        input.integrationId,
        ctx.tenantContext.tenantId,
        ctx.user?.id || '',
        input.syncType,
        options
      )
    }),

  // Get sync jobs for the tenant
  getSyncJobs: tenantProcedure
    .input(getSyncJobsSchema)
    .query(async ({ input, ctx }) => {
      const memberService = new TenantMemberService()
      
      // Check permissions
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'view'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view sync jobs')
      }

      const syncService = await getSyncService()
      
      const filters: any = {}
      if (input.status !== undefined) filters.status = input.status
      if (input.jobType !== undefined) filters.jobType = input.jobType
      if (input.dateFrom !== undefined) filters.dateFrom = new Date(input.dateFrom)
      if (input.dateTo !== undefined) filters.dateTo = new Date(input.dateTo)

      return await syncService.getSyncJobs(
        ctx.tenantContext.tenantId,
        filters,
        input.limit,
        input.offset
      )
    }),

  // Get specific sync job
  getSyncJob: tenantProcedure
    .input(syncJobIdSchema)
    .query(async ({ input, ctx }) => {
      const memberService = new TenantMemberService()
      
      // Check permissions
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'view'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view sync jobs')
      }

      const syncService = await getSyncService()
      
      return await syncService.getSyncJobById(
        input.syncJobId,
        ctx.tenantContext.tenantId
      )
    }),

  // Get sync jobs for a specific integration
  getIntegrationSyncJobs: tenantProcedure
    .input(integrationSyncJobsSchema)
    .query(async ({ input, ctx }) => {
      const memberService = new TenantMemberService()
      
      // Check permissions
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'view'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view sync jobs')
      }

      const syncService = await getSyncService()
      
      return await syncService.getIntegrationSyncJobs(
        input.integrationId,
        ctx.tenantContext.tenantId,
        input.limit,
        input.offset
      )
    }),

  // Cancel a sync job
  cancelSyncJob: tenantProcedure
    .input(syncJobIdSchema)
    .mutation(async ({ input, ctx }) => {
      const memberService = new TenantMemberService()
      
      // Check permissions - use same permission as integration management
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'manageCredentials'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to cancel sync jobs')
      }

      const syncService = await getSyncService()
      
      return await syncService.cancelSyncJob(
        input.syncJobId,
        ctx.tenantContext.tenantId,
        ctx.user?.id || ''
      )
    }),

  // Retry a failed sync job
  retrySyncJob: tenantProcedure
    .input(syncJobIdSchema)
    .mutation(async ({ input, ctx }) => {
      const memberService = new TenantMemberService()
      
      // Check permissions - use same permission as integration management  
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'manageCredentials'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to retry sync jobs')
      }

      const syncService = await getSyncService()
      
      return await syncService.retrySyncJob(
        input.syncJobId,
        ctx.tenantContext.tenantId,
        ctx.user?.id || ''
      )
    }),

  // Get sync statistics for the tenant
  getSyncStatistics: tenantProcedure
    .query(async ({ ctx }) => {
      const memberService = new TenantMemberService()
      
      // Check permissions
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'view'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view sync statistics')
      }

      const syncService = await getSyncService()
      
      return await syncService.getSyncStatistics(ctx.tenantContext.tenantId)
    }),

  // Get transaction import summary for an integration
  getTransactionSummary: tenantProcedure
    .input(transactionSummarySchema)
    .query(async ({ input, ctx }) => {
      const memberService = new TenantMemberService()
      
      // Check permissions
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'providers',
        'view'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view transaction summary')
      }

      const syncService = await getSyncService()
      
      return await syncService.getTransactionImportSummary(
        input.integrationId,
        ctx.tenantContext.tenantId,
        input.dateFrom ? new Date(input.dateFrom) : undefined,
        input.dateTo ? new Date(input.dateTo) : undefined
      )
    }),
})