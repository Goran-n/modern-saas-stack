import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { getBankFeedService } from '../lib/di/services'
import { TRPCError } from '@trpc/server'

export const bankFeedRouter = router({
  listByAccount: tenantProcedure
    .input(z.object({
      accountIdentifier: z.string(),
      limit: z.number().min(1).max(200).default(100),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const bankFeedService = await getBankFeedService()
        const statements = await bankFeedService.listByAccount(
          input.accountIdentifier,
          ctx.tenantContext.tenantId,
          input.limit,
          input.offset
        )
        
        return {
          statements,
          count: statements.length
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve bank statements',
          cause: error
        })
      }
    }),

  getUnreconciledCount: tenantProcedure
    .input(z.object({
      accountIdentifier: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const bankFeedService = await getBankFeedService()
        const count = await bankFeedService.getUnreconciledCount(
          input.accountIdentifier,
          ctx.tenantContext.tenantId
        )
        
        return { count }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get unreconciled count',
          cause: error
        })
      }
    }),

  getDateRange: tenantProcedure
    .input(z.object({
      accountIdentifier: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const bankFeedService = await getBankFeedService()
        const dateRange = await bankFeedService.getDateRange(
          input.accountIdentifier,
          ctx.tenantContext.tenantId
        )
        
        return dateRange
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get date range',
          cause: error
        })
      }
    })
})