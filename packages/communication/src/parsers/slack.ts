import { createLogger } from "@kibly/utils";
import { type ParsedSlackMessage, SlackEventPayloadSchema } from "../types";

const logger = createLogger("slack-parser");

export function parseSlackPayload(payload: unknown): ParsedSlackMessage | null {
  try {
    const validated = SlackEventPayloadSchema.parse(payload);
    const event = validated.event;

    // Process both file events and message events
    if (event.type === "file_shared" && event.files) {
      const parsed: ParsedSlackMessage = {
        messageId: validated.event_id,
        userId: event.user,
        channelId: event.channel,
        workspaceId: validated.team_id,
        timestamp: new Date(validated.event_time * 1000),
        files: event.files.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimetype,
          size: file.size,
          downloadUrl: file.url_private_download,
        })),
      };

      logger.info("Parsed Slack file message", {
        messageId: parsed.messageId,
        filesCount: parsed.files.length,
      });

      return parsed;
    } else if (event.type === "message" && event.text) {
      const parsed: ParsedSlackMessage = {
        messageId: validated.event_id,
        userId: event.user,
        channelId: event.channel,
        workspaceId: validated.team_id,
        timestamp: new Date(validated.event_time * 1000),
        text: event.text,
        files: [],
      };

      logger.info("Parsed Slack text message", {
        messageId: parsed.messageId,
        text: parsed.text,
      });

      return parsed;
    }

    return null;
  } catch (error) {
    logger.error("Failed to parse Slack payload", error);
    throw new Error("Invalid Slack event payload");
  }
}
