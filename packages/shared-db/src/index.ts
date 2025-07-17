export * from './client'
export * from './schemas'
export * from './types'
export * from './test-utils'

// Re-export Drizzle types and functions for convenience
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
export { eq, and, or, sql, desc, inArray, like } from 'drizzle-orm'