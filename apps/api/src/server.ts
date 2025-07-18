import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
import { appRouter, createContext } from "@kibly/trpc";
import { getConfig } from "@kibly/config";
import { logger } from "@kibly/utils";
import { getDatabaseConnection, files, eq, and } from "@kibly/shared-db";
import { createClient } from "@supabase/supabase-js";

export function createHonoApp() {
  const app = new Hono();
  const config = getConfig().getCore();

  // Enhanced CORS configuration with logging
  app.use("*", cors({
    origin: config.NODE_ENV === "production" 
      ? ["https://app.kibly.com"] 
      : ["http://localhost:3000", "http://localhost:4000", "http://localhost:4001"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }));

  // Custom logging middleware that includes OPTIONS requests
  app.use("*", async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    
    if (method === "OPTIONS") {
      logger.info("OPTIONS request", {
        method,
        path,
        origin: c.req.header("origin"),
        userAgent: c.req.header("user-agent"),
      });
    }
    
    await next();
    
    const duration = Date.now() - start;
    const status = c.res.status;
    
    // Log response for OPTIONS requests
    if (method === "OPTIONS") {
      logger.info("OPTIONS response", {
        method,
        path,
        status,
        duration,
        corsHeaders: {
          "access-control-allow-origin": c.res.headers.get("access-control-allow-origin"),
          "access-control-allow-methods": c.res.headers.get("access-control-allow-methods"),
          "access-control-allow-headers": c.res.headers.get("access-control-allow-headers"),
        },
      });
    }
  });

  app.use("*", honoLogger());

  // File proxy route for PDF inline display
  app.get("/api/files/proxy/:fileId", async (c) => {
    const fileId = c.req.param("fileId");
    const tenantId = c.req.header("x-tenant-id") || c.req.query("tenantId");
    
    if (!tenantId) {
      return c.json({ error: "Tenant ID required" }, 401);
    }
    
    try {
      const db = getDatabaseConnection(config.DATABASE_URL);
      
      // Get file from database and validate tenant access
      const fileResult = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, fileId),
            eq(files.tenantId, tenantId)
          )
        )
        .limit(1);
      
      if (!fileResult[0]) {
        return c.json({ error: "File not found" }, 404);
      }
      
      const file = fileResult[0];
      
      // Create Supabase client
      const supabase = createClient(
        config.SUPABASE_URL,
        config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY
      );
      
      // Get storage bucket from config
      const storageBucket = config.STORAGE_BUCKET || 'vault';
      
      // Generate signed URL from Supabase
      const filePath = file.pathTokens.join("/");
      const { data: signedData, error: signedError } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(filePath, 3600);
      
      if (signedError || !signedData) {
        logger.error("Failed to generate signed URL", { error: signedError, fileId });
        return c.json({ error: "Failed to access file" }, 500);
      }
      
      // Fetch file from Supabase and stream with correct headers
      const response = await fetch(signedData.signedUrl);
      
      if (!response.ok) {
        logger.error("Failed to fetch file from storage", { 
          status: response.status, 
          fileId, 
          filePath 
        });
        return c.json({ error: "Failed to fetch file" }, 500);
      }
      
      // Return file with proper headers for inline display
      return new Response(response.body, {
        headers: {
          "Content-Type": file.mimeType || "application/octet-stream",
          "Content-Disposition": "inline",
          "Cache-Control": "private, max-age=3600",
        },
      });
      
    } catch (error) {
      logger.error("File proxy error", { error, fileId, tenantId });
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: async (opts) => {
        return await createContext(opts) as any;
      },
      onError({ error, path, type, ctx, input }) {
        logger.error({
          err: error,
          path,
          type,
          input: input,
          userId: ctx?.user?.id,
          tenantId: ctx?.tenantId,
          requestId: ctx?.requestId,
          msg: `tRPC error: ${error.message}`,
        });
      },
    })
  );

  app.get("/health", async (c) => {
    const { checkDatabaseHealth, getConnectionStats } = await import("@kibly/shared-db");
    
    try {
      const dbHealthy = await checkDatabaseHealth();
      const connectionStats = getConnectionStats();
      
      return c.json({ 
        status: dbHealthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        database: {
          connected: dbHealthy,
          stats: connectionStats,
        },
      });
    } catch (error) {
      logger.error("Health check failed", { error });
      return c.json({ 
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Failed to check health status",
      }, 503);
    }
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