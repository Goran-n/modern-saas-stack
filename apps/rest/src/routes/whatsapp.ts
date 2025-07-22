import { logger } from "@figgy/utils";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const whatsapp = new Hono();

// Webhook verification (GET)
whatsapp.get("/webhook", async (c) => {
  try {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");

    // TODO: Get WhatsApp verify token from config
    const verifyToken =
      process.env.WHATSAPP_VERIFY_TOKEN || "your_verify_token";

    if (mode === "subscribe" && token === verifyToken) {
      logger.info("WhatsApp webhook verified");
      return c.text(challenge || "");
    }

    throw new HTTPException(403, { message: "Forbidden" });
  } catch (error) {
    logger.error("WhatsApp webhook verification error:", error);
    throw error;
  }
});

// Webhook events (POST)
whatsapp.post("/webhook", async (c) => {
  try {
    const body = await c.req.json();

    // Process webhook asynchronously
    processWhatsAppWebhook(body).catch((err) => {
      logger.error("WhatsApp webhook processing error:", err);
    });

    // Immediately respond to WhatsApp
    return c.json({ status: "received" });
  } catch (error) {
    logger.error("WhatsApp webhook error:", error);
    throw new HTTPException(500, { message: "Webhook processing failed" });
  }
});

async function processWhatsAppWebhook(body: unknown) {
  // TODO: Implement WhatsApp webhook processing
  logger.info("WhatsApp webhook received:", body);
}

export default whatsapp;
