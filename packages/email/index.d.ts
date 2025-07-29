// Type definitions for @figgy/email package
// This file helps isolate React types from Vue type checking

export class EmailService {
  sendInvitation(input: SendInvitationEmailInput): Promise<EmailSendResult>;
}

export function createEmailService(): EmailService;

export type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type SendInvitationEmailInput = {
  to: string;
  inviterName: string;
  tenantName: string;
  invitationLink: string;
  expiresAt: Date;
};

export type SendPasswordResetEmailInput = {
  to: string;
  resetLink: string;
  expiresAt: Date;
};

export type SendWelcomeEmailInput = {
  to: string;
  userName: string;
  tenantName: string;
};