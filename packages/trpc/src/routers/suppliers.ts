import { getFilesBySupplier } from "@figgy/file-manager";
import { SupplierOperations, SupplierQueries } from "@figgy/supplier";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

export const suppliersRouter = createTRPCRouter({
  list: tenantProcedure.query(async ({ ctx }) => {
    const operations = new SupplierOperations();
    const suppliers = await operations.listWithLogoFetch(ctx.tenantId);
    return suppliers;
  }),

  getById: tenantProcedure
    .input(
      z.object({
        supplierId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const queries = new SupplierQueries();
      const supplier = await queries.getById(input.supplierId, ctx.tenantId);
      return supplier;
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
