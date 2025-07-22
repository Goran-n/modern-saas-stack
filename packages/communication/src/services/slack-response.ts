import { eq, slackWorkspaces } from "@figgy/shared-db";
import { createLogger, handleError } from "@figgy/utils";
import { WebClient } from "@slack/web-api";
import { getDb } from "../db";

const logger = createLogger("slack-response");

export class SlackResponseService {
  private clients: Map<string, WebClient> = new Map();

  /**
   * Get or create a Slack client for a workspace
   */
  private async getClient(workspaceId: string): Promise<WebClient> {
    // Check if we already have a client for this workspace
    if (this.clients.has(workspaceId)) {
      return this.clients.get(workspaceId)!;
    }

    // Fetch the bot token from database
    const db = getDb();
    const workspace = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.workspaceId, workspaceId))
      .limit(1);

    if (!workspace.length || !workspace[0]?.botToken) {
      throw new Error(`No bot token found for workspace ${workspaceId}`);
    }

    // Create and cache the client
    const client = new WebClient(workspace[0].botToken);
    this.clients.set(workspaceId, client);

    return client;
  }

  /**
   * Send a Slack message response
   */
  async sendMessage(
    workspaceId: string,
    channel: string,
    message: string,
    options?: {
      threadTs?: string;
      blocks?: any[];
      attachments?: any[];
      ephemeral?: boolean;
      userId?: string; // Required for ephemeral messages
      unfurlLinks?: boolean;
      unfurlMedia?: boolean;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const client = await this.getClient(workspaceId);

      logger.info("Sending Slack message", {
        workspaceId,
        channel,
        messageLength: message.length,
        hasBlocks: !!options?.blocks,
        isEphemeral: !!options?.ephemeral,
        isThreadReply: !!options?.threadTs,
      });

      let result;

      if (options?.ephemeral && options.userId) {
        // Send ephemeral message (only visible to one user)
        result = (await client.chat.postEphemeral({
          channel,
          user: options.userId,
          text: message,
          ...(options?.blocks && { blocks: options.blocks }),
          ...(options?.attachments && { attachments: options.attachments }),
          ...(options?.threadTs && { thread_ts: options.threadTs }),
        })) as any;
      } else {
        // Send regular message
        result = await client.chat.postMessage({
          channel,
          text: message,
          ...(options?.blocks && { blocks: options.blocks }),
          ...(options?.attachments && { attachments: options.attachments }),
          ...(options?.threadTs && { thread_ts: options.threadTs }),
          unfurl_links: options?.unfurlLinks ?? false,
          unfurl_media: options?.unfurlMedia ?? false,
        });
      }

      if (!result.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      logger.info("Slack message sent successfully", {
        messageId: result.ts,
        channel,
        workspaceId,
      });

      return {
        success: true,
        messageId: (result as any).ts,
      };
    } catch (error) {
      return handleError(logger, "Failed to send Slack message", error, {
        workspaceId,
        channel,
        messageLength: message.length,
        hasBlocks: !!options?.blocks,
        isEphemeral: !!options?.ephemeral,
      });
    }
  }

  /**
   * Send a message with quick reply suggestions
   */
  async sendMessageWithSuggestions(
    workspaceId: string,
    channel: string,
    message: string,
    suggestions: string[],
    options?: {
      threadTs?: string;
      userId?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Create blocks with the main message and suggestion buttons
    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ];

    // Add suggestions as buttons
    if (suggestions.length > 0) {
      blocks.push({
        type: "divider",
      });
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Quick actions:*",
        },
      });
      blocks.push({
        type: "actions",
        elements: suggestions.slice(0, 5).map((suggestion, index) => ({
          type: "button",
          text: {
            type: "plain_text",
            text: suggestion,
            emoji: true,
          },
          value: suggestion,
          action_id: `suggestion_${index}`,
        })),
      });
    }

    return this.sendMessage(workspaceId, channel, message, {
      blocks,
      ...(options?.threadTs && { threadTs: options.threadTs }),
      ...(options?.userId && { userId: options.userId }),
    });
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    workspaceId: string,
    channel: string,
    messageTs: string,
    message: string,
    options?: {
      blocks?: any[];
      attachments?: any[];
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClient(workspaceId);

      const result = await client.chat.update({
        channel,
        ts: messageTs,
        text: message,
        blocks: options?.blocks,
        attachments: options?.attachments,
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to update message");
      }

      logger.info("Slack message updated successfully", {
        messageId: messageTs,
        channel,
        workspaceId,
      });

      return {
        success: true,
      };
    } catch (error) {
      return handleError(logger, "Failed to update Slack message", error, {
        workspaceId,
        channel,
        messageTs,
      });
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    workspaceId: string,
    channel: string,
    messageTs: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClient(workspaceId);

      const result = await client.chat.delete({
        channel,
        ts: messageTs,
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to delete message");
      }

      logger.info("Slack message deleted successfully", {
        messageId: messageTs,
        channel,
        workspaceId,
      });

      return {
        success: true,
      };
    } catch (error) {
      return handleError(logger, "Failed to delete Slack message", error, {
        workspaceId,
        channel,
        messageTs,
      });
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    workspaceId: string,
    channel: string,
    messageTs: string,
    emoji: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClient(workspaceId);

      const result = await client.reactions.add({
        channel,
        timestamp: messageTs,
        name: emoji,
      });

      if (!result.ok) {
        throw new Error("Failed to add reaction");
      }

      return {
        success: true,
      };
    } catch (error) {
      return handleError(logger, "Failed to add Slack reaction", error, {
        workspaceId,
        channel,
        messageTs,
        emoji,
      });
    }
  }
}
