import { webhookHandler } from "@figgy/email-ingestion";
import { createLogger } from "@figgy/utils";
import { Hono } from "hono";

const logger = createLogger("email-webhooks");

export const emailWebhookRoutes = new Hono();

/**
 * Gmail webhook endpoint (Google Pub/Sub)
 */
emailWebhookRoutes.post("/webhook/gmail", async (c) => {
  try {
    const body = await c.req.json();
    
    logger.info("Received Gmail webhook", {
      messageId: body?.message?.messageId,
    });
    
    await webhookHandler.handleGmailWebhook(body);
    
    return c.json({ success: true });
  } catch (error) {
    logger.error("Failed to handle Gmail webhook", { error });
    return c.json({ error: "Failed to process webhook" }, 500);
  }
});

/**
 * Outlook webhook endpoint (Microsoft Graph)
 */
emailWebhookRoutes.post("/webhook/outlook", async (c) => {
  try {
    // Check for validation token (subscription validation)
    const validationToken = c.req.query("validationToken");
    
    if (validationToken) {
      logger.info("Outlook webhook validation request");
      return c.text(validationToken);
    }
    
    const body = await c.req.json();
    
    logger.info("Received Outlook webhook", {
      notificationCount: body?.value?.length || 0,
    });
    
    await webhookHandler.handleOutlookWebhook(body);
    
    return c.json({ success: true });
  } catch (error) {
    logger.error("Failed to handle Outlook webhook", { error });
    return c.json({ error: "Failed to process webhook" }, 500);
  }
});

/**
 * OAuth callback endpoint
 * This would typically be handled by the frontend, but included here for reference
 */
emailWebhookRoutes.get("/oauth/callback", async (c) => {
  const provider = c.req.query("provider");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  
  if (error) {
    logger.error("OAuth error", { provider, error });
    return c.redirect(`/settings/integrations/email?error=${encodeURIComponent(error)}`);
  }
  
  if (!code || !state) {
    return c.redirect("/settings/integrations/email?error=missing_parameters");
  }
  
  // Redirect to frontend with code and state
  const params = new URLSearchParams({
    provider: provider || "",
    code,
    state,
  });
  
  return c.redirect(`/settings/integrations/email/callback?${params}`);
});