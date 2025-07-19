import {
  createWhatsAppVerification,
  getCommunicationStats,
  getRecentActivity,
  getSlackWorkspaces,
  getWhatsAppVerifications,
  retryFileProcessing,
  updateWhatsAppVerification,
  verifyWhatsAppCode,
  setDb as setCommunicationDb,
} from "@kibly/communication";
import { createLogger } from "@kibly/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

const logger = createLogger("communication-router");

// Create a custom procedure that sets the db for communication
const communicationProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  // Set the database instance for communication
  setCommunicationDb(ctx.db);
  return next({ ctx });
});

export const communicationRouter = createTRPCRouter({
  // Get communication statistics
  getStats: communicationProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    logger.info("getStats called", { 
      tenantId, 
      userId: ctx.user?.id,
      requestId: ctx.requestId 
    });

    try {
      return await getCommunicationStats(tenantId);
    } catch (error) {
      logger.error("Failed to get communication stats", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get communication statistics",
      });
    }
  }),

  // Get recent activity
  getRecentActivity: communicationProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    logger.info("getRecentActivity called", {
      tenantId,
      userId: ctx.user?.id,
      requestId: ctx.requestId,
    });

    try {
      return await getRecentActivity(tenantId);
    } catch (error) {
      logger.error("Failed to get recent activity", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get recent activity",
      });
    }
  }),

  // Get WhatsApp verifications
  getVerifications: communicationProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    logger.info("getVerifications called", {
      tenantId,
      userId: ctx.user?.id,
      requestId: ctx.requestId,
    });

    try {
      return await getWhatsAppVerifications(tenantId);
    } catch (error) {
      logger.error("Failed to get verifications", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get verifications",
      });
    }
  }),

  // Update verification status
  updateVerification: communicationProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        verified: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId } = ctx;
      const { id, verified } = input;

      logger.info("updateVerification called", {
        id,
        verified,
        tenantId,
        userId: ctx.user?.id,
        requestId: ctx.requestId,
      });

      try {
        return await updateWhatsAppVerification(id, tenantId, verified);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Verification not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Verification not found",
          });
        }

        logger.error("Failed to update verification", {
          error,
          id,
          tenantId,
          requestId: ctx.requestId,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update verification",
        });
      }
    }),

  // Get Slack workspaces
  getWorkspaces: communicationProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    logger.info("getWorkspaces called", {
      tenantId,
      userId: ctx.user?.id,
      requestId: ctx.requestId,
    });

    try {
      return await getSlackWorkspaces(tenantId);
    } catch (error) {
      logger.error("Failed to get workspaces", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get workspaces",
      });
    }
  }),

  // Retry failed processing
  retryProcessing: communicationProcedure
    .input(
      z.object({
        activityId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId } = ctx;
      const { activityId } = input;

      logger.info("retryProcessing called", {
        activityId,
        tenantId,
        userId: ctx.user?.id,
        requestId: ctx.requestId,
      });

      try {
        return await retryFileProcessing(activityId, tenantId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "File not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Activity not found",
          });
        }

        logger.error("Failed to retry processing", {
          error,
          activityId,
          tenantId,
          requestId: ctx.requestId,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retry processing",
        });
      }
    }),

  // Create a new WhatsApp verification
  createVerification: communicationProcedure
    .input(
      z.object({
        phoneNumber: z
          .string()
          .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId } = ctx;
      const { phoneNumber, userId } = input;

      logger.info("createVerification called", {
        phoneNumber,
        userId,
        tenantId,
        requestId: ctx.requestId,
      });

      try {
        return await createWhatsAppVerification(phoneNumber, tenantId, userId);
      } catch (error) {
        logger.error("Failed to create verification", {
          error,
          phoneNumber,
          tenantId,
          requestId: ctx.requestId,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create verification",
        });
      }
    }),

  // Verify the code entered by the user
  verifyCode: communicationProcedure
    .input(
      z.object({
        phoneNumber: z
          .string()
          .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
        code: z.string().length(6, "Verification code must be 6 digits"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId } = ctx;
      const { phoneNumber, code } = input;

      logger.info("verifyCode called", {
        phoneNumber,
        tenantId,
        userId: ctx.user?.id,
        requestId: ctx.requestId,
      });

      try {
        return await verifyWhatsAppCode(phoneNumber, code, tenantId);
      } catch (error) {
        logger.error("Failed to verify code", {
          error,
          phoneNumber,
          tenantId,
          requestId: ctx.requestId,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to verify code",
        });
      }
    }),
});