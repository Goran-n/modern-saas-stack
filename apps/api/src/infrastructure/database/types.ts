import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '../../database/schema/index'

// Create a unified database type that works for both PostgreSQL and D1
export type Database = PostgresJsDatabase<typeof schema> | DrizzleD1Database<typeof schema>

// Type guard to check if we're using PostgreSQL
export function isPostgresDatabase(db: Database): db is PostgresJsDatabase<typeof schema> {
  return 'query' in db
}

// Type guard to check if we're using D1
export function isD1Database(db: Database): db is DrizzleD1Database<typeof schema> {
  return !('query' in db)
}

// Create typed database interface for repositories
export interface DatabaseConnection {
  readonly db: Database
}

// Repository base class with typed database access
export abstract class BaseRepository implements DatabaseConnection {
  readonly db: Database

  constructor(database: Database) {
    this.db = database
  }

  protected async handleDatabaseError<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      // Log the error and re-throw with context
      console.error('Database operation failed:', error)
      throw error
    }
  }
}