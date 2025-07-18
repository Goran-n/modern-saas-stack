import { z } from 'zod';
import { createTRPCRouter } from '../trpc';
import { tenantProcedure } from '../trpc/procedures';
import { SupplierQueries } from '@kibly/supplier';
import { getFilesBySupplier } from '@kibly/file-manager';

export const suppliersRouter = createTRPCRouter({
  list: tenantProcedure.query(async ({ ctx }) => {
    const queries = new SupplierQueries();
    return queries.list(ctx.tenantId);
  }),

  getFiles: tenantProcedure
    .input(
      z.object({
        supplierId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const queries = new SupplierQueries();
      
      // Verify supplier exists and belongs to tenant
      const supplier = await queries.getById(input.supplierId, ctx.tenantId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Get files that have been matched to this supplier
      const supplierFiles = await getFilesBySupplier(input.supplierId);
      
      return supplierFiles;
    }),
});