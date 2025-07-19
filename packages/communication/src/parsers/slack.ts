import { createLogger } from '@kibly/utils';
import { SlackEventPayloadSchema, type ParsedSlackMessage } from '../types';

const logger = createLogger('slack-parser');

export function parseSlackPayload(payload: unknown): ParsedSlackMessage | null {
  try {
    const validated = SlackEventPayloadSchema.parse(payload);
    const event = validated.event;

    // Only process file events
    if (event.type !== 'file_shared' || !event.files) {
      return null;
    }

    const parsed: ParsedSlackMessage = {
      messageId: validated.event_id,
      userId: event.user,
      channelId: event.channel,
      workspaceId: validated.team_id,
      timestamp: new Date(validated.event_time * 1000),
      files: event.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimetype,
        size: file.size,
        downloadUrl: file.url_private_download
      }))
    };

    logger.info('Parsed Slack message', {
      messageId: parsed.messageId,
      filesCount: parsed.files.length
    });

    return parsed;
  } catch (error) {
    logger.error('Failed to parse Slack payload', error);
    throw new Error('Invalid Slack event payload');
  }
}