import { getConfig } from "@figgy/config";
import { and, eq, slackUserMappings } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { WebClient } from "@slack/web-api";
import { getDb } from "../db";
import {
  createSlackUserTenantMapping,
  findAvailableTenantsForSlackUser,
  generateLinkingToken,
  getUserAvailableTenants,
  getUserTenantContext,
  setUserTenantContext,
  type TenantContext,
} from "../operations/slack-tenant-context";
import type { ProcessingResult } from "../types";
import { SlackCommandParser, SlackCommandType } from "./slack-command-parser";

const logger = createLogger("slack-multi-tenant-handler");

export interface SlackAuthResult {
  authenticated: boolean;
  tenantId?: string;
  userId?: string;
  requiresSetup?: boolean;
  setupMessage?: string;
  availableTenants?: TenantContext[];
}

export class SlackMultiTenantHandler {
  constructor() {
    // Response service instantiated when needed
  }

  /**
   * Handle Slack authentication with multi-tenant support
   */
  async authenticateSlackUser(
    workspaceId: string,
    slackUserId: string,
    conversationId: string,
    messageText: string,
  ): Promise<SlackAuthResult> {
    try {
      // Parse command first
      const command = SlackCommandParser.parse(messageText);

      // Get user's available tenants
      const availableTenants = await getUserAvailableTenants(
        slackUserId,
        workspaceId,
      );

      if (availableTenants.length === 0) {
        // User not set up yet - need to link account
        // Generate a manual linking URL
        const config = getConfig().getCore();
        const linkingToken = await generateLinkingToken(
          slackUserId,
          workspaceId,
        );
        const linkingUrl = `${config.BASE_URL}/slack/link?token=${linkingToken}`;

        return {
          authenticated: false,
          requiresSetup: true,
          setupMessage: [
            "Welcome to Figgy! 👋",
            "",
            "I need to link your Slack account to get started.",
            "",
            "*Option 1: Quick Link*",
            `Click here to connect your account: ${linkingUrl}`,
            "(Link expires in 15 minutes)",
            "",
            "*Option 2: Ask Admin*",
            "Contact your administrator to grant you access to Figgy",
            "",
            "Once connected, you can start using Figgy right here in Slack!",
          ].join("\n"),
        };
      }

      // Get current context
      let currentContext = await getUserTenantContext(
        slackUserId,
        workspaceId,
        conversationId,
      );

      // Handle tenant commands
      if (command.type === SlackCommandType.LIST_TENANTS) {
        const listMessage = SlackCommandParser.formatTenantList(
          availableTenants,
          currentContext?.tenantId,
        );
        return {
          authenticated: false,
          requiresSetup: true,
          setupMessage: listMessage,
        };
      }

      if (command.type === SlackCommandType.HELP) {
        return {
          authenticated: false,
          requiresSetup: true,
          setupMessage: SlackCommandParser.getHelpText(),
        };
      }

      if (command.type === SlackCommandType.CURRENT_TENANT) {
        if (!currentContext) {
          return {
            authenticated: false,
            requiresSetup: true,
            setupMessage:
              "No organization selected. " +
              SlackCommandParser.formatTenantList(availableTenants),
          };
        }
        return {
          authenticated: false,
          requiresSetup: true,
          setupMessage: SlackCommandParser.formatCurrentTenant(
            currentContext.tenantName,
            currentContext.tenantSlug,
          ),
        };
      }

      if (command.type === SlackCommandType.SWITCH_TENANT && command.tenant) {
        // Find tenant by slug or name
        const targetTenant = availableTenants.find(
          (t) =>
            t.tenantSlug === command.tenant ||
            t.tenantName.toLowerCase() === command.tenant?.toLowerCase(),
        );

        if (!targetTenant) {
          return {
            authenticated: false,
            requiresSetup: true,
            setupMessage: SlackCommandParser.formatNoAccessError(
              command.tenant,
            ),
          };
        }

        // Switch context
        await setUserTenantContext(
          slackUserId,
          workspaceId,
          conversationId,
          targetTenant.tenantId,
        );

        const confirmMessage = SlackCommandParser.formatSwitchConfirmation(
          targetTenant.tenantName,
          targetTenant.tenantSlug,
        );

        // If there's a query after the switch, process it
        if (command.query) {
          return {
            authenticated: true,
            tenantId: targetTenant.tenantId,
            userId: slackUserId, // This should be the actual FIGGY user ID
            // The query will be processed by the message router
          };
        }

        return {
          authenticated: false,
          requiresSetup: true,
          setupMessage: confirmMessage,
        };
      }

      // No current context and this is a query
      if (!currentContext) {
        if (availableTenants.length === 1) {
          // Auto-select if only one tenant
          const singleTenant = availableTenants[0];
          if (!singleTenant) {
            return {
              authenticated: false,
              requiresSetup: true,
              setupMessage:
                "No organizations available. Please contact your administrator.",
            };
          }

          currentContext = singleTenant;
          await setUserTenantContext(
            slackUserId,
            workspaceId,
            conversationId,
            currentContext.tenantId,
          );
        } else {
          // Need to select a tenant
          return {
            authenticated: false,
            requiresSetup: true,
            setupMessage: `Please select an organization first:\n\n${SlackCommandParser.formatTenantList(availableTenants)}`,
            availableTenants,
          };
        }
      }

      // Ensure we have a valid context at this point
      if (!currentContext) {
        return {
          authenticated: false,
          requiresSetup: true,
          setupMessage:
            "Unable to determine organization context. Please try again.",
        };
      }

      // Get the actual FIGGY user ID from the mapping
      const db = getDb();
      const mapping = await db
        .select({
          userId: slackUserMappings.userId,
        })
        .from(slackUserMappings)
        .where(
          and(
            eq(slackUserMappings.slackUserId, slackUserId),
            eq(slackUserMappings.workspaceId, workspaceId),
            eq(slackUserMappings.tenantId, currentContext.tenantId),
          ),
        )
        .limit(1);

      if (!mapping[0]) {
        logger.error(
          {
            slackUserId,
            workspaceId,
            tenantId: currentContext.tenantId,
          },
          "No user mapping found for authenticated user",
        );

        return {
          authenticated: false,
          requiresSetup: true,
          setupMessage:
            "Your account needs to be re-linked. Please contact support.",
        };
      }

      return {
        authenticated: true,
        tenantId: currentContext.tenantId,
        userId: mapping[0].userId,
      };
    } catch (error) {
      logger.error(
        { error, workspaceId, slackUserId },
        "Slack authentication error",
      );
      return {
        authenticated: false,
        requiresSetup: true,
        setupMessage:
          "An error occurred during authentication. Please try again.",
      };
    }
  }

  /**
   * Set up new Slack user with email verification
   */
  async setupNewSlackUser(
    workspaceId: string,
    slackUserId: string,
    botToken: string,
  ): Promise<ProcessingResult> {
    try {
      logger.info(
        { workspaceId, slackUserId },
        "Starting auto-link for Slack user",
      );

      // Get Slack user info
      const client = new WebClient(botToken);
      logger.info("Fetching Slack user info...");
      const userInfo = await client.users.info({ user: slackUserId });

      if (!userInfo.ok || !userInfo.user?.profile?.email) {
        logger.error(
          {
            ok: userInfo.ok,
            hasUser: !!userInfo.user,
            hasProfile: !!userInfo.user?.profile,
            hasEmail: !!userInfo.user?.profile?.email,
            error: (userInfo as any).error,
          },
          "Failed to get Slack user info",
        );
        return {
          success: false,
          error:
            "Could not retrieve your Slack profile. Please ensure the Figgy app has necessary permissions.",
        };
      }

      const slackEmail = userInfo.user.profile.email;
      const slackName =
        userInfo.user.profile.real_name ||
        userInfo.user.profile.display_name ||
        "there";

      logger.info(
        {
          slackEmail,
          slackName,
          slackUserId,
          workspaceId,
        },
        "Got Slack user info",
      );

      // Find available tenants for this email
      logger.info(
        { slackEmail, workspaceId },
        "Finding available tenants for email",
      );
      const userAccess = await findAvailableTenantsForSlackUser(
        slackEmail,
        workspaceId,
      );

      logger.info(
        {
          hasAccess: !!userAccess,
          tenantCount: userAccess?.tenants?.length || 0,
          userId: userAccess?.userId,
        },
        "User access result",
      );

      if (!userAccess || userAccess.tenants.length === 0) {
        logger.warn({ slackEmail }, "No tenants found for user email");

        // Generate a manual linking URL
        const config = getConfig().getCore();
        const linkingToken = await generateLinkingToken(
          slackUserId,
          workspaceId,
          slackEmail,
        );
        const linkingUrl = `${config.BASE_URL}/slack/link?token=${linkingToken}`;

        const linkMessage = [
          `Hello ${slackName}! I couldn't find a Figgy account for ${slackEmail}.`,
          "",
          "To connect your account:",
          `1. Click here to link your account: ${linkingUrl}`,
          "2. Or ask your administrator to invite you to Figgy",
          "",
          "Once linked, you'll be able to use all Figgy features through Slack!",
        ].join("\n");

        return {
          success: true, // Change to true so the message is sent
          metadata: {
            responseText: linkMessage,
            skipNLQ: true,
          },
        };
      }

      // Create mappings for all available tenants
      for (const tenant of userAccess.tenants) {
        await createSlackUserTenantMapping(
          slackUserId,
          workspaceId,
          userAccess.userId,
          tenant.tenantId,
        );
      }

      const firstTenant = userAccess.tenants[0];
      const welcomeMessage = [
        `Hello ${slackName}! Your Slack account has been linked to Figgy. 🎉`,
        "",
        userAccess.tenants.length === 1 && firstTenant
          ? `You have access to: *${firstTenant.tenantName}*`
          : SlackCommandParser.formatTenantList(userAccess.tenants),
        "",
        "You can now start sending me your invoices, receipts, and financial questions!",
        "",
        "Try asking:\n• 'Show this month's revenue'\n• 'What invoices are unpaid?'\n• 'Help' for more commands",
      ].join("\n");

      return {
        success: true,
        metadata: {
          responseText: welcomeMessage,
        },
      };
    } catch (error) {
      logger.error({ error }, "Failed to setup Slack user");
      return {
        success: true, // Return true so error message is sent to user
        metadata: {
          responseText:
            "Failed to set up your account. Please try again later.",
          skipNLQ: true,
        },
      };
    }
  }

  /**
   * Format response with tenant context
   */
  formatResponseWithContext(
    response: string,
    tenantContext: TenantContext,
    isDirectMessage: boolean,
  ): string {
    if (isDirectMessage && tenantContext) {
      // Add subtle tenant badge in DMs
      return `_[${tenantContext.tenantName}]_ ${response}`;
    }
    return response;
  }
}
