import { createTRPCRouter } from "../trpc";
import { protectedProcedure } from "../trpc/procedures";
import { TenantService } from "@kibly/tenant";
import { logger } from "@kibly/utils";
import { TRPCError } from "@trpc/server";
import { withRetry } from "@kibly/shared-db";

export const authRouter = createTRPCRouter({
  getUserTenants: protectedProcedure.query(async ({ ctx }) => {
    try {
      logger.debug("getUserTenants called", {
        userId: ctx.user.id,
        requestId: ctx.requestId,
      });
      
      const tenantService = new TenantService(ctx.db);
      
      // Wrap getUserTenants in retry logic to handle transient errors
      const userTenants = await withRetry(
        () => tenantService.getUserTenants(ctx.user.id),
        {
          maxRetries: 3,
          initialDelay: 200,
          shouldRetry: (error: any) => {
            const errorMessage = error?.message?.toLowerCase() || '';
            // Retry on specific errors that might occur during startup
            return (
              errorMessage.includes('no resource with given identifier') ||
              errorMessage.includes('connection') ||
              errorMessage.includes('timeout') ||
              error?.code === 'ECONNREFUSED'
            );
          },
        }
      );
      
      logger.debug("getUserTenants result", {
        userId: ctx.user.id,
        requestId: ctx.requestId,
        tenantCount: userTenants.length,
      });
      
      return userTenants.map((ut: any) => ({
        ...ut,
        tenant: {
          ...ut.tenant,
          // Ensure sensitive data is not exposed
          settings: undefined
        }
      }));
    } catch (error) {
      // Log with error as first parameter for better pino handling
      if (error instanceof Error) {
        logger.error({
          err: error, // pino's standard error field
          userId: ctx.user.id,
          requestId: ctx.requestId,
          msg: "getUserTenants failed",
        });
      } else {
        logger.error({
          error: error,
          userId: ctx.user.id,
          requestId: ctx.requestId,
          msg: "getUserTenants failed",
        });
      }
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user tenants",
        cause: error,
      });
    }
  }),
});