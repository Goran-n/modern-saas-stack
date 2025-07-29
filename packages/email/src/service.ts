import { sendInvitationEmail } from "./operations/send-invitation";
import type { EmailSendResult, SendInvitationEmailInput } from "./types";

/**
 * Email service for managing all email operations
 */
export class EmailService {
  /**
   * Send an invitation email to a new team member
   */
  async sendInvitation(input: SendInvitationEmailInput): Promise<EmailSendResult> {
    return sendInvitationEmail(input);
  }
  
  // Future email methods can be added here:
  // async sendPasswordReset(...)
  // async sendWelcome(...)
  // async sendNotification(...)
}

/**
 * Create a new email service instance
 */
export function createEmailService(): EmailService {
  return new EmailService();
}