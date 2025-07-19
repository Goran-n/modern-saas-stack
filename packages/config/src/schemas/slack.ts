import { z } from 'zod';

/**
 * Slack configuration schema
 * Environment variables for Slack integration
 */
export const slackSchema = z.object({
  /**
   * Slack Bot User OAuth Token
   * Starts with xoxb-
   * Required for downloading files and sending messages
   */
  SLACK_BOT_TOKEN: z.string()
    .regex(/^xoxb-/)
    .optional()
    .describe('Slack Bot User OAuth Token (required for Slack integration)'),
  
  /**
   * Slack App OAuth Token (optional)
   * Starts with xoxp-
   * Used for user-level operations
   */
  SLACK_USER_TOKEN: z.string()
    .regex(/^xoxp-/)
    .optional()
    .describe('Slack User OAuth Token'),
  
  /**
   * Slack Signing Secret
   * Used to verify webhook requests are from Slack
   */
  SLACK_SIGNING_SECRET: z.string()
    .min(1)
    .optional()
    .describe('Slack Signing Secret for webhook verification (required for Slack integration)'),
  
  /**
   * Slack App ID (optional)
   * Used for reference
   */
  SLACK_APP_ID: z.string()
    .optional()
    .describe('Slack App ID'),
  
  /**
   * Slack Client ID (optional)
   * Used for OAuth flows
   */
  SLACK_CLIENT_ID: z.string()
    .optional()
    .describe('Slack OAuth Client ID'),
  
  /**
   * Slack Client Secret (optional)
   * Used for OAuth flows
   */
  SLACK_CLIENT_SECRET: z.string()
    .optional()
    .describe('Slack OAuth Client Secret'),
});

export type SlackConfig = z.infer<typeof slackSchema>;