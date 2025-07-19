// Re-export Drizzle types and operations
export type { InferInsertModel, InferSelectModel } from "drizzle-orm";
export { and, desc, eq, gt, gte, inArray, isNull, like, ne, sql } from "drizzle-orm";
export * from "./helpers";
export * from "./schemas";
export type { DrizzleClient } from "./singleton";
export {
  checkDatabaseHealth,
  closeDatabaseConnection,
  getConnectionStats,
  getDatabaseConnection,
} from "./singleton";
export * from "./types";
