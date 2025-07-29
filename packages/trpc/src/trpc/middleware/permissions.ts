import { getConfig } from "@figgy/config";
import { Permission, setDb, TenantService } from "@figgy/tenant";
import { TRPCError } from "@trpc/server";
import { middleware, baseProcedure } from "../index";
import type { TenantContext } from "../context";

export interface PermissionOptions {
  permission: Permission;
  errorMessage?: string;
}

/**
 * Create a middleware that checks if the user has the required permission
 * for the current tenant
 */
export const requirePermission = (options: PermissionOptions) => {
  return middleware(async ({ ctx, next }) => {
    const { tenantId, user, db } = ctx as TenantContext;
    
    // Set the database instance for the tenant package
    setDb(db);
    
    // Check permission using TenantService
    const tenantService = new TenantService(
      db,
      getConfig().getForTenant().JWT_SECRET
    );
    
    const hasPermission = await tenantService.checkPermission({
      tenantId,
      userId: user.id,
      permission: options.permission,
    });
    
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: options.errorMessage || `You don't have permission to perform this action`,
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        hasPermission: true,
      },
    });
  });
};

/**
 * Create a procedure that requires a specific permission
 */
export const createPermissionProcedure = (permission: Permission, errorMessage?: string) => {
  return baseProcedure
    .use(requirePermission({ 
      permission, 
      ...(errorMessage && { errorMessage })
    }));
};