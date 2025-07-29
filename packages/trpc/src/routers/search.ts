import * as searchOps from "@figgy/search";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

export const searchRouter = createTRPCRouter({
  search: tenantProcedure
    .input(
      z.object({
        query: z.string().min(1),
        filters: z
          .object({
            type: z.enum(["file", "supplier", "document"]).optional(),
            category: z.string().optional(),
            supplierId: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
          })
          .optional(),
        limit: z.number().min(1).max(100).optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { query, filters, limit } = input;

      // tenantProcedure ensures tenantId is available

      // Clean up filters to remove undefined values
      const cleanFilters = filters
        ? Object.entries(filters).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = value;
            }
            return acc;
          }, {} as any)
        : undefined;

      const results = await searchOps.search(
        ctx.tenantId,
        query,
        cleanFilters,
        limit,
      );

      return {
        results,
        query,
        filters,
        limit,
      };
    }),

  suggest: tenantProcedure
    .input(
      z.object({
        prefix: z.string().min(1),
        limit: z.number().min(1).max(20).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { prefix, limit } = input;

      // tenantProcedure ensures tenantId is available

      const suggestions = await searchOps.suggest(ctx.tenantId, prefix, limit);

      return {
        suggestions,
        prefix,
      };
    }),
});
