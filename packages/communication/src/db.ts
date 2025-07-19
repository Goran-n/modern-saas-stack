import { getConfig } from "@kibly/config";
import { type DrizzleClient, getDatabaseConnection } from "@kibly/shared-db";

let dbInstance: DrizzleClient | null = null;

/**
 * Get the database instance
 * Creates a new connection if one doesn't exist
 */
export function getDb(): DrizzleClient {
  if (!dbInstance) {
    const config = getConfig().getForCommunication();
    dbInstance = getDatabaseConnection(config.DATABASE_URL);
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