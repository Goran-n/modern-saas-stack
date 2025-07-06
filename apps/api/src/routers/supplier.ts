import { z } from 'zod'
import { router, tenantProcedure } from '../lib/trpc'
import { getSupplierService } from '../lib/di/services'
import { TRPCError } from '@trpc/server'

const supplierFiltersSchema = z.object({
  type: z.enum(['supplier', 'customer', 'employee', 'other']).optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(200).default(100),
  offset: z.number().min(0).default(0)
})

export const supplierRouter = router({
  list: tenantProcedure
    .input(supplierFiltersSchema)
    .query(async ({ ctx, input }) => {
      try {
        const supplierService = await getSupplierService()
        const filters: any = {}
        if (input.type !== undefined) filters.type = input.type
        if (input.search !== undefined) filters.search = input.search
        if (input.isActive !== undefined) filters.isActive = input.isActive
        
        const params: {
          tenantId: string
          limit?: number
          offset?: number
          type?: string
        } = {
          tenantId: ctx.tenantContext.tenantId,
          limit: input.limit,
          offset: input.offset
        }
        
        if (input.type) {
          params.type = input.type
        }
        
        const result = await supplierService.listSuppliers(params)
        
        return {
          suppliers: result.data,
          count: result.total
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve contacts',
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
        const supplierService = await getSupplierService()
        const supplier = await supplierService.getSupplier(
          input.id, 
          ctx.tenantContext.tenantId
        )
        
        if (!supplier) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contact not found'
          })
        }
        
        return supplier
      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve contact',
          cause: error
        })
      }
    }),

  listByType: tenantProcedure
    .input(z.object({
      type: z.enum(['supplier', 'customer', 'employee', 'other'])
    }))
    .query(async ({ ctx, input }) => {
      try {
        const supplierService = await getSupplierService()
        const suppliers = await supplierService.getSuppliersByType(
          input.type,
          ctx.tenantContext.tenantId
        )
        
        return {
          suppliers,
          count: suppliers.length
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve contacts by type',
          cause: error
        })
      }
    }),

  stats: tenantProcedure
    .query(async ({ ctx }) => {
      try {
        const supplierService = await getSupplierService()
        const stats = await supplierService.getSupplierStats(
          ctx.tenantContext.tenantId
        )
        
        return stats
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve contact statistics',
          cause: error
        })
      }
    })
})