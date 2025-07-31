import { getConfig } from "@my-app/config";
import { logger } from "@my-app/utils";
import { createHonoApp } from "./server";

const config = getConfig();

const app = createHonoApp();

const port = config.PORT || 3000;
const host = config.HOST || "0.0.0.0";

try {
  const server = Bun.serve({
    port,
    hostname: host,
    fetch: app.fetch,
  });

  logger.info(`🚀 API server running at http://${host}:${port}`);
} catch (error) {
  logger.error("Failed to start server", { error });
  process.exit(1);
}