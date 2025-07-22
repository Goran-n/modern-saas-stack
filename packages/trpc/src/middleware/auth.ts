import { getConfig } from "@figgy/config";
import { TenantService } from "@figgy/tenant";
import { logger } from "@figgy/utils";
import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc";

export const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const hasTenantAccess = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tenant ID is required",
    });
  }

  try {
    const config = getConfig().getForTenant();
    const tenantService = new TenantService(ctx.db, config.JWT_SECRET);

    // Check if user is a member of the tenant
    const hasAccess = await tenantService.checkPermission({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      permission: "tenant:view", // Basic view permission
    });

    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this tenant",
      });
    }

    const tenant = await tenantService.getTenant(ctx.tenantId);
    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    return next({
      ctx: {
        user: ctx.user,
        tenantId: ctx.tenantId,
        tenant,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({
        err: error,
        userId: ctx.user.id,
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
        msg: "Failed to verify tenant access",
      });
    } else {
      logger.error({
        error,
        userId: ctx.user.id,
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
        msg: "Failed to verify tenant access",
      });
    }

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to verify tenant access",
    });
  }
});
