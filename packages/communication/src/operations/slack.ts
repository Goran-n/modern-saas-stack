import {
  desc,
  eq,
  slackUserMappings,
  slackWorkspaces,
  sql,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { getDb } from "../db";

const logger = createLogger("slack-operations");

/**
 * Get Slack workspaces for a tenant with user counts
 * @param tenantId - Tenant ID
 * @returns Promise resolving to workspaces with metadata
 */
export async function getSlackWorkspaces(tenantId: string): Promise<
  Array<{
    id: string;
    workspaceId: string;
    tenantId: string;
    botToken: string;
    botUserId: string;
    createdAt: Date;
    updatedAt: Date;
    workspaceName: string | null;
    userCount: number;
    channelCount: number | null;
  }>
> {
  logger.info("Getting Slack workspaces", { tenantId });

  const db = getDb();

  try {
    const workspaces = await db
      .select({
        id: slackWorkspaces.id,
        workspaceId: slackWorkspaces.workspaceId,
        tenantId: slackWorkspaces.tenantId,
        botToken: slackWorkspaces.botToken,
        botUserId: slackWorkspaces.botUserId,
        createdAt: slackWorkspaces.createdAt,
        updatedAt: slackWorkspaces.updatedAt,
      })
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.tenantId, tenantId))
      .orderBy(desc(slackWorkspaces.createdAt));

    // Get user and channel counts for each workspace
    const workspacesWithCounts = await Promise.all(
      workspaces.map(async (workspace: any) => {
        const userCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(slackUserMappings)
          .where(eq(slackUserMappings.workspaceId, workspace.workspaceId));

        return {
          ...workspace,
          workspaceName: null, // Would be fetched from Slack API
          userCount: Number(userCountResult[0]?.count || 0),
          channelCount: null, // Would be fetched from Slack API
        };
      }),
    );

    return workspacesWithCounts;
  } catch (error) {
    logger.error("Failed to get workspaces", { error, tenantId });
    throw new Error("Failed to get workspaces");
  }
}

/**
 * Get Slack user mappings for a workspace
 * @param workspaceId - Slack workspace ID
 * @param tenantId - Tenant ID for security check
 * @returns Promise resolving to user mappings
 */
export async function getSlackUserMappings(
  workspaceId: string,
  tenantId: string,
): Promise<
  Array<{
    slackUserId: string;
    workspaceId: string;
    userId: string;
    createdAt: Date;
  }>
> {
  logger.info("Getting Slack user mappings", { workspaceId, tenantId });

  const db = getDb();

  try {
    // First verify the workspace belongs to this tenant
    const workspace = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.workspaceId, workspaceId))
      .limit(1);

    if (!workspace[0] || workspace[0].tenantId !== tenantId) {
      throw new Error("Workspace not found or access denied");
    }

    // Get user mappings
    const mappings = await db
      .select({
        slackUserId: slackUserMappings.slackUserId,
        workspaceId: slackUserMappings.workspaceId,
        userId: slackUserMappings.userId,
        createdAt: slackUserMappings.createdAt,
      })
      .from(slackUserMappings)
      .where(eq(slackUserMappings.workspaceId, workspaceId))
      .orderBy(desc(slackUserMappings.createdAt));

    return mappings;
  } catch (error) {
    logger.error("Failed to get user mappings", { error, workspaceId });
    throw new Error(
      error instanceof Error ? error.message : "Failed to get user mappings",
    );
  }
}
