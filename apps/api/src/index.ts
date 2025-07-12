#!/usr/bin/env bun
import { serve } from "@hono/node-server";
import { bootstrap } from "@kibly/config";
import { logger } from "@kibly/utils";
import { createHonoApp } from "./server";

async function main() {
  // Bootstrap configuration
  const config = bootstrap({
    exitOnFailure: true,
  });

  if (!config) {
    logger.error("Failed to bootstrap configuration");
    process.exit(1);
  }

  // Create Hono app with tRPC
  const app = createHonoApp();

  // Start server
  const port = config.PORT || 5001;
  const hostname = config.HOST || "0.0.0.0";

  serve({
    fetch: app.fetch,
    port,
    hostname,
  });

  logger.info(`🚀 tRPC server started`, {
    port,
    hostname,
    url: `http://${hostname}:${port}`,
    trpcEndpoint: `http://${hostname}:${port}/trpc`,
    healthEndpoint: `http://${hostname}:${port}/health`,
  });
}

main().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});