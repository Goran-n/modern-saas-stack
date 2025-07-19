import { trpcServer } from "@hono/trpc-server";
import {
  handleSlackEventWebhook,
  handleTwilioWhatsAppWebhook,
  handleWhatsAppVerification,
} from "@kibly/communication";
import { getConfig } from "@kibly/config";
import { files, getDatabaseConnection, and, eq } from "@kibly/shared-db";
import { appRouter, createContext } from "@kibly/trpc";
import { logger } from "@kibly/utils";
import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

export function createHonoApp() {
  const app = new Hono();
  const config = getConfig().getCore();
  // Use process.env directly since webConfig is not available in API context
  const productionAppUrl =
    process.env.PRODUCTION_APP_URL || "https://app.kibly.com";
  const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS;

  // Build CORS origins from config
  const corsOrigins: string[] = [];
  if (config.NODE_ENV === "production") {
    corsOrigins.push(productionAppUrl);
    // Add additional origins if configured
    if (additionalOrigins) {
      corsOrigins.push(...additionalOrigins.split(",").map((o) => o.trim()));
    }
  } else {
    corsOrigins.push(
      "http://localhost:3000",
      "http://localhost:4000",
      "http://localhost:4001",
    );
  }

  // Enhanced CORS configuration with logging
  app.use(
    "*",
    cors({
      origin: corsOrigins,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      maxAge: 86400, // 24 hours
    }),
  );

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
          "access-control-allow-origin": c.res.headers.get(
            "access-control-allow-origin",
          ),
          "access-control-allow-methods": c.res.headers.get(
            "access-control-allow-methods",
          ),
          "access-control-allow-headers": c.res.headers.get(
            "access-control-allow-headers",
          ),
        },
      });
    }
  });

  app.use("*", honoLogger());

  // Handle OPTIONS requests explicitly for TRPC routes
  app.options("/trpc/*", () => {
    return new Response(null, { status: 204 });
  });

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
        .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
        .limit(1);

      if (!fileResult[0]) {
        return c.json({ error: "File not found" }, 404);
      }

      const file = fileResult[0];

      // Create Supabase client
      const supabase = createClient(
        config.SUPABASE_URL,
        config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
      );

      // Get storage bucket from config
      const storageBucket = config.STORAGE_BUCKET;

      // Generate signed URL from Supabase
      const filePath = file.pathTokens.join("/");
      const { data: signedData, error: signedError } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(filePath, 3600);

      if (signedError || !signedData) {
        logger.error("Failed to generate signed URL", {
          error: signedError,
          fileId,
        });
        return c.json({ error: "Failed to access file" }, 500);
      }

      // Fetch file from Supabase and stream with correct headers
      const response = await fetch(signedData.signedUrl);

      if (!response.ok) {
        logger.error("Failed to fetch file from storage", {
          status: response.status,
          fileId,
          filePath,
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

  // WhatsApp webhook endpoints
  app.post("/webhooks/whatsapp", async (c) => {
    try {
      const body = await c.req.parseBody();
      logger.info("WhatsApp webhook received");

      const result = await handleTwilioWhatsAppWebhook(body);

      if (result.success) {
        return c.json({
          status: "success",
          fileId: result.fileId,
          jobId: result.jobId,
        });
      } else {
        logger.warn("WhatsApp webhook processing failed", {
          error: result.error,
        });
        const statusCode = result.requiresRegistration ? 403 : 400;
        return c.json(
          {
            status: "error",
            error: result.error,
            requiresRegistration: result.requiresRegistration,
          },
          statusCode,
        );
      }
    } catch (error) {
      // Use pino's built-in error serialization for better error handling
      logger.error({
        err: error, // This will use pino's error serializer
        url: c.req.url,
        method: c.req.method,
        contentType: c.req.header("content-type"),
        msg: "WhatsApp webhook error",
      });
      return c.json({ status: "error", error: "Internal server error" }, 500);
    }
  });

  // WhatsApp webhook verification (GET request from Twilio)
  app.get("/webhooks/whatsapp", (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");

    const twilioConfig = getConfig().getForCommunication();
    const verifyToken = twilioConfig.WHATSAPP_VERIFY_TOKEN;

    const result = handleWhatsAppVerification(
      mode,
      token,
      challenge,
      verifyToken,
    );

    if (result.verified && result.challenge) {
      logger.info("WhatsApp webhook verified");
      return c.text(result.challenge);
    }

    logger.warn("WhatsApp webhook verification failed", { mode, token });
    return c.text("Forbidden", 403);
  });

  // Twilio status callback webhook endpoint
  app.post("/webhooks/twilio/status", async (c) => {
    try {
      const body = await c.req.parseBody();

      // Log the status update
      logger.info("Twilio status callback received", {
        messageSid: body.MessageSid,
        messageStatus: body.MessageStatus,
        to: body.To,
        from: body.From,
        errorCode: body.ErrorCode,
        errorMessage: body.ErrorMessage,
      });

      // TODO: Implement status tracking in database
      // You could update a messages table with delivery status

      // Acknowledge receipt
      return c.text("", 200);
    } catch (error) {
      logger.error("Twilio status webhook error", { error });
      return c.text("", 500);
    }
  });

  // Slack event webhook endpoint
  app.post("/webhooks/slack", async (c) => {
    try {
      const body = await c.req.json();
      logger.info("Slack webhook received", {
        type: body.type,
        event: body.event?.type,
      });

      const result = await handleSlackEventWebhook(body);

      // Handle URL verification challenge
      if ("challenge" in result) {
        return c.json(result);
      }

      // Return success for normal events
      if (result.success) {
        return c.json({ ok: true });
      } else {
        logger.warn("Slack webhook processing failed", { error: result.error });
        const statusCode = result.requiresRegistration ? 403 : 400;
        return c.json(
          {
            ok: false,
            error: result.error,
            requiresRegistration: result.requiresRegistration,
          },
          statusCode,
        );
      }
    } catch (error) {
      logger.error("Slack webhook error", { error });
      return c.json({ ok: false, error: "Internal server error" }, 500);
    }
  });

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
    }),
  );

  app.get("/health", async (c) => {
    const { checkDatabaseHealth, getConnectionStats } = await import(
      "@kibly/shared-db"
    );

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
      return c.json(
        {
          status: "error",
          timestamp: new Date().toISOString(),
          error: "Failed to check health status",
        },
        503,
      );
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
      500,
    );
  });

  return app;
}

export type HonoApp = ReturnType<typeof createHonoApp>;
