// Core tRPC exports
export { createTRPCRouter, publicProcedure, createCallerFactory, middleware } from "./trpc";
export { protectedProcedure, tenantProcedure } from "./trpc/procedures";

// Router exports
export { appRouter } from "./routers";
export { authRouter } from "./routers/auth";
export { filesRouter } from "./routers/files";
export { suppliersRouter } from "./routers/suppliers";
export { debugRouter } from "./routers/debug";

// Context and middleware
export { createContext } from "./trpc/context";
export { isAuthenticated, hasTenantAccess } from "./middleware/auth";
export { loggingMiddleware } from "./middleware/logging";
export { performanceMiddleware, getPerformanceStats } from "./middleware/performance";

// Client utilities
export { createLoggingLink } from "./client/logging-link";
export type { LoggingLinkOptions } from "./client/logging-link";

// Error tracking
export { errorTracker } from "./services/error-tracker";
export type { ErrorMetrics, ErrorDetails } from "./services/error-tracker";

// Type exports
export type { AppRouter } from "./routers";
export type { Context } from "./trpc/context";