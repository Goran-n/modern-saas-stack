import {
  getSlackService,
  handleSlackMultiTenantWebhook,
  SlackResponseService,
} from "@figgy/communication";
import { logError, logger } from "@figgy/utils";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const slack = new Hono();

// Base webhook endpoint (for Slack events)
slack.post("/", async (c) => {
  logger.info("Slack webhook endpoint hit", {
    headers: {
      "content-type": c.req.header("content-type"),
      "x-slack-signature": c.req.header("x-slack-signature")
        ? "present"
        : "missing",
      "x-slack-request-timestamp": c.req.header("x-slack-request-timestamp"),
    },
  });

  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text();

    if (!rawBody) {
      logger.warn("Empty request body received from Slack");
      return c.json({ error: "Empty request body" }, 400);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      logger.error("Failed to parse Slack webhook body", {
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
        bodyLength: rawBody.length,
        bodyPreview: rawBody.substring(0, 200),
      });
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    // Verify Slack signature
    const signature = c.req.header("x-slack-signature");
    const timestamp = c.req.header("x-slack-request-timestamp");

    if (signature && timestamp) {
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
      type: body.type,
      event: body.event?.type,
    });

    let result;
    try {
      result = await handleSlackMultiTenantWebhook(body);
    } catch (handlerError) {
      // Log the specific handler error
      logger.error("Handler threw error", {
        error:
          handlerError instanceof Error
            ? handlerError.message
            : String(handlerError),
        stack: handlerError instanceof Error ? handlerError.stack : undefined,
        errorType: handlerError?.constructor?.name,
        eventType: body.event?.type,
        teamId: body.team_id,
        userId: body.event?.user,
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
      if (result.metadata?.responseText && body.event) {
        const workspaceId = body.team_id;
        const channelId = body.event.channel;
        const threadTs = body.event.thread_ts || body.event.ts;

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
        eventType: body.event?.type,
        teamId: body.team_id,
        userId: body.event?.user,
        text: body.event?.text?.substring(0, 100),
      });

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
        "x-slack-request-timestamp": c.req.header("x-slack-request-timestamp"),
      },
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

    return c.json({ ok: false, error: errorMessage }, statusCode as any);
  }
});

// OAuth callback
slack.get("/oauth/callback", async (c) => {
  try {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      logger.error("Slack OAuth error:", error);
      return c.redirect("/slack-install?error=" + error);
    }

    if (!code) {
      throw new HTTPException(400, { message: "Missing code parameter" });
    }

    // TODO: Implement Slack OAuth callback handling
    logger.info("Slack OAuth callback received", { code, state });

    // Redirect to success page
    return c.redirect("/slack-install?success=true");
  } catch (error) {
    logger.error("Slack OAuth callback error:", error);
    return c.redirect("/slack-install?error=oauth_failed");
  }
});

// Slash commands
slack.post("/commands", async (c) => {
  try {
    const body = await c.req.parseBody();

    // Verify Slack signature
    const signature = c.req.header("x-slack-signature");
    const timestamp = c.req.header("x-slack-request-timestamp");

    if (!signature || !timestamp) {
      throw new HTTPException(401, { message: "Missing Slack headers" });
    }

    // TODO: Implement Slack command handling
    logger.info("Slack command received", body);

    // Return acknowledgment
    return c.json({ text: "Command received" });
  } catch (error) {
    logger.error("Slack command error:", error);
    throw new HTTPException(500, { message: "Command processing failed" });
  }
});

// Interactive components (buttons, modals, etc.)
slack.post("/interactions", async (c) => {
  try {
    const body = await c.req.parseBody();
    const payload = JSON.parse(body.payload as string);

    // Verify Slack signature
    const signature = c.req.header("x-slack-signature");
    const timestamp = c.req.header("x-slack-request-timestamp");

    if (!signature || !timestamp) {
      throw new HTTPException(401, { message: "Missing Slack headers" });
    }

    // TODO: Implement Slack interaction handling
    logger.info("Slack interaction received", payload);

    // Return acknowledgment
    return c.json({ ok: true });
  } catch (error) {
    logger.error("Slack interaction error:", error);
    throw new HTTPException(500, { message: "Interaction processing failed" });
  }
});

// Events API
slack.post("/events", async (c) => {
  try {
    const body = await c.req.json();

    // URL verification challenge
    if (body.type === "url_verification") {
      return c.json({ challenge: body.challenge });
    }

    // Verify Slack signature
    const signature = c.req.header("x-slack-signature");
    const timestamp = c.req.header("x-slack-request-timestamp");

    if (!signature || !timestamp) {
      throw new HTTPException(401, { message: "Missing Slack headers" });
    }

    // TODO: Process event asynchronously
    logger.info("Slack event received", body);

    // Immediately respond to Slack
    return c.json({ ok: true });
  } catch (error) {
    logger.error("Slack event error:", error);
    throw new HTTPException(500, { message: "Event processing failed" });
  }
});

export default slack;
