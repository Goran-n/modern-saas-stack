// Core tRPC exports

export type { LoggingLinkOptions } from "./client/logging-link";
// Client utilities
export { createLoggingLink } from "./client/logging-link";
export { hasTenantAccess, isAuthenticated } from "./middleware/auth";
export { loggingMiddleware } from "./middleware/logging";
export {
  cleanupPerformanceMonitor,
  getPerformanceStats,
  performanceMiddleware,
} from "./middleware/performance";
// Type exports
export type { AppRouter } from "./routers";
// Router exports
export { appRouter } from "./routers";
export { authRouter } from "./routers/auth";
export { debugRouter } from "./routers/debug";
export { filesRouter } from "./routers/files";
export { oauthRouter } from "./routers/oauth";
export { suppliersRouter } from "./routers/suppliers";
export type { ErrorDetails, ErrorMetrics } from "./services/error-tracker";
// Error tracking
export { cleanupErrorTracker, errorTracker } from "./services/error-tracker";
export {
  createCallerFactory,
  createTRPCRouter,
  middleware,
} from "./trpc";
export type { Context } from "./trpc/context";
// Context and middleware
export { createContext } from "./trpc/context";
export {
  protectedProcedure,
  publicProcedure,
  tenantProcedure,
} from "./trpc/procedures";
