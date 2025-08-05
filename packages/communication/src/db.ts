import { getDb as getSharedDb, type DrizzleClient } from "@figgy/shared-db";

let dbInstance: DrizzleClient | null = null;

/**
 * Get database instance
 */
export function getDb(): DrizzleClient {
  if (!dbInstance) {
    dbInstance = getSharedDb();
  }
  return dbInstance;
}

/**
 * Set a custom database instance (useful for testing)
 */
export function setDb(db: DrizzleClient): void {
  dbInstance = db;
}

/**
 * Reset the database instance
 */
export function resetDb(): void {
  dbInstance = null;
}