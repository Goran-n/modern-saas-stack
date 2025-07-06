import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { getTransactionService } from '../lib/di/services'
import { TRPCError } from '@trpc/server'

export const transactionRouter = router({
  listByAccount: tenantProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      limit: z.number().min(1).max(200).default(100),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      try {
        const transactionService = await getTransactionService()
        const result = await transactionService.listByAccount(
          input.accountId,
          {
            limit: input.limit,
            offset: input.offset
          }
        )
        
        return {
          transactions: result.data,
          count: result.total
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve transactions',
          cause: error
        })
      }
    }),

  get: tenantProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const transactionService = await getTransactionService()
        const transaction = await transactionService.findById(input.id)
        
        if (!transaction) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Transaction not found'
          })
        }
        
        // Verify tenant access
        if (transaction.tenantId !== ctx.tenantContext.tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          })
        }
        
        return transaction
      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve transaction',
          cause: error
        })
      }
    })
})