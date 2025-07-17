import { publicProcedure } from "./index";
import { isAuthenticated, hasTenantAccess } from "../middleware/auth";

export const protectedProcedure = publicProcedure.use(isAuthenticated);

export const tenantProcedure = publicProcedure.use(hasTenantAccess);

// Export types for the procedures
export type ProtectedProcedure = typeof protectedProcedure;
export type TenantProcedure = typeof tenantProcedure;