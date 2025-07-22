import { formatCurrentUser, getUserById, listUsers } from "@figgy/shared-auth";
import { createLogger } from "@figgy/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

const logger = createLogger("users-router");

export const usersRouter = createTRPCRouter({
  // List all users for the tenant
  list: tenantProcedure.query(async ({ ctx }) => {
    const { tenantId, supabase } = ctx;

    logger.info("Listing users for tenant", {
      tenantId,
      requestId: ctx.requestId,
    });

    try {
      // TODO: In the future, filter users by tenant membership
      return await listUsers(supabase);
    } catch (error) {
      logger.error("Failed to list users", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list users",
      });
    }
  }),

  // Get current user details
  me: tenantProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    logger.info("Getting current user", {
      userId: user?.id,
      requestId: ctx.requestId,
    });

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    return formatCurrentUser(user);
  }),

  // Get a specific user by ID
  getById: tenantProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { supabase, tenantId } = ctx;
      const { userId } = input;

      logger.info("Getting user by ID", {
        userId,
        tenantId,
        requestId: ctx.requestId,
      });

      try {
        const user = await getUserById(supabase, userId);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return user;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error("Failed to get user by ID", {
          error,
          userId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get user",
        });
      }
    }),
});
