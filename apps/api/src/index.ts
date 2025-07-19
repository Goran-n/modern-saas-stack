#!/usr/bin/env bun
import { serve } from "@hono/node-server";
import { bootstrap } from "@kibly/config";
import { checkDatabaseHealth, getDatabaseConnection } from "@kibly/shared-db";
import { logger } from "@kibly/utils";
import { createHonoApp } from "./server";

async function waitForDatabase(
  maxRetries = 10,
  retryDelay = 2000,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    logger.info(
      `Checking database connection (attempt ${i + 1}/${maxRetries})...`,
    );

    try {
      const isHealthy = await checkDatabaseHealth();
      if (isHealthy) {
        logger.info("Database connection established successfully");
        return true;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(`Database connection check failed (attempt ${i + 1})`, {
        error: errorMessage,
        isNetworkError:
          errorMessage.includes("CONNECT_TIMEOUT") ||
          errorMessage.includes("ECONNREFUSED"),
      });
    }

    if (i < maxRetries - 1) {
      logger.info(`Waiting ${retryDelay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      // Exponential backoff for network issues
      retryDelay = Math.min(retryDelay * 1.5, 10000);
    }
  }

  return false;
}

async function main() {
  // Bootstrap configuration
  const config = bootstrap({
    exitOnFailure: true,
  });

  if (!config) {
    logger.error("Failed to bootstrap configuration");
    process.exit(1);
  }

  // Initialize database connection with pool
  logger.info("Initializing database connection pool...");
  try {
    if (!config.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }

    getDatabaseConnection(config.DATABASE_URL, {
      max: 20, // Adjust based on your needs
      idle_timeout: 30,
      connect_timeout: 10,
    });

    logger.info("Database connection pool initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize database connection", { error });
    process.exit(1);
  }

  // Wait for database to be ready (can be skipped in dev with SKIP_DB_CHECK=true)
  const skipDbCheck = process.env.SKIP_DB_CHECK === "true";

  if (skipDbCheck) {
    logger.warn("⚠️  Database check skipped due to SKIP_DB_CHECK=true");
  } else {
    const isDatabaseReady = await waitForDatabase();
    if (!isDatabaseReady) {
      logger.error(
        "Failed to establish database connection after multiple retries",
      );
      logger.info(
        "💡 Hint: You can skip database checks by setting SKIP_DB_CHECK=true",
      );
      process.exit(1);
    }
  }

  // Create Hono app with tRPC
  const app = createHonoApp();

  // Start server
  const port = config.PORT || 5000;
  const hostname = config.HOST || "0.0.0.0";

  serve({
    fetch: app.fetch,
    port,
    hostname,
  });

  logger.info(`🚀 tRPC server started on port ${port}`, {
    port,
    hostname,
    url: `http://${hostname}:${port}`,
    trpcEndpoint: `http://${hostname}:${port}/trpc`,
    healthEndpoint: `http://${hostname}:${port}/health`,
    environmentPort: process.env.PORT,
    configPort: config.PORT,
  });

  // Setup graceful shutdown
  const shutdown = async () => {
    logger.info("Shutdown initiated, cleaning up resources...");

    try {
      // Close database connections
      const { closeDatabaseConnection } = await import("@kibly/shared-db");
      await closeDatabaseConnection();
      logger.info("Database connections closed");
    } catch (error) {
      logger.error("Error during database cleanup", { error });
    }

    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
