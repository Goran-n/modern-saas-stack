import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
import { appRouter, createContext } from "@kibly/trpc";
import { getConfig } from "@kibly/config";
import { logger } from "@kibly/utils";

export function createHonoApp() {
  const app = new Hono();
  const config = getConfig().getCore();

  app.use("*", cors({
    origin: config.NODE_ENV === "production" 
      ? ["https://app.kibly.com"] 
      : ["http://localhost:3000", "http://localhost:4000"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }));

  app.use("*", honoLogger());

  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: async (opts) => {
        return await createContext(opts) as any;
      },
      onError({ error, path, type }) {
        logger.error("tRPC error", {
          error: error.message,
          code: error.code,
          path,
          type,
          stack: error.stack,
        });
      },
    })
  );

  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.onError((err, c) => {
    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      url: c.req.url,
      method: c.req.method,
    });

    return c.json(
      {
        error: "Internal server error",
        message: config.NODE_ENV === "development" ? err.message : undefined,
      },
      500
    );
  });

  return app;
}

export type HonoApp = ReturnType<typeof createHonoApp>;