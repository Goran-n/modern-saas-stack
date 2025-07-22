import {
  and,
  type CommunicationMessage,
  communicationMessages,
  count,
  desc,
  eq,
  gte,
  lt,
  sql,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { getDb } from "../db";

const logger = createLogger("communication-messages");

/**
 * Get messages for a tenant
 */
export async function getMessages(
  tenantId: string,
  options: {
    platform?: "whatsapp" | "slack";
    isQuery?: boolean;
    limit?: number;
    offset?: number;
    startDate?: Date;
  } = {},
): Promise<{
  messages: CommunicationMessage[];
  total: number;
}> {
  try {
    const db = getDb();
    const { platform, isQuery, limit = 50, offset = 0, startDate } = options;

    const filters = [eq(communicationMessages.tenantId, tenantId)];

    if (platform) {
      filters.push(eq(communicationMessages.platform, platform));
    }

    if (isQuery !== undefined) {
      filters.push(eq(communicationMessages.isQuery, isQuery));
    }

    if (startDate) {
      filters.push(gte(communicationMessages.createdAt, startDate));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(communicationMessages)
      .where(and(...filters));

    const total = countResult?.count || 0;

    // Get messages
    const messages = await db
      .select()
      .from(communicationMessages)
      .where(and(...filters))
      .orderBy(desc(communicationMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      messages,
      total,
    };
  } catch (error) {
    logger.error("Failed to get messages", error);
    throw error;
  }
}

/**
 * Get message by ID
 */
export async function getMessageById(
  messageId: string,
  tenantId: string,
): Promise<CommunicationMessage | null> {
  try {
    const db = getDb();

    const [message] = await db
      .select()
      .from(communicationMessages)
      .where(
        and(
          eq(communicationMessages.id, messageId),
          eq(communicationMessages.tenantId, tenantId),
        ),
      )
      .limit(1);

    return message || null;
  } catch (error) {
    logger.error("Failed to get message by ID", error);
    throw error;
  }
}

/**
 * Search messages by content
 */
export async function searchMessages(
  tenantId: string,
  searchTerm: string,
  options: {
    platform?: "whatsapp" | "slack";
    limit?: number;
  } = {},
): Promise<CommunicationMessage[]> {
  try {
    const db = getDb();
    const { platform, limit = 20 } = options;

    const filters = [
      eq(communicationMessages.tenantId, tenantId),
      sql`to_tsvector('english', ${communicationMessages.content}) @@ plainto_tsquery('english', ${searchTerm})`,
    ];

    if (platform) {
      filters.push(eq(communicationMessages.platform, platform));
    }

    const messages = await db
      .select()
      .from(communicationMessages)
      .where(and(...filters))
      .orderBy(desc(communicationMessages.createdAt))
      .limit(limit);

    return messages;
  } catch (error) {
    logger.error("Failed to search messages", error);
    throw error;
  }
}

/**
 * Get conversation thread for a sender
 */
export async function getConversationThread(
  tenantId: string,
  sender: string,
  platform: "whatsapp" | "slack",
  limit = 50,
): Promise<CommunicationMessage[]> {
  try {
    const db = getDb();

    const messages = await db
      .select()
      .from(communicationMessages)
      .where(
        and(
          eq(communicationMessages.tenantId, tenantId),
          eq(communicationMessages.sender, sender),
          eq(communicationMessages.platform, platform),
        ),
      )
      .orderBy(desc(communicationMessages.createdAt))
      .limit(limit);

    return messages;
  } catch (error) {
    logger.error("Failed to get conversation thread", error);
    throw error;
  }
}

/**
 * Delete old messages (for cleanup)
 */
export async function deleteOldMessages(
  tenantId: string,
  olderThan: Date,
): Promise<number> {
  try {
    const db = getDb();

    await db
      .delete(communicationMessages)
      .where(
        and(
          eq(communicationMessages.tenantId, tenantId),
          lt(communicationMessages.createdAt, olderThan),
        ),
      );

    logger.info("Deleted old messages", {
      tenantId,
      olderThan,
    });

    return 0;
  } catch (error) {
    logger.error("Failed to delete old messages", error);
    throw error;
  }
}
