import { getFilesBySupplier } from "@figgy/file-manager";
import { SupplierQueries } from "@figgy/supplier";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

export const suppliersRouter = createTRPCRouter({
  list: tenantProcedure.query(async ({ ctx }) => {
    const queries = new SupplierQueries();
    return queries.list(ctx.tenantId);
  }),

  getFiles: tenantProcedure
    .input(
      z.object({
        supplierId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const queries = new SupplierQueries();

      // Verify supplier exists and belongs to tenant
      const supplier = await queries.getById(input.supplierId, ctx.tenantId);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      // Get files that have been matched to this supplier
      const supplierFiles = await getFilesBySupplier(input.supplierId);

      return supplierFiles;
    }),
});
