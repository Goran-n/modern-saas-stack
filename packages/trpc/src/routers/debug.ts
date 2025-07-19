import { logger } from "@kibly/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { errorTracker } from "../services/error-tracker";
import { createTRPCRouter } from "../trpc";
import { publicProcedure } from "../trpc/procedures";

interface DatabaseError extends Error {
  code: string;
}

export const debugRouter = createTRPCRouter({
  // Test endpoint to verify logging
  testError: publicProcedure
    .input(
      z.object({
        errorType: z.enum(["trpc", "standard", "database", "validation"]),
      }),
    )
    .query(async ({ input, ctx }) => {
      logger.info("Test error endpoint called", {
        errorType: input.errorType,
        requestId: ctx.requestId,
      });

      switch (input.errorType) {
        case "trpc":
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "This is a test TRPC error",
            cause: new Error("Underlying cause of the error"),
          });

        case "standard":
          throw new Error("This is a test standard error");

        case "database": {
          const dbError = new Error(
            "Database connection failed",
          ) as DatabaseError;
          dbError.code = "ECONNREFUSED";
          throw dbError;
        }

        case "validation":
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Validation failed",
            cause: {
              field: "email",
              reason: "Invalid email format",
            },
          });

        default:
          return { success: true };
      }
    }),

  // Get error metrics
  getErrorMetrics: publicProcedure.query(async () => {
    const metrics = errorTracker.getMetrics();
    return metrics;
  }),

  // Test successful request
  testSuccess: publicProcedure
    .input(
      z.object({
        message: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      logger.info("Test success endpoint called", {
        message: input.message,
        requestId: ctx.requestId,
      });

      return {
        success: true,
        message: `Echo: ${input.message}`,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      };
    }),
});
