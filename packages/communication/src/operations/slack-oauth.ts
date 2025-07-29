import { getConfig } from "@figgy/config";
import { eq, slackWorkspaces } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { InstallProvider } from "@slack/oauth";
import { WebClient } from "@slack/web-api";
import { getDb } from "../db";

const logger = createLogger("slack-oauth-operations");

/**
 * Get Slack OAuth installer
 */
export function getSlackInstaller(): InstallProvider {
  const config = getConfig().getForCommunication();

  if (!config.SLACK_CLIENT_ID || !config.SLACK_CLIENT_SECRET) {
    logger.error("Slack OAuth credentials missing", {
      hasClientId: !!config.SLACK_CLIENT_ID,
      hasClientSecret: !!config.SLACK_CLIENT_SECRET,
      clientIdLength: config.SLACK_CLIENT_ID?.length || 0,
    });
    throw new Error("Slack OAuth credentials not configured");
  }

  if (!config.SLACK_SIGNING_SECRET) {
    logger.error("SLACK_SIGNING_SECRET is required for OAuth security");
    throw new Error("SLACK_SIGNING_SECRET not configured");
  }

  return new InstallProvider({
    clientId: config.SLACK_CLIENT_ID,
    clientSecret: config.SLACK_CLIENT_SECRET,
    stateSecret: config.SLACK_SIGNING_SECRET,
    // We'll handle installation storage ourselves
    installationStore: {
      storeInstallation: async (installation) => {
        // We handle this in completeSlackOAuth
        logger.info("Installation store called", {
          teamId: (installation as any).team?.id,
        });
      },
      fetchInstallation: async () => {
        // We don't need this for OAuth flow
        throw new Error("fetchInstallation not implemented");
      },
    },
  });
}

/**
 * Generate Slack OAuth URL
 */
export async function generateSlackOAuthUrl(tenantId: string): Promise<string> {
  const installer = getSlackInstaller();
  const config = getConfig().getCore();

  // Require BASE_URL to be configured
  if (!config.BASE_URL) {
    throw new Error(
      "BASE_URL environment variable is required for Slack OAuth. " +
        "Please set it to your API's public URL (e.g., http://localhost:5001 or https://api.yourdomain.com)",
    );
  }

  const redirectUri = `${config.BASE_URL}/oauth/slack/callback`;

  // Generate the URL with required scopes
  const url = await installer.generateInstallUrl({
    scopes: [
      // Messaging
      "chat:write",
      "chat:write.public",
      "chat:write.customize",

      // Reading
      "channels:read",
      "groups:read",
      "im:read",
      "mpim:read",
      "users:read",
      "users:read.email",

      // Events
      "app_mentions:read",
      "channels:history",
      "groups:history",
      "im:history",
      "mpim:history",

      // Files
      "files:read",

      // Reactions
      "reactions:write",
      "reactions:read",
    ],
    redirectUri,
    metadata: JSON.stringify({ tenantId }),
  });

  logger.info("Generated Slack OAuth URL", { tenantId, redirectUri });
  return url;
}

/**
 * Complete Slack OAuth flow
 */
export async function completeSlackOAuth(
  code: string,
  _state: string,
  tenantId: string,
): Promise<{ success: boolean; workspaceId?: string; error?: string }> {
  const config = getConfig().getForCommunication();
  const coreConfig = getConfig().getCore();

  try {
    // Require BASE_URL to be configured
    if (!coreConfig.BASE_URL) {
      throw new Error(
        "BASE_URL environment variable is required for Slack OAuth. " +
          "Please set it to your API's public URL (e.g., http://localhost:5001 or https://api.yourdomain.com)",
      );
    }

    const redirectUri = `${coreConfig.BASE_URL}/oauth/slack/callback`;

    logger.info("OAuth callback using redirect URI", { redirectUri });

    // Use the oauth.v2.access method directly since we're not using HTTP request/response objects
    const oauthClient = new WebClient();

    logger.info("Exchanging code for access token", {
      clientId: config.SLACK_CLIENT_ID,
      codePrefix: `${code.substring(0, 20)}...`,
      redirectUri,
    });

    const result = await oauthClient.oauth.v2.access({
      client_id: config.SLACK_CLIENT_ID!,
      client_secret: config.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    });

    const installation = result as any;

    logger.info("OAuth access response", {
      ok: result.ok,
      hasBot: !!installation?.bot,
      hasBotToken: !!installation?.bot?.token,
      hasTeam: !!installation?.team,
      hasTeamId: !!installation?.team?.id,
      responseKeys: Object.keys(installation || {}),
    });

    // Handle OAuth v2 response structure
    if (
      !installation?.access_token ||
      !installation?.team?.id ||
      !installation?.bot_user_id
    ) {
      logger.error(
        "Invalid installation response structure - missing required fields",
        {
          hasAccessToken: !!installation?.access_token,
          hasTeamId: !!installation?.team?.id,
          hasBotUserId: !!installation?.bot_user_id,
          installation: JSON.stringify(installation, null, 2),
        },
      );
      throw new Error(
        "Invalid installation response - missing bot token, team ID, or bot user ID",
      );
    }

    logger.info("Getting database connection...");
    const db = getDb();

    logger.info("Checking for existing workspace", {
      workspaceId: installation.team.id,
      tenantId,
    });

    // Check if workspace already exists
    const existing = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.workspaceId, installation.team.id))
      .limit(1);

    try {
      if (existing.length > 0) {
        logger.info("Workspace exists, updating...", {
          workspaceId: installation.team.id,
        });

        // Update existing workspace
        await db
          .update(slackWorkspaces)
          .set({
            botToken: installation.access_token,
            botUserId: installation.bot_user_id,
            updatedAt: new Date(),
          })
          .where(eq(slackWorkspaces.workspaceId, installation.team.id));

        logger.info("Updated existing Slack workspace", {
          workspaceId: installation.team.id,
          tenantId,
        });
      } else {
        logger.info("Creating new workspace...", {
          workspaceId: installation.team.id,
          tenantId,
          tenantIdType: typeof tenantId,
          tenantIdLength: tenantId?.length,
          botUserId: installation.bot_user_id,
        });

        // Create new workspace
        await db.insert(slackWorkspaces).values({
          workspaceId: installation.team.id,
          tenantId,
          botToken: installation.access_token,
          botUserId: installation.bot_user_id,
        });

        logger.info("Created new Slack workspace", {
          workspaceId: installation.team.id,
          tenantId,
        });
      }
    } catch (dbError) {
      logger.error("Database operation failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        errorStack: dbError instanceof Error ? dbError.stack : undefined,
        workspaceId: installation.team.id,
        tenantId,
      });
      throw new Error(
        `Failed to save Slack workspace: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
      );
    }

    // Fetch workspace info using the bot token
    const workspaceClient = new WebClient(installation.access_token);
    try {
      const teamInfo = await workspaceClient.team.info();
      if (teamInfo.ok && teamInfo.team) {
        // You could store team name and other info here
        logger.info("Fetched team info", {
          teamName: (teamInfo.team as any).name,
          teamId: (teamInfo.team as any).id,
        });
      }
    } catch (error) {
      logger.warn("Failed to fetch team info", { error });
    }

    return {
      success: true,
      workspaceId: installation.team.id,
    };
  } catch (error) {
    logger.error("Failed to complete Slack OAuth", {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      code: `${code.substring(0, 10)}...`,
      tenantId,
      clientIdLength: config.SLACK_CLIENT_ID?.length,
      hasClientSecret: !!config.SLACK_CLIENT_SECRET,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "OAuth failed",
    };
  }
}

/**
 * Refresh Slack token if needed
 */
export async function refreshSlackToken(
  workspaceId: string,
): Promise<{ success: boolean; error?: string }> {
  // Slack bot tokens don't expire, but this is here for future use
  // if we implement user tokens that do expire
  logger.info("Slack bot tokens don't expire", { workspaceId });
  return { success: true };
}

/**
 * Remove Slack workspace
 */
export async function removeSlackWorkspace(
  workspaceId: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();

    // Verify workspace belongs to tenant
    const workspace = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.workspaceId, workspaceId))
      .limit(1);

    if (!workspace[0] || workspace[0].tenantId !== tenantId) {
      return {
        success: false,
        error: "Workspace not found or access denied",
      };
    }

    // Delete workspace
    await db
      .delete(slackWorkspaces)
      .where(eq(slackWorkspaces.workspaceId, workspaceId));

    logger.info("Removed Slack workspace", { workspaceId, tenantId });

    return { success: true };
  } catch (error) {
    logger.error("Failed to remove workspace", { error, workspaceId });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove workspace",
    };
  }
}
