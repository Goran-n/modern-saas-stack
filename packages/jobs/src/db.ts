import { type DrizzleClient, getDatabaseConnection } from "@figgy/shared-db";
import { logger } from "@figgy/utils";

let dbInstance: DrizzleClient | null = null;

/**
 * Get the database instance
 * Creates a new connection if one doesn't exist
 */
export function getDb(): DrizzleClient {
  if (!dbInstance) {
    // For tests, use TEST_DATABASE_URL directly if available
    if (process.env.TEST_DATABASE_URL) {
      logger.debug("Using TEST_DATABASE_URL for database connection");
      dbInstance = getDatabaseConnection(process.env.TEST_DATABASE_URL);
    } else {
      // In jobs context, DATABASE_URL is provided by Doppler
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error("DATABASE_URL not found in environment");
      }

      logger.debug(
        "Using DATABASE_URL from environment for database connection",
      );
      dbInstance = getDatabaseConnection(databaseUrl);
    }
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

/**
 * Default database instance for convenience
 * Primarily used in tests
 */
export const db = new Proxy({} as DrizzleClient, {
  get(_, prop, receiver) {
    const dbInstance = getDb();
    return Reflect.get(dbInstance, prop, receiver);
  },
});
