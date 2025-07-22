import { getConfig } from "@figgy/config";
import { logger } from "@figgy/utils";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import filesRoutes from "./routes/files";
import slackRoutes from "./routes/slack";
import whatsappRoutes from "./routes/whatsapp";

// Ensure configuration is validated
const configManager = getConfig();
if (!configManager.isValid()) {
  configManager.validate();
}

const app = new Hono();

// Middleware
app.use("*", cors());

// Error handling
app.onError((err, c) => {
  logger.error("Unhandled error:", err);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: "Internal Server Error" }, 500);
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Mount routes
app.route("/api/files", filesRoutes);
app.route("/webhooks/slack", slackRoutes);
app.route("/webhooks/whatsapp", whatsappRoutes);

// Start server with Bun
const port = 5010;

export default {
  port,
  fetch: app.fetch,
};

logger.info(`REST API server starting on port ${port}`);
