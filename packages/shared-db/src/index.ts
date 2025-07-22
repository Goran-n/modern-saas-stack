// Re-export Drizzle types and operations
export type { InferInsertModel, InferSelectModel, SQL } from "drizzle-orm";
export {
  and,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
