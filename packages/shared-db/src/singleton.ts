import { logger } from "@figgy/utils";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas";

export type DrizzleClient = ReturnType<typeof drizzle>;

let globalConnection: postgres.Sql | null = null;
let globalDrizzle: DrizzleClient | null = null;

interface ConnectionPoolOptions {
  max?: number; // maximum number of connections in pool
  idle_timeout?: number; // seconds before idle connections are closed
  connect_timeout?: number; // seconds before connection timeout
  max_lifetime?: number; // maximum seconds a connection can exist
}

const DEFAULT_POOL_OPTIONS: ConnectionPoolOptions = {
  max: 20, // Default pool size
  idle_timeout: 30,
  connect_timeout: 30, // Increased timeout for slower connections
  max_lifetime: 60 * 30, // 30 minutes
};

/**
 * Creates or returns the singleton database connection with proper pooling
 */
export function getDatabaseConnection(
  connectionString: string,
  options: ConnectionPoolOptions = {},
): DrizzleClient {
  if (!globalDrizzle) {
    const poolOptions = { ...DEFAULT_POOL_OPTIONS, ...options };

    logger.info("Creating new database connection pool", {
      poolOptions,
      connectionString: connectionString.replace(/:[^:]*@/, ":****@"), // Hide password
    });

    try {
      // Parse the connection string to check for SSL requirements
      const url = new URL(connectionString);
      const sslMode = url.searchParams.get("sslmode");
      const channelBinding = url.searchParams.get("channel_binding");

      // Remove channel_binding from URL as postgres-js doesn't support it
      const cleanConnectionString = connectionString.replace(
        "&channel_binding=require",
        "",
      );

      logger.info("Database connection details", {
        host: url.hostname,
        database: url.pathname.substring(1),
        sslMode,
        channelBinding,
        hasChannelBinding: !!channelBinding,
      });

      // Create postgres connection with pooling
      globalConnection = postgres(cleanConnectionString, {
        max: poolOptions.max!,
        idle_timeout: poolOptions.idle_timeout!,
        connect_timeout: poolOptions.connect_timeout!,
        max_lifetime: poolOptions.max_lifetime!,
        // SSL configuration for Neon and other cloud providers
        ssl:
          sslMode === "require"
            ? {
                rejectUnauthorized: false, // Neon certificates are valid, but this helps with compatibility
              }
            : false,
        // Disable prepared statements for connection poolers like PgBouncer/Neon
        prepare: false,
        // Transform to handle parameter names correctly
        transform: {
          undefined: null,
        },
        onnotice: (notice) => {
          logger.debug("Database notice", { notice });
        },
        onclose: (connectionId) => {
          logger.warn("Database connection closed", { connectionId });
        },
        onparameter: (parameterName, parameterValue) => {
          logger.debug("Database parameter", { parameterName, parameterValue });
        },
      });

      // Create drizzle instance
      globalDrizzle = drizzle(globalConnection, { schema });

      logger.info("Database connection pool created successfully");
    } catch (error) {
      logger.error("Failed to create database connection", { error });
      throw error;
    }
  }

  return globalDrizzle;
}

/**
 * Get database connection using environment configuration
 * Useful for CLI tools and scripts that need a simple DB connection
 */
export function getDb(): DrizzleClient {
  // This will use the DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return getDatabaseConnection(databaseUrl);
}

/**
 * Closes the global database connection
 * Useful for graceful shutdown
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (globalConnection) {
    logger.info("Closing database connection pool");
    await globalConnection.end();
    globalConnection = null;
    globalDrizzle = null;
    logger.info("Database connection pool closed");
  }
}

/**
 * Checks if the database connection is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!globalConnection) {
    return false;
  }

  try {
    const result = await globalConnection`SELECT 1 as health_check`;
    return result.length > 0 && result[0]?.health_check === 1;
  } catch (error) {
    logger.error("Database health check failed", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : error,
    });
    return false;
  }
}

/**
 * Gets connection pool statistics
 */
export function getConnectionStats() {
  if (!globalConnection) {
    return null;
  }

  // postgres.js doesn't expose pool stats directly, but we can track basic info
  return {
    isConnected: !!globalConnection,
    poolOptions: DEFAULT_POOL_OPTIONS,
  };
}
