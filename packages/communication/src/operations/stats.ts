import {
  files,
  whatsappVerifications,
} from "@kibly/shared-db";
import { createLogger } from "@kibly/utils";
import { and, desc, eq, gt, gte, sql } from "@kibly/shared-db";
import { getDb } from "../db";

const logger = createLogger("communication-stats");

/**
 * Get communication statistics for a tenant
 * @param tenantId - Tenant ID
 * @returns Promise resolving to communication stats
 */
export async function getCommunicationStats(tenantId: string): Promise<{
  totalMessages: number;
  whatsappMessages: number;
  slackMessages: number;
  filesProcessedToday: number;
  failedProcessing: number;
  pendingVerifications: number;
}> {
  logger.info("Getting communication stats", { tenantId });

  const db = getDb();

  try {
    // Get WhatsApp message count (files from WhatsApp source)
    const whatsappMessagesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(eq(files.tenantId, tenantId), eq(files.source, "whatsapp")));

    // Get Slack message count (files from Slack source)
    const slackMessagesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(eq(files.tenantId, tenantId), eq(files.source, "slack")));

    // Get files processed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filesProcessedTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(
        and(
          eq(files.tenantId, tenantId),
          gte(files.createdAt, today),
          sql`${files.source} IN ('whatsapp', 'slack')`,
          eq(files.processingStatus, "completed"),
        ),
      );

    // Get failed processing count
    const failedProcessingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(
        and(
          eq(files.tenantId, tenantId),
          eq(files.processingStatus, "failed"),
          sql`${files.source} IN ('whatsapp', 'slack')`,
        ),
      );

    // Get pending verifications count
    const now = new Date();
    const pendingVerificationsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappVerifications)
      .where(
        and(
          eq(whatsappVerifications.tenantId, tenantId),
          eq(whatsappVerifications.verified, false),
          gt(whatsappVerifications.expiresAt, now),
        ),
      );

    const whatsappMessages = Number(whatsappMessagesResult[0]?.count || 0);
    const slackMessages = Number(slackMessagesResult[0]?.count || 0);

    return {
      totalMessages: whatsappMessages + slackMessages,
      whatsappMessages,
      slackMessages,
      filesProcessedToday: Number(filesProcessedTodayResult[0]?.count || 0),
      failedProcessing: Number(failedProcessingResult[0]?.count || 0),
      pendingVerifications: Number(pendingVerificationsResult[0]?.count || 0),
    };
  } catch (error) {
    logger.error("Failed to get communication stats", { error, tenantId });
    throw new Error("Failed to get communication statistics");
  }
}

/**
 * Get recent communication activity
 * @param tenantId - Tenant ID
 * @returns Promise resolving to recent activities
 */
export async function getRecentActivity(tenantId: string): Promise<
  Array<{
    id: string;
    platform: "whatsapp" | "slack";
    type: "file" | "verification";
    description: string;
    status: "success" | "failed" | "pending";
    timestamp: string;
    metadata: Record<string, any>;
  }>
> {
  logger.info("Getting recent activity", { tenantId });

  const db = getDb();

  try {
    // Get recent files from WhatsApp and Slack
    const recentFiles = await db
      .select({
        id: files.id,
        fileName: files.fileName,
        source: files.source,
        processingStatus: files.processingStatus,
        createdAt: files.createdAt,
        metadata: files.metadata,
      })
      .from(files)
      .where(
        and(
          eq(files.tenantId, tenantId),
          sql`${files.source} IN ('whatsapp', 'slack')`,
        ),
      )
      .orderBy(desc(files.createdAt))
      .limit(20);

    // Get recent verifications
    const recentVerifications = await db
      .select({
        id: whatsappVerifications.id,
        phoneNumber: whatsappVerifications.phoneNumber,
        verified: whatsappVerifications.verified,
        createdAt: whatsappVerifications.createdAt,
      })
      .from(whatsappVerifications)
      .where(eq(whatsappVerifications.tenantId, tenantId))
      .orderBy(desc(whatsappVerifications.createdAt))
      .limit(10);

    // Combine and format activities
    const activities = [];

    // Add file activities
    for (const file of recentFiles) {
      activities.push({
        id: file.id,
        platform: file.source as "whatsapp" | "slack",
        type: "file" as const,
        description: `File received: ${file.fileName}`,
        status:
          file.processingStatus === "completed"
            ? ("success" as const)
            : file.processingStatus === "failed"
              ? ("failed" as const)
              : ("pending" as const),
        timestamp: file.createdAt.toISOString(),
        metadata: file.metadata as Record<string, any>,
      });
    }

    // Add verification activities
    for (const verification of recentVerifications) {
      activities.push({
        id: verification.id,
        platform: "whatsapp" as const,
        type: "verification" as const,
        description: `Phone verification ${verification.verified ? "completed" : "requested"} for ${verification.phoneNumber}`,
        status: verification.verified ? ("success" as const) : ("pending" as const),
        timestamp: verification.createdAt.toISOString(),
        metadata: {},
      });
    }

    // Sort by timestamp and return top 50
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 50);
  } catch (error) {
    logger.error("Failed to get recent activity", { error, tenantId });
    throw new Error("Failed to get recent activity");
  }
}

/**
 * Retry failed file processing
 * @param fileId - File ID to retry
 * @param tenantId - Tenant ID for security check
 * @returns Promise resolving to success status
 */
export async function retryFileProcessing(
  fileId: string,
  tenantId: string,
): Promise<{ success: boolean }> {
  logger.info("Retrying file processing", { fileId, tenantId });

  const db = getDb();

  try {
    // Check if this is a file
    const file = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
      .limit(1);

    if (!file[0]) {
      throw new Error("File not found");
    }

    // Update file status to pending to trigger reprocessing
    await db
      .update(files)
      .set({
        processingStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(files.id, fileId));

    logger.info("File marked for reprocessing", { fileId });

    return { success: true };
  } catch (error) {
    logger.error("Failed to retry processing", { error, fileId });
    throw new Error(
      error instanceof Error ? error.message : "Failed to retry processing",
    );
  }
}