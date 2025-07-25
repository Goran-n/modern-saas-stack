import { z } from 'zod';

// Communication types
export const CommunicationChannelSchema = z.enum(['slack', 'whatsapp', 'email']);

export const SlackWorkspaceSchema = z.object({
  id: z.string(),
  tenantId: z.string().uuid(),
  teamId: z.string(),
  teamName: z.string(),
  botUserId: z.string().optional(),
  botAccessToken: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SlackUserSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  slackUserId: z.string(),
  userId: z.string().uuid().optional(),
  realName: z.string(),
  displayName: z.string(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  isBot: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WhatsAppVerificationSchema = z.object({
  id: z.string(),
  tenantId: z.string().uuid(),
  phoneNumber: z.string(),
  verified: z.boolean(),
  verificationCode: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Type exports
export type CommunicationChannel = z.infer<typeof CommunicationChannelSchema>;
export type SlackWorkspace = z.infer<typeof SlackWorkspaceSchema>;
export type SlackUser = z.infer<typeof SlackUserSchema>;
export type WhatsAppVerification = z.infer<typeof WhatsAppVerificationSchema>;