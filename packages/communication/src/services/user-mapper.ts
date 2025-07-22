import {
  and,
  type DrizzleClient,
  eq,
  getDatabaseConnection,
  slackUserMappings,
  slackWorkspaces,
  whatsappMappings,
} from "@figgy/shared-db";
import { logger } from "@figgy/utils";

export interface UserMappingResult {
  tenantId: string;
  userId: string;
}

export interface UserMappingError {
  error: string;
  details?: Record<string, unknown>;
}

export class UserMapperService {
  private db: DrizzleClient;

  constructor(databaseUrl: string) {
    this.db = getDatabaseConnection(databaseUrl);
  }

  /**
   * Look up user by WhatsApp phone number
   * @param phoneNumber - E.164 formatted phone number
   * @returns User mapping result or error
   */
  async lookupWhatsAppUser(
    phoneNumber: string,
  ): Promise<UserMappingResult | UserMappingError> {
    try {
      // Normalize phone number to E.164 format if needed
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      logger.info("Looking up WhatsApp user", { phoneNumber: normalizedPhone });

      const result = await this.db
        .select({
          tenantId: whatsappMappings.tenantId,
          userId: whatsappMappings.userId,
        })
        .from(whatsappMappings)
        .where(eq(whatsappMappings.phoneNumber, normalizedPhone))
        .limit(1);

      if (result.length === 0) {
        logger.warn("WhatsApp user not found", {
          phoneNumber: normalizedPhone,
        });
        return {
          error: "User not registered",
          details: {
            phoneNumber: normalizedPhone,
            platform: "whatsapp",
          },
        };
      }

      const mapping = result[0]!;
      logger.info("WhatsApp user found", {
        phoneNumber: normalizedPhone,
        tenantId: mapping.tenantId,
        userId: mapping.userId,
      });

      return {
        tenantId: mapping.tenantId,
        userId: mapping.userId,
      };
    } catch (error) {
      logger.error("Error looking up WhatsApp user", { error, phoneNumber });
      return {
        error: "Failed to lookup user",
        details: {
          phoneNumber,
          platform: "whatsapp",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Look up user by Slack workspace and user ID
   * @param workspaceId - Slack workspace/team ID
   * @param slackUserId - Slack user ID
   * @returns User mapping result or error
   */
  async lookupSlackUser(
    workspaceId: string,
    slackUserId: string,
  ): Promise<UserMappingResult | UserMappingError> {
    try {
      logger.info("Looking up Slack user", { workspaceId, slackUserId });

      // First, verify the workspace exists and get tenant ID
      const workspaceResult = await this.db
        .select({
          tenantId: slackWorkspaces.tenantId,
        })
        .from(slackWorkspaces)
        .where(eq(slackWorkspaces.workspaceId, workspaceId))
        .limit(1);

      if (workspaceResult.length === 0) {
        logger.warn("Slack workspace not found", { workspaceId });
        return {
          error: "Workspace not registered",
          details: {
            workspaceId,
            platform: "slack",
          },
        };
      }

      const tenantId = workspaceResult[0]!.tenantId;

      // Look up user mapping
      const userResult = await this.db
        .select({
          userId: slackUserMappings.userId,
        })
        .from(slackUserMappings)
        .where(
          and(
            eq(slackUserMappings.workspaceId, workspaceId),
            eq(slackUserMappings.slackUserId, slackUserId),
          ),
        )
        .limit(1);

      if (userResult.length === 0) {
        logger.warn("Slack user not found", { workspaceId, slackUserId });
        return {
          error: "User not registered",
          details: {
            workspaceId,
            slackUserId,
            platform: "slack",
          },
        };
      }

      const userId = userResult[0]!.userId;
      logger.info("Slack user found", {
        workspaceId,
        slackUserId,
        tenantId,
        userId,
      });

      return {
        tenantId,
        userId,
      };
    } catch (error) {
      logger.error("Error looking up Slack user", {
        error,
        workspaceId,
        slackUserId,
      });
      return {
        error: "Failed to lookup user",
        details: {
          workspaceId,
          slackUserId,
          platform: "slack",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Get Slack bot token for a workspace
   * @param workspaceId - Slack workspace/team ID
   * @returns Bot token or null if not found
   */
  async getSlackBotToken(workspaceId: string): Promise<string | null> {
    try {
      const result = await this.db
        .select({
          botToken: slackWorkspaces.botToken,
        })
        .from(slackWorkspaces)
        .where(eq(slackWorkspaces.workspaceId, workspaceId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return result[0]!.botToken;
    } catch (error) {
      logger.error("Error getting Slack bot token", { error, workspaceId });
      return null;
    }
  }

  /**
   * Normalize phone number to E.164 format
   * @param phoneNumber - Phone number in various formats
   * @returns E.164 formatted phone number
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Add + prefix if not present
    if (!phoneNumber.startsWith("+")) {
      cleaned = "+" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }

    return cleaned;
  }

  /**
   * Check if error result
   */
  static isError(
    result: UserMappingResult | UserMappingError,
  ): result is UserMappingError {
    return "error" in result;
  }
}
