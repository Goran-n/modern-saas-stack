import { getConfig } from "@figgy/config";
import { createLogger } from "@figgy/utils";
import { SlackMessageHandler } from "./handlers/slack.handler";
import { WhatsAppMessageHandler } from "./handlers/whatsapp.handler";
import { MessageProcessingError } from "./interfaces/message-handler";
import { UserMapperService } from "./services/user-mapper";
import type { ProcessingResult } from "./types";

const logger = createLogger("communication-handlers");

// Handler factory functions for dependency injection
export function createWhatsAppHandler(): WhatsAppMessageHandler {
  return new WhatsAppMessageHandler();
}

export function createSlackHandler(): SlackMessageHandler {
  return new SlackMessageHandler();
}

export async function createUserMapper(): Promise<UserMapperService> {
  const configManager = getConfig();
  // Config is validated during initialization
  await configManager.validate();
  const config = configManager.getCore();
  return new UserMapperService(config.DATABASE_URL);
}

/**
 * Handle incoming Twilio WhatsApp webhook
 * This function should be called from the API server's webhook endpoint
 */
export async function handleTwilioWhatsAppWebhook(
  payload: unknown,
): Promise<ProcessingResult> {
  try {
    // Parse webhook payload to platform-agnostic format
    const messagePayload = WhatsAppMessageHandler.parseWebhookPayload(payload);

    if (!messagePayload) {
      logger.error("Failed to parse WhatsApp webhook payload");
      return {
        success: false,
        error: "Invalid Twilio WhatsApp payload",
      };
    }

    // Look up user based on phone number
    const mapper = await createUserMapper();
    const userMapping = await mapper.lookupWhatsAppUser(messagePayload.sender);

    if (UserMapperService.isError(userMapping)) {
      logger.warn("WhatsApp user lookup failed", {
        phoneNumber: messagePayload.sender,
        error: userMapping.error,
        details: userMapping.details,
      });
      return {
        success: false,
        error: `User not registered: ${userMapping.error}`,
        requiresRegistration: true,
      };
    }

    // Validate the payload
    const handler = createWhatsAppHandler();
    const validation = await handler.validate(messagePayload);
    if (!validation.isValid) {
      logger.warn("WhatsApp payload validation failed", {
        errors: validation.errors,
        messageId: messagePayload.messageId,
      });
      return {
        success: false,
        error: `Validation failed: ${validation.errors?.join(", ")}`,
      };
    }

    // Process the message with looked up user info
    return await handler.process(
      messagePayload,
      userMapping.tenantId,
      userMapping.userId,
    );
  } catch (error) {
    if (error instanceof MessageProcessingError) {
      logger.error("WhatsApp processing error", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error("Unexpected error handling WhatsApp webhook", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle incoming Slack event webhook
 * This function should be called from the API server's webhook endpoint
 */
export async function handleSlackEventWebhook(
  payload: unknown,
): Promise<ProcessingResult | { challenge: string }> {
  try {
    // Check if this is a URL verification challenge
    const verificationResponse =
      SlackMessageHandler.handleUrlVerification(payload);
    if (verificationResponse) {
      return verificationResponse;
    }

    // Parse webhook payload to platform-agnostic format
    const messagePayload = SlackMessageHandler.parseWebhookPayload(payload);

    if (!messagePayload) {
      return {
        success: false,
        error: "Invalid Slack event payload",
      };
    }

    // Extract workspace ID and user ID from metadata
    const workspaceId = messagePayload.metadata?.workspaceId as string;
    const slackUserId = messagePayload.sender;

    if (!workspaceId) {
      logger.error("No workspace ID in Slack payload");
      return {
        success: false,
        error: "Missing workspace information",
      };
    }

    // Look up user based on Slack IDs
    const mapper = await createUserMapper();
    const userMapping = await mapper.lookupSlackUser(workspaceId, slackUserId);

    if (UserMapperService.isError(userMapping)) {
      logger.warn("Slack user lookup failed", {
        workspaceId,
        slackUserId,
        error: userMapping.error,
        details: userMapping.details,
      });
      return {
        success: false,
        error: `User not registered: ${userMapping.error}`,
        requiresRegistration: true,
      };
    }

    // Validate the payload
    const handler = createSlackHandler();
    const validation = await handler.validate(messagePayload);
    if (!validation.isValid) {
      logger.warn("Slack payload validation failed", {
        errors: validation.errors,
        messageId: messagePayload.messageId,
      });
      return {
        success: false,
        error: `Validation failed: ${validation.errors?.join(", ")}`,
      };
    }

    // Process the message with looked up user info
    return await handler.process(
      messagePayload,
      userMapping.tenantId,
      userMapping.userId,
    );
  } catch (error) {
    if (error instanceof MessageProcessingError) {
      logger.error("Slack processing error", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error("Unexpected error handling Slack webhook", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle WhatsApp verification challenge
 * Twilio sends a GET request to verify the webhook URL
 */
export function handleWhatsAppVerification(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  expectedToken: string,
): { verified: boolean; challenge?: string } {
  if (mode === "subscribe" && token === expectedToken && challenge) {
    logger.info("WhatsApp webhook verified");
    return { verified: true, challenge };
  }

  logger.warn("WhatsApp webhook verification failed", { mode, token });
  return { verified: false };
}

// Export the multi-tenant handler
export { handleSlackMultiTenantWebhook } from "./handlers/slack-multi-tenant";
