import { withRetry } from "@figgy/shared-db";
import { getUserTenants as getUserTenantsQuery, setDb, createTenant } from "@figgy/tenant";
import { logger } from "@figgy/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { protectedProcedure } from "../trpc/procedures";

export const authRouter = createTRPCRouter({
  getUserTenants: protectedProcedure.query(async ({ ctx }) => {
    try {
      logger.debug("getUserTenants called", {
        userId: ctx.user.id,
        requestId: ctx.requestId,
      });

      // Set the database instance for the tenant package
      setDb(ctx.db);

      // Wrap getUserTenants in retry logic to handle transient errors
      const userTenants = await withRetry(
        () => getUserTenantsQuery(ctx.user.id),
        {
          maxRetries: 3,
          initialDelay: 200,
          shouldRetry: (error: any) => {
            const errorMessage = error?.message?.toLowerCase() || "";
            // Retry on specific errors that might occur during startup
            return (
              errorMessage.includes("no resource with given identifier") ||
              errorMessage.includes("connection") ||
              errorMessage.includes("timeout") ||
              error?.code === "ECONNREFUSED"
            );
          },
        },
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
          settings: undefined,
        },
      }));
    } catch (error) {
      if (error instanceof Error) {
        logger.error({
          err: error,
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

  createFirstTenant: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Tenant name is required"),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx;

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }

        logger.info("Creating first tenant for user", {
          userId: user.id,
          tenantName: input.name,
          requestId: ctx.requestId,
        });

        // Set the database instance for the tenant package
        setDb(ctx.db);

        // Check if user already has tenants
        const existingTenants = await getUserTenantsQuery(user.id);
        if (existingTenants.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has tenants",
          });
        }

        // Create the tenant with a slug based on the name
        const slug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const result = await createTenant({
          name: input.name,
          slug,
          email: input.email || user.email || "",
          ownerId: user.id,
          settings: {},
          subscription: {},
          metadata: {
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
          },
        });

        logger.info("First tenant created successfully", {
          userId: user.id,
          tenantId: result.tenant.id,
          requestId: ctx.requestId,
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error("Failed to create first tenant", {
          error,
          userId: ctx.user?.id,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create tenant",
          cause: error,
        });
      }
    }),
});
