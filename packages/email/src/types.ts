export interface SendInvitationEmailInput {
  to: string;
  inviterName: string;
  tenantName: string;
  invitationLink: string;
  expiresAt: Date;
}

export interface EmailServiceConfig {
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

export interface EmailSendResult {
  id: string;
  success: boolean;
  error?: string;
}