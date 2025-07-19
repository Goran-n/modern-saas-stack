import { hasTenantAccess, isAuthenticated } from "../middleware/auth";
import { loggingMiddleware } from "../middleware/logging";
import { performanceMiddleware } from "../middleware/performance";
import { baseProcedure } from "./index";

// Apply logging middleware to all procedures
const baseWithLogging = baseProcedure.use(loggingMiddleware);

// Check if performance monitoring is enabled based on environment
const isPerformanceEnabled = () => {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_PERFORMANCE_MONITORING === "true"
  );
};

// Optionally add performance monitoring
export const publicProcedure = isPerformanceEnabled()
  ? baseWithLogging.use(performanceMiddleware)
  : baseWithLogging;

export const protectedProcedure = publicProcedure.use(isAuthenticated);

export const tenantProcedure = publicProcedure.use(hasTenantAccess);

// Export types for the procedures
export type PublicProcedure = typeof publicProcedure;
export type ProtectedProcedure = typeof protectedProcedure;
export type TenantProcedure = typeof tenantProcedure;
