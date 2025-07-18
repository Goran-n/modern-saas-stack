export * from './client'
export * from './schemas'
export * from './types'
export { getDatabaseConnection, closeDatabaseConnection, checkDatabaseHealth, getConnectionStats } from './singleton'
export type { DrizzleClient as SingletonDrizzleClient } from './singleton'
export * from './helpers'

// Re-export Drizzle types and functions for convenience
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
export { eq, and, or, sql, desc, inArray, like } from 'drizzle-orm'