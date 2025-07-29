import { createLogger } from "@figgy/utils";
import { render } from "@react-email/render";
import { getEmailClient, getEmailConfig } from "../client";
import InvitationEmail from "../templates/invitation";
import type { EmailSendResult, SendInvitationEmailInput } from "../types";

const logger = createLogger("email-operations");

export async function sendInvitationEmail(
  input: SendInvitationEmailInput
): Promise<EmailSendResult> {
  try {
    const client = getEmailClient();
    const config = getEmailConfig();
    
    logger.info("Sending invitation email", {
      to: input.to,
      tenantName: input.tenantName,
    });
    
    // Render the React Email template to HTML
    const html = await render(
      InvitationEmail({
        inviterName: input.inviterName,
        tenantName: input.tenantName,
        invitationLink: input.invitationLink,
        expiresAt: input.expiresAt,
      })
    );
    
    const { data, error } = await client.emails.send({
      from: `${config.fromName} <${config.fromAddress}>`,
      to: [input.to],
      subject: `You've been invited to join ${input.tenantName} on Figgy`,
      html,
    });
    
    if (error) {
      logger.error("Failed to send invitation email", { error });
      return {
        id: "",
        success: false,
        error: error.message,
      };
    }
    
    logger.info("Invitation email sent successfully", {
      emailId: data?.id,
      to: input.to,
    });
    
    return {
      id: data?.id || "",
      success: true,
    };
  } catch (error) {
    logger.error("Unexpected error sending invitation email", { error });
    return {
      id: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}