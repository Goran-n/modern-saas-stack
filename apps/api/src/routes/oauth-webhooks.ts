import { Hono } from "hono";
import { getConfig } from "@figgy/config";
import { getDatabaseConnection } from "@figgy/shared-db";
import { oauthConnections } from "@figgy/shared-db/schemas";
import { eq } from "drizzle-orm";
import { getOAuthProviderRegistry, getOAuthEncryptionService } from "@figgy/oauth";
import { createLogger } from "@figgy/utils";

export const oauthWebhookRoutes = new Hono();

/**
 * Generic OAuth webhook handler
 * Route: /api/oauth/webhook/:provider
 */
oauthWebhookRoutes.post("/webhook/:provider", async (c) => {
  const provider = c.req.param("provider");
  const providerRegistry = getOAuthProviderRegistry();
  const oauthProvider = providerRegistry.get(provider);

  if (!oauthProvider) {
    return c.json({ error: "Unknown provider" }, 404);
  }

  if (!oauthProvider.supportsWebhooks) {
    return c.json({ error: "Provider does not support webhooks" }, 400);
  }

  try {
    // Handle webhook validation (Microsoft Graph requires this)
    const validationToken = c.req.query("validationToken");
    if (validationToken) {
      console.log(`Webhook validation for ${provider}:`, validationToken);
      // Microsoft Graph expects the validation token to be returned as plain text
      return c.text(validationToken, 200);
    }

    // Get webhook payload
    const payload = await c.req.json();
    
    // Log webhook receipt for debugging
    console.log(`Webhook received for ${provider}:`, {
      hasValue: !!payload.value,
      valueCount: Array.isArray(payload.value) ? payload.value.length : 0,
      type: payload.type,
    });

    // Provider-specific webhook handling
    switch (provider) {
      case "outlook":
      case "gmail":
        await handleEmailWebhook(provider, payload);
        break;
      case "slack":
        await handleSlackWebhook(payload);
        break;
      default:
        console.log(`Unhandled webhook for provider: ${provider}`, payload);
    }

    // Microsoft Graph expects 202 Accepted for notifications
    if (provider === "outlook") {
      return c.text("", 202);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error(`OAuth webhook error for ${provider}:`, error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

/**
 * Handle email webhooks (Gmail/Outlook)
 */
async function handleEmailWebhook(provider: string, payload: any) {
  const { createLogger } = await import("@figgy/utils");
  const logger = createLogger("oauth-webhook-handler");
  
  // Microsoft Graph webhook payload
  if (provider === "outlook" && payload.value && Array.isArray(payload.value)) {
    const encryptionService = getOAuthEncryptionService();
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);
    
    for (const notification of payload.value) {
      const { resource, changeType, subscriptionId, resourceData } = notification;
      
      try {
        // Find the OAuth connection by webhook subscription ID
        const [connection] = await db
          .select()
          .from(oauthConnections)
          .where(eq(oauthConnections.webhookId, subscriptionId))
          .limit(1);
        
        if (!connection) {
          logger.warn("No OAuth connection found for webhook", {
            subscriptionId,
            provider,
          });
          continue;
        }
        
        // Only process new email messages
        if (changeType === "created" && resource.includes("/messages/")) {
          // Extract message ID from resource path
          const messageIdMatch = resource.match(/messages\/([^/]+)/);
          if (!messageIdMatch) {
            logger.warn("Could not extract message ID from resource", {
              resource,
              subscriptionId,
            });
            continue;
          }
          
          const messageId = messageIdMatch[1];
          
          logger.info("Processing new email notification", {
            provider,
            changeType,
            messageId,
            connectionId: connection.id,
            tenantId: connection.tenantId,
          });
          
          // Import email ingestion handler
          const { webhookHandler } = await import("@figgy/communication-ingestion");
          
          // Trigger email processing through the email ingestion system
          // The email ingestion system will use the OAuth token to fetch the email
          await webhookHandler.handleOutlookWebhook({
            value: [{
              subscriptionId,
              changeType,
              resource,
              resourceData: resourceData || { id: messageId },
            }],
          });
        }
      } catch (error) {
        logger.error("Failed to process email webhook notification", {
          error,
          subscriptionId,
          changeType,
          resource,
        });
        // Continue processing other notifications even if one fails
      }
    }
  } else if (provider === "gmail") {
    // Gmail webhook handling would go here
    // Gmail uses Pub/Sub for webhooks, which has a different structure
    logger.info("Gmail webhook received", { payload });
  }
}

/**
 * Handle Slack webhooks
 */
async function handleSlackWebhook(payload: any) {
  // Slack URL verification
  if (payload.type === "url_verification") {
    return payload.challenge;
  }

  // Handle Slack events
  if (payload.event) {
    const { type, channel, text, user } = payload.event;
    
    console.log(`Slack webhook received - Type: ${type}, Channel: ${channel}, User: ${user}`);
    
    // TODO: Process Slack events based on your requirements
    // This could involve:
    // 1. Parsing messages for invoice/receipt attachments
    // 2. Responding to user commands
    // 3. Updating connection status
  }
}

/**
 * OAuth redirect handler (for providers that don't support front-end redirects)
 * Route: /api/oauth/redirect/:provider
 */
oauthWebhookRoutes.get("/redirect/:provider", async (c) => {
  const provider = c.req.param("provider");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  // Build the frontend callback URL
  const frontendUrl = getConfig().getCore().WEB_URL || "http://localhost:8010";
  const callbackUrl = new URL("/settings/integrations/oauth-callback", frontendUrl);
  
  // Forward all query parameters
  if (code) callbackUrl.searchParams.set("code", code);
  if (state) callbackUrl.searchParams.set("state", state);
  if (error) callbackUrl.searchParams.set("error", error);
  if (errorDescription) callbackUrl.searchParams.set("error_description", errorDescription);

  // Redirect to frontend
  return c.redirect(callbackUrl.toString());
});