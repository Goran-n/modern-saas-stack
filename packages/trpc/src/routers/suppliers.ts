import { getFilesBySupplier } from "@figgy/file-manager";
import { globalSuppliers } from "@figgy/shared-db";
import { SupplierOperations, SupplierQueries } from "@figgy/supplier";
import { tasks } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
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

  enrichGlobalSupplier: tenantProcedure
    .input(
      z.object({
        supplierId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const queries = new SupplierQueries();
      const db = getDb();

      // Verify supplier exists and belongs to tenant
      const supplier = await queries.getById(input.supplierId, ctx.tenantId);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      if (!supplier.globalSupplierId) {
        throw new Error("Supplier has no global supplier linked");
      }

      // Get global supplier to check current status
      const [globalSupplier] = await db
        .select()
        .from(globalSuppliers)
        .where(eq(globalSuppliers.id, supplier.globalSupplierId));

      if (!globalSupplier) {
        throw new Error("Global supplier not found");
      }

      const tasksToTrigger = [];

      // Trigger domain discovery if no domain
      if (!globalSupplier.primaryDomain) {
        tasksToTrigger.push(
          tasks.trigger("domain-discovery", {
            globalSupplierIds: [globalSupplier.id],
          }),
        );
      } else {
        // If domain exists, trigger logo fetch and website analysis
        if (globalSupplier.logoFetchStatus !== "success") {
          tasksToTrigger.push(
            tasks.trigger("fetch-logo", {
              globalSupplierIds: [globalSupplier.id],
            }),
          );
        }

        if (globalSupplier.enrichmentStatus !== "completed") {
          tasksToTrigger.push(
            tasks.trigger("website-analysis", {
              globalSupplierIds: [globalSupplier.id],
            }),
          );
        }
      }

      if (tasksToTrigger.length === 0) {
        return {
          message: "Supplier is already fully enriched",
          globalSupplier,
        };
      }

      await Promise.all(tasksToTrigger);

      return {
        message: "Enrichment jobs triggered successfully",
        globalSupplier,
        jobsTriggered: tasksToTrigger.length,
      };
    }),

  getEnrichmentStatus: tenantProcedure
    .input(
      z.object({
        supplierId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const queries = new SupplierQueries();
      const db = getDb();

      // Verify supplier exists and belongs to tenant
      const supplier = await queries.getById(input.supplierId, ctx.tenantId);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      if (!supplier.globalSupplierId) {
        return {
          status: "no_global_supplier",
          enrichmentData: null,
        };
      }

      // Get global supplier enrichment data
      const [globalSupplier] = await db
        .select()
        .from(globalSuppliers)
        .where(eq(globalSuppliers.id, supplier.globalSupplierId));

      if (!globalSupplier) {
        return {
          status: "global_supplier_not_found",
          enrichmentData: null,
        };
      }

      return {
        status: globalSupplier.enrichmentStatus,
        enrichmentData: globalSupplier.enrichmentData,
        logoUrl: globalSupplier.logoUrl,
        logoFetchStatus: globalSupplier.logoFetchStatus,
        primaryDomain: globalSupplier.primaryDomain,
        lastEnrichmentAt: globalSupplier.lastEnrichmentAt,
        enrichmentAttempts: globalSupplier.enrichmentAttempts,
      };
    }),
});
