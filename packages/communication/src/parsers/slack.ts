import { createLogger } from "@figgy/utils";
import { type ParsedSlackMessage, SlackEventPayloadSchema } from "../types";
import { CommunicationError, ERROR_CODES } from "../types/errors";

const logger = createLogger("slack-parser");

export type SlackParseResult =
  | { type: "success"; message: ParsedSlackMessage }
  | { type: "skipped"; reason: string }
  | { type: "error"; error: CommunicationError };

export function parseSlackPayloadWithResult(
  payload: unknown,
): SlackParseResult {
  try {
    const validated = SlackEventPayloadSchema.parse(payload);
    const event = validated.event;

    // Log incoming event details for debugging
    logger.debug("Processing Slack event", {
      eventType: event.type,
      eventId: validated.event_id,
      teamId: validated.team_id,
      eventTime: new Date(validated.event_time * 1000).toISOString(),
      hasFiles: "files" in event && event.files && event.files.length > 0,
      fileCount: "files" in event && event.files ? event.files.length : 0,
    });

    // Skip bot messages to prevent infinite loops
    if ("bot_id" in event && event.bot_id) {
      logger.debug("Skipping bot message", {
        botId: event.bot_id,
        eventType: event.type,
      });
      return { type: "skipped", reason: "bot_message" };
    }

    // Process message events (can contain both text and files)
    if (event.type === "message") {
      const parsed: ParsedSlackMessage = {
        messageId: validated.event_id,
        userId: event.user,
        channelId: event.channel,
        workspaceId: validated.team_id,
        timestamp: new Date(validated.event_time * 1000),
        files: event.files
          ? event.files.map((file) => ({
              id: file.id,
              name: file.name,
              mimeType: file.mimetype,
              size: file.size,
              downloadUrl: file.url_private_download,
            }))
          : [],
      };

      // Only add text if it exists
      if (event.text) {
        parsed.text = event.text;
      }

      logger.info("Parsed Slack message", {
        messageId: parsed.messageId,
        hasText: !!parsed.text,
        filesCount: parsed.files.length,
        eventType: event.type,
        textContent: event.text,
      });

      return { type: "success", message: parsed };
    } else if (event.type === "file_shared") {
      // Skip file_shared events to prevent duplicate processing
      // Files are already processed in message events
      logger.debug("Skipping file_shared event to prevent duplicates", {
        eventId: validated.event_id,
        eventType: event.type,
      });
      return { type: "skipped", reason: "file_shared_duplicate_prevention" };
    }

    return { type: "skipped", reason: "unsupported_event_type" };
  } catch (error) {
    logger.error("Failed to parse Slack payload", error);
    const communicationError = new CommunicationError(
      "Invalid Slack event payload",
      ERROR_CODES.INVALID_PAYLOAD,
      error,
    );
    return { type: "error", error: communicationError };
  }
}

// Keep the old function for backward compatibility
export function parseSlackPayload(payload: unknown): ParsedSlackMessage | null {
  const result = parseSlackPayloadWithResult(payload);
  if (result.type === "success") {
    return result.message;
  }
  if (result.type === "error") {
    throw result.error;
  }
  return null;
}
