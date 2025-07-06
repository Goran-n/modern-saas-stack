import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { getAccountService } from '../lib/di/services'
import { TRPCError } from '@trpc/server'

export const accountRouter = router({
  list: tenantProcedure
    .query(async ({ ctx }) => {
      try {
        const accountService = await getAccountService()
        const accounts = await accountService.listAccounts(ctx.tenantContext.tenantId)
        
        return {
          accounts,
          count: accounts.length
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve accounts',
          cause: error
        })
      }
    }),

  get: tenantProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .query(async ({ input }) => {
      try {
        const accountService = await getAccountService()
        const account = await accountService.getAccount(input.id)
        
        if (!account) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Account not found'
          })
        }
        
        return account
      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve account',
          cause: error
        })
      }
    }),

  listBankAccounts: tenantProcedure
    .query(async ({ ctx }) => {
      try {
        const accountService = await getAccountService()
        const accounts = await accountService.getBankAccounts(ctx.tenantContext.tenantId)
        
        return {
          accounts,
          count: accounts.length
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve bank accounts',
          cause: error
        })
      }
    })
})