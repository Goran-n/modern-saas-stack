import {
  completeSlackOAuth,
  generateSlackOAuthUrl,
  handleSlackMultiTenantWebhook,
  handleTwilioWhatsAppWebhook,
  handleWhatsAppVerification,
  SlackResponseService,
  verifyLinkingToken,
  WhatsAppResponseService,
} from "@figgy/communication";
import { getConfig } from "@figgy/config";
import { and, eq, files, getDatabaseConnection } from "@figgy/shared-db";
import { appRouter, createContext } from "@figgy/trpc";
import type { SlackWebhookBody } from "@figgy/types";
import { logError, logger } from "@figgy/utils";
import { trpcServer } from "@hono/trpc-server";
import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

export function createHonoApp() {
  const app = new Hono();

  // Ensure configuration is validated
  const configManager = getConfig();
  if (!configManager.isValid()) {
    configManager.validate();
  }
  const config = configManager.getCore();
  // Use process.env directly since webConfig is not available in API context
  const productionAppUrl =
    process.env.PRODUCTION_APP_URL || "https://app.figgy.com";
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
      "http://localhost:8010",
      "http://localhost:8011",
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

  // Test endpoint for Trigger.dev
  app.get("/test/trigger", async (c) => {
    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");

      logger.info("Testing Trigger.dev", {
        tasksAvailable: typeof tasks !== "undefined",
        triggerMethodExists: typeof tasks?.trigger === "function",
      });

      // Try to trigger a test job
      const testIds = ["test-global-supplier-1", "test-global-supplier-2"];
      const result = await tasks.trigger("fetch-logo", {
        globalSupplierIds: testIds,
      });

      return c.json({
        success: true,
        jobId: result.id,
        testIds,
        message: "Logo fetch job triggered successfully",
      });
    } catch (error) {
      logger.error("Test trigger failed", {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
      });

      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  });

  // WhatsApp webhook endpoints
  app.post("/webhooks/whatsapp", async (c) => {
    try {
      const body = await c.req.parseBody();
      logger.info("WhatsApp webhook received");

      const result = await handleTwilioWhatsAppWebhook(body);

      if (result.success) {
        // Check if we have a response to send back
        if (result.metadata?.responseText) {
          // Extract sender from the webhook payload
          const from =
            (body as Record<string, unknown>).From ||
            (body as Record<string, unknown>).from;
          try {
            if (from) {
              const responseService = new WhatsAppResponseService();
              await responseService.sendMessage(
                String(from),
                result.metadata.responseText,
                {
                  quickReplies: result.metadata.quickReplies,
                },
              );
            }
          } catch (responseError) {
            logError(
              logger,
              "Failed to send WhatsApp response",
              responseError,
              {
                responseTextLength: result.metadata?.responseText?.length,
                from,
                hasQuickReplies: !!result.metadata?.quickReplies?.length,
              },
            );
          }
        }

        return c.json({
          status: "success",
          fileId: result.fileId,
          jobId: result.jobId,
          queryId: result.metadata?.queryId,
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
      logger.error({
        err: error,
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
    logger.info("Slack webhook endpoint hit", {
      headers: {
        "content-type": c.req.header("content-type"),
        "x-slack-signature": c.req.header("x-slack-signature")
          ? "present"
          : "missing",
        "x-slack-request-timestamp": c.req.header("x-slack-request-timestamp"),
      },
    });

    // Initialize body variable for error handling context
    let parsedBody: SlackWebhookBody | undefined;

    try {
      // Get raw body for signature verification
      const rawBody = await c.req.text();

      if (!rawBody) {
        logger.warn("Empty request body received from Slack");
        return c.json({ error: "Empty request body" }, 400);
      }

      try {
        parsedBody = JSON.parse(rawBody);
      } catch (parseError) {
        logger.error("Failed to parse Slack webhook body", {
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          bodyLength: rawBody.length,
          bodyPreview: rawBody.substring(0, 200),
        });
        return c.json({ error: "Invalid JSON body" }, 400);
      }

      // Now we can safely use parsedBody as it's defined
      const body = parsedBody;

      // Verify Slack signature
      const signature = c.req.header("x-slack-signature");
      const timestamp = c.req.header("x-slack-request-timestamp");

      if (signature && timestamp) {
        const { getSlackService } = await import("@figgy/communication");
        const slackService = getSlackService();

        // Check timestamp to prevent replay attacks (must be within 5 minutes)
        const requestTime = parseInt(timestamp);
        const currentTime = Math.floor(Date.now() / 1000);
        if (Math.abs(currentTime - requestTime) > 300) {
          logger.warn("Slack webhook timestamp too old", {
            timestamp,
            requestTime,
            currentTime,
            difference: Math.abs(currentTime - requestTime),
            maxAllowed: 300,
          });
          return c.json({ error: "Request timestamp invalid" }, 400);
        }

        // Verify signature
        const isValid = slackService.verifyRequestSignature(
          signature,
          timestamp,
          rawBody,
        );

        if (!isValid) {
          logger.warn("Invalid Slack webhook signature", {
            hasSignature: !!signature,
            hasTimestamp: !!timestamp,
            signatureLength: signature?.length,
            timestampValue: timestamp,
          });
          return c.json({ error: "Invalid signature" }, 401);
        }
      }

      logger.info("Slack webhook received", {
        type: body!.type,
        event: body!.event?.type,
      });

      let result;
      try {
        result = await handleSlackMultiTenantWebhook(body!);
      } catch (handlerError) {
        // Log the specific handler error
        logger.error("Handler threw error", {
          error:
            handlerError instanceof Error
              ? handlerError.message
              : String(handlerError),
          stack: handlerError instanceof Error ? handlerError.stack : undefined,
          errorType: handlerError?.constructor?.name,
          eventType: body!.event?.type,
          teamId: body!.team_id,
          userId: body!.event?.user,
        });
        throw handlerError; // Re-throw to be caught by outer catch
      }

      // Handle URL verification challenge
      if ("challenge" in result) {
        return c.json(result);
      }

      logger.info("Slack webhook handler result", {
        success: result.success,
        hasError: !!result.error,
        error: result.error,
        hasMetadata: !!result.metadata,
        requiresRegistration: result.requiresRegistration,
      });

      // Return success for normal events
      if (result.success) {
        // Check if we have a response to send back
        if (result.metadata?.responseText && body!.event) {
          const workspaceId = body!.team_id;
          const channelId = body!.event.channel;
          const threadTs = body!.event.thread_ts || body!.event.ts;

          try {
            const responseService = new SlackResponseService();

            // Format message with tenant context if in DM
            let message = result.metadata.responseText;
            if (
              result.metadata.isDM &&
              result.metadata.tenantName &&
              !result.metadata.skipNLQ
            ) {
              message = `_[${result.metadata.tenantName}]_ ${message}`;
            }

            await responseService.sendMessage(workspaceId, channelId, message, {
              threadTs: threadTs,
              blocks: result.metadata.blocks,
              unfurlLinks: false,
              unfurlMedia: false,
            });
          } catch (responseError) {
            logError(logger, "Failed to send Slack response", responseError, {
              workspaceId,
              channelId,
              responseTextLength: result.metadata?.responseText?.length,
              hasBlocks: !!result.metadata?.blocks,
            });

            // If it's a bot token error, we can't send via API
            // Slack Events API doesn't support synchronous responses
            // User will need to complete OAuth flow first
          }
        }

        return c.json({ ok: true });
      } else {
        logger.warn("Slack webhook processing failed", {
          error: result.error,
          requiresRegistration: result.requiresRegistration,
          metadata: result.metadata,
          eventType: body!.event?.type,
          teamId: body!.team_id,
          userId: body!.event?.user,
          text: body!.event?.text?.substring(0, 100),
        });

        // If it's a workspace configuration error, provide OAuth URL
        if (result.error?.includes("Figgy not configured")) {
          const baseUrl = config.BASE_URL;
          if (baseUrl) {
            logger.info("Figgy needs OAuth setup for workspace", {
              workspaceId: body!.team_id,
              installUrl: `${baseUrl}/oauth/slack/install?tenantId=YOUR_TENANT_ID`,
              message:
                "Admin needs to visit the install URL with their tenant ID to complete Figgy installation",
            });
          } else {
            logger.warn(
              "BASE_URL not configured - cannot provide OAuth install URL",
            );
          }
        }

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
      // Log error with context
      logError(logger, "Slack webhook error", error, {
        url: c.req.url,
        method: c.req.method,
        headers: {
          "content-type": c.req.header("content-type"),
          "x-slack-signature": c.req.header("x-slack-signature")
            ? "present"
            : "missing",
          "x-slack-request-timestamp": c.req.header(
            "x-slack-request-timestamp",
          ),
        },
        bodyType: parsedBody?.type,
        eventType: parsedBody?.event?.type,
        teamId: parsedBody?.team_id,
        userId: parsedBody?.event?.user,
        messagePreview: parsedBody?.event?.text?.substring(0, 100),
      });

      // Return more specific error messages based on error type
      let statusCode = 500;
      let errorMessage = "Internal server error";

      if (error instanceof Error) {
        if (
          error.message.includes("duplicate key") ||
          error.message.includes("unique constraint")
        ) {
          // For duplicate messages, return success to prevent Slack retries
          logger.info(
            "Returning success for duplicate message to prevent Slack retries",
          );
          return c.json({ ok: true });
        } else if (
          error.message.includes("authentication") ||
          error.message.includes("unauthorized")
        ) {
          statusCode = 401;
          errorMessage = "Authentication failed";
        } else if (error.message.includes("validation")) {
          statusCode = 400;
          errorMessage = "Invalid request";
        }
      }

      return c.json(
        { ok: false, error: errorMessage },
        statusCode as 400 | 401 | 500,
      );
    }
  });

  // Slack OAuth endpoints
  app.get("/oauth/slack/install", async (c) => {
    const tenantId = c.req.header("x-tenant-id") || c.req.query("tenantId");

    if (!tenantId) {
      return c.json({ error: "Tenant ID required" }, 401);
    }

    try {
      const authUrl = await generateSlackOAuthUrl(tenantId);
      return c.redirect(authUrl);
    } catch (error) {
      logger.error("Failed to generate Slack OAuth URL", {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        tenantId,
      });
      return c.json(
        {
          error: "Failed to initiate OAuth flow",
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  app.get("/oauth/slack/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      logger.warn("Slack OAuth cancelled", { error });
      return c.html(`
        <html>
          <body>
            <h1>Slack Installation Cancelled</h1>
            <p>${error}</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return c.json({ error: "Missing code or state" }, 400);
    }

    try {
      // Extract tenantId from state - it's encoded in the JWT state by Slack OAuth
      let tenantId: string | null = null;

      try {
        // Decode the JWT state to get the metadata
        const stateParts = state.split(".");
        if (stateParts.length < 2) {
          throw new Error("Invalid state format");
        }
        const decodedState = JSON.parse(
          Buffer.from(stateParts[1]!, "base64").toString(),
        );
        logger.info("Decoded state", {
          decodedState: JSON.stringify(decodedState, null, 2),
          hasInstallOptions: !!decodedState.installOptions,
          metadata: decodedState.installOptions?.metadata,
        });

        if (decodedState.installOptions?.metadata) {
          const metadata = JSON.parse(decodedState.installOptions.metadata);
          tenantId = metadata.tenantId;
          logger.info("Extracted tenantId from state", { tenantId });
        }
      } catch (stateError) {
        logger.warn("Failed to extract tenantId from state", {
          error:
            stateError instanceof Error
              ? stateError.message
              : String(stateError),
          state: `${state.substring(0, 100)}...`,
        });
      }

      if (!tenantId) {
        logger.error("No valid tenantId found in OAuth callback");
        return c.json(
          { error: "Invalid OAuth state - missing tenant information" },
          400,
        );
      }

      logger.info("Processing Slack OAuth callback", {
        code: `${code.substring(0, 10)}...`,
        tenantId,
        stateParam: `${state.substring(0, 50)}...`,
        tenantIdSource:
          tenantId === "default-tenant" ? "default" : "extracted from state",
      });

      const result = await completeSlackOAuth(code, state, tenantId);

      if (result.success) {
        return c.html(`
          <html>
            <body>
              <h1>Slack Installation Successful!</h1>
              <p>You can now close this window and return to FIGGY.</p>
              <script>
                // Post message to parent window if opened as popup
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'slack-oauth-success', 
                    workspaceId: '${result.workspaceId}' 
                  }, '*');
                }
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
      } else {
        return c.html(`
          <html>
            <body>
              <h1>Slack Installation Failed</h1>
              <p>${result.error}</p>
              <script>window.close();</script>
            </body>
          </html>
        `);
      }
    } catch (error) {
      logger.error("Slack OAuth callback error", { error });
      return c.json({ error: "OAuth callback failed" }, 500);
    }
  });

  // Slack account linking endpoint for team members
  app.get("/slack/link", async (c) => {
    const token = c.req.query("token");

    if (!token) {
      return c.html(`
        <html>
          <head>
            <title>Link Slack Account - Figgy</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                max-width: 500px;
                text-align: center;
              }
              h1 {
                color: #333;
                margin-bottom: 20px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              .error {
                background-color: #fee;
                color: #c33;
                padding: 20px;
                border-radius: 4px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Invalid Link</h1>
              <div class="error">
                <p>This link is invalid or has expired.</p>
              </div>
              <p>Please return to Slack and request a new link.</p>
            </div>
          </body>
        </html>
      `);
    }

    try {
      // Verify the linking token
      const tokenInfo = await verifyLinkingToken(token);

      if (!tokenInfo.valid) {
        return c.html(`
          <html>
            <head>
              <title>Link Slack Account - Figgy</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: 40px;
                  background-color: #f5f5f5;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                  max-width: 500px;
                  text-align: center;
                }
                h1 {
                  color: #333;
                  margin-bottom: 20px;
                }
                p {
                  color: #666;
                  line-height: 1.6;
                }
                .error {
                  background-color: #fee;
                  color: #c33;
                  padding: 20px;
                  border-radius: 4px;
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Link Expired</h1>
                <div class="error">
                  <p>This link has expired or has already been used.</p>
                </div>
                <p>Please return to Slack and request a new link.</p>
              </div>
            </body>
          </html>
        `);
      }

      // Store token info in session for after authentication
      // For now, we'll use a simple redirect with token in URL
      // In production, you'd want to use proper session management
      const webAppUrl =
        config.NODE_ENV === "production"
          ? process.env.PRODUCTION_APP_URL || "https://app.figgy.com"
          : "http://localhost:3000";

      // Redirect to web app for authentication
      return c.redirect(`${webAppUrl}/slack-link?token=${token}`);
    } catch (error) {
      logger.error("Slack link verification error", { error });
      return c.html(`
        <html>
          <head>
            <title>Link Slack Account - Figgy</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                max-width: 500px;
                text-align: center;
              }
              h1 {
                color: #333;
                margin-bottom: 20px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              .error {
                background-color: #fee;
                color: #c33;
                padding: 20px;
                border-radius: 4px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Error</h1>
              <div class="error">
                <p>An error occurred while processing your request.</p>
              </div>
              <p>Please try again or contact support.</p>
            </div>
          </body>
        </html>
      `);
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
        logError(logger, `tRPC error: ${error.message}`, error, {
          path,
          type,
          input,
          userId: ctx?.user?.id,
          tenantId: ctx?.tenantId,
          requestId: ctx?.requestId,
        });
      },
    }),
  );

  app.get("/health", async (c) => {
    const { checkDatabaseHealth, getConnectionStats } = await import(
      "@figgy/shared-db"
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
    logError(logger, "Unhandled error", err, {
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
