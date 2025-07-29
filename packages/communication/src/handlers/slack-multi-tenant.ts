// Note: communicationMessages and getDb imports removed - duplicate handling moved to storeMessage()
import { createLogger } from "@figgy/utils";
import { createSlackHandler, createUserMapper } from "../handlers";
import { SlackMessageHandler } from "../handlers/slack.handler";
import { MessageProcessingError } from "../interfaces/message-handler";
import { getUserAvailableTenants } from "../operations/slack-tenant-context";
import { SlackMultiTenantHandler } from "../services/slack-multi-tenant-handler";
import type { ProcessingResult } from "../types";

const logger = createLogger("slack-multi-tenant-webhook");

/**
 * Handle Slack webhook with multi-tenant support
 */
export async function handleSlackMultiTenantWebhook(
  payload: unknown,
): Promise<ProcessingResult | { challenge: string }> {
  // Define variables at function scope for error handling
  let workspaceId: string | undefined;
  let slackUserId: string | undefined;
  let channelId: string | undefined;

  try {
    // Check if this is a URL verification challenge
    const verificationResponse =
      SlackMessageHandler.handleUrlVerification(payload);
    if (verificationResponse) {
      return verificationResponse;
    }

    // Parse webhook payload
    const parseResult =
      SlackMessageHandler.parseWebhookPayloadWithResult(payload);

    // Handle skipped messages (like bot messages)
    if (parseResult.skipped) {
      logger.info("Slack message skipped", {
        reason: parseResult.skipReason,
      });
      // Return success to prevent Slack retries
      return {
        success: true,
        metadata: {
          skipped: true,
          skipReason: parseResult.skipReason,
        },
      };
    }

    const messagePayload = parseResult.payload;
    if (!messagePayload) {
      return {
        success: false,
        error: "Invalid Slack event payload",
      };
    }

    // Note: Duplicate detection is now handled atomically in storeMessage()
    // via database upsert, eliminating race conditions

    workspaceId = messagePayload.metadata?.workspaceId as string;
    slackUserId = messagePayload.sender;
    channelId = messagePayload.metadata?.channelId as string;
    const isDM = channelId?.startsWith("D"); // Direct messages start with D

    if (!workspaceId) {
      logger.error({}, "No workspace ID in Slack payload");
      return {
        success: false,
        error: "Missing workspace information",
      };
    }

    // Get bot token for this workspace
    const mapper = await createUserMapper();
    const botToken = await mapper.getSlackBotToken(workspaceId);

    if (!botToken) {
      logger.error(
        {
          workspaceId,
          message:
            "Workspace needs OAuth setup. Admin should visit /oauth/slack/install?tenantId=TENANT_ID to complete installation.",
        },
        "No bot token found for workspace",
      );
      // We can't send a response without a bot token
      // The Events API doesn't support synchronous responses
      return {
        success: false,
        error:
          "Figgy not configured. Admin needs to install Figgy at /oauth/slack/install?tenantId=YOUR_TENANT_ID",
      };
    }

    // Multi-tenant authentication
    const multiTenantHandler = new SlackMultiTenantHandler();

    // Check if user has any tenant mappings first
    const availableTenants = await getUserAvailableTenants(
      slackUserId,
      workspaceId,
    );

    // Declare authentication variables at outer scope
    let authenticated: boolean;
    let tenantId: string | undefined;
    let userId: string | undefined;

    // If no tenants, try auto-linking by email first
    if (availableTenants.length === 0) {
      logger.info(
        { slackUserId, workspaceId },
        "New Slack user detected, attempting auto-link",
      );

      let setupResult;
      try {
        setupResult = await multiTenantHandler.setupNewSlackUser(
          workspaceId,
          slackUserId,
          botToken,
        );
      } catch (setupError) {
        logger.error(
          {
            err: setupError,
            workspaceId,
            slackUserId,
          },
          "Auto-link failed with error",
        );
        return {
          success: false,
          error: `Auto-link failed: ${setupError instanceof Error ? setupError.message : "Unknown error"}`,
        };
      }

      // If auto-linking succeeded, continue with normal authentication
      if (setupResult.success) {
        // Re-authenticate now that user is linked
        const authResult = await multiTenantHandler.authenticateSlackUser(
          workspaceId,
          slackUserId,
          channelId,
          messagePayload.content || "",
        );

        // If still requires setup (e.g., needs to select tenant), handle that
        if (authResult.requiresSetup) {
          return {
            success: true,
            metadata: {
              responseText: authResult.setupMessage,
              skipNLQ: true,
            },
          };
        }

        // Otherwise continue with normal flow
        if (!authResult.authenticated || !authResult.tenantId) {
          return {
            success: false,
            error: "Authentication failed after auto-linking",
          };
        }

        // Set authenticated and tenantId for the rest of the flow
        authenticated = authResult.authenticated;
        tenantId = authResult.tenantId;
        userId = authResult.userId;
      } else {
        // Auto-linking failed, return setup message
        return setupResult;
      }
    } else {
      // User has tenants, proceed with normal authentication
      const authResult = await multiTenantHandler.authenticateSlackUser(
        workspaceId,
        slackUserId,
        channelId,
        messagePayload.content || "",
      );

      // Handle setup messages (tenant selection, help, etc.)
      if (authResult.requiresSetup) {
        return {
          success: true,
          metadata: {
            responseText: authResult.setupMessage,
            skipNLQ: true,
          },
        };
      }

      if (!authResult.authenticated || !authResult.tenantId) {
        return {
          success: false,
          error: "Authentication failed",
        };
      }

      authenticated = authResult.authenticated;
      tenantId = authResult.tenantId;
      userId = authResult.userId;
    }

    // Variables should be defined from either branch above
    if (!authenticated || !tenantId || !userId) {
      logger.error(
        {
          authenticated,
          tenantId,
          userId,
          workspaceId,
          slackUserId,
        },
        "Authentication variables missing",
      );
      return {
        success: false,
        error: "Authentication failed",
        requiresRegistration: true,
      };
    }

    logger.info(
      {
        authenticated,
        tenantId,
        userId,
        workspaceId,
        slackUserId,
        messageContent: messagePayload.content?.substring(0, 50),
      },
      "User authenticated, processing message",
    );

    // Validate the payload
    const handler = createSlackHandler();
    logger.info("Validating Slack payload");

    let validation;
    try {
      validation = await handler.validate(messagePayload);
    } catch (validationError) {
      logger.error(
        {
          err: validationError,
        },
        "Validation threw error",
      );
      throw validationError;
    }

    if (!validation.isValid) {
      logger.warn(
        {
          errors: validation.errors,
          messageId: messagePayload.messageId,
        },
        "Slack payload validation failed",
      );
      return {
        success: false,
        error: `Validation failed: ${validation.errors?.join(", ")}`,
      };
    }

    logger.info("Processing message with handler");

    // Process the message with authenticated user info
    let result;
    try {
      result = await handler.process(
        messagePayload,
        tenantId,
        userId,
        botToken, // Pass bot token for file downloads
      );
    } catch (processError) {
      logger.error(
        {
          err: processError,
          tenantId,
          userId,
          messageContent: messagePayload.content,
        },
        "Handler.process threw error",
      );
      throw processError;
    }

    // Add tenant context to response if in DM
    if (result.success && result.metadata?.responseText && isDM) {
      // The response formatter will handle adding tenant badges
      result.metadata.isDM = true;
      result.metadata.tenantId = tenantId;
    }

    return result;
  } catch (error) {
    if (error instanceof MessageProcessingError) {
      logger.error(
        {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        "Slack processing error",
      );
      return {
        success: false,
        error: error.message,
      };
    }

    logger.error(
      {
        err: error,
        workspaceId,
        slackUserId,
        channelId,
      },
      "Slack webhook error",
    );
    return {
      success: false,
      error: "Internal server error",
    };
  }
}
