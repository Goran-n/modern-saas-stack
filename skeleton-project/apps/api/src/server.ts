import { getConfig } from "@my-app/config";
import { appRouter, createContext } from "@my-app/trpc";
import { logger } from "@my-app/utils";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

export function createHonoApp() {
  const app = new Hono();

  const config = getConfig();
  
  // CORS configuration
  const corsOrigins: string[] = [];
  if (config.NODE_ENV === "production") {
    corsOrigins.push(config.PRODUCTION_APP_URL || "https://app.example.com");
  } else {
    corsOrigins.push(
      "http://localhost:3000",
      "http://localhost:8010",
    );
  }

  // Middleware
  app.use(
    "*",
    cors({
      origin: corsOrigins,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      maxAge: 86400,
    }),
  );

  app.use("*", honoLogger());

  // Handle OPTIONS requests explicitly for TRPC routes
  app.options("/trpc/*", () => {
    return new Response(null, { status: 204 });
  });

  // tRPC handler
  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: async (opts) => {
        return (await createContext(opts)) as unknown as Record<
          string,
          unknown
        >;
      },
      onError({ error, path, type, ctx }) {
        logger.error(`tRPC error: ${error.message}`, {
          error,
          path,
          type,
          userId: ctx?.user?.id,
          tenantId: ctx?.tenantId,
        });
      },
    }),
  );

  // Health check endpoint
  app.get("/health", async (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.onError((err, c) => {
    logger.error("Unhandled error", {
      error: err,
      url: c.req.url,
      method: c.req.method,
    });

    return c.json(
      {
        error: "Internal server error",
        message: config.NODE_ENV === "development" ? err.message : undefined,
      },
      500,
    );
  });

  return app;
}

export type HonoApp = ReturnType<typeof createHonoApp>;