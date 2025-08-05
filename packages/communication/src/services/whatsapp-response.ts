import { getConfig } from "@figgy/config";
import { createLogger, handleError } from "@figgy/utils";
import { Twilio } from "twilio";

const logger = createLogger("whatsapp-response");

export class WhatsAppResponseService {
  private client: Twilio;
  private whatsappNumber: string;

  constructor() {
    const config = getConfig().getForCommunication();

    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }

    this.client = new Twilio(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_AUTH_TOKEN,
    );

    this.whatsappNumber = config.TWILIO_WHATSAPP_NUMBER || "";
    if (!this.whatsappNumber) {
      throw new Error("WhatsApp number not configured");
    }
  }

  /**
   * Send a WhatsApp message response
   */
  async sendMessage(
    to: string,
    message: string,
    options?: {
      mediaUrl?: string;
      quickReplies?: string[];
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Ensure the 'to' number is in WhatsApp format
      const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
      const fromNumber = this.whatsappNumber.startsWith("whatsapp:")
        ? this.whatsappNumber
        : `whatsapp:${this.whatsappNumber}`;

      logger.info("Sending WhatsApp message", {
        to: toNumber,
        from: fromNumber,
        messageLength: message.length,
      });

      const messageOptions: any = {
        body: message,
        from: fromNumber,
        to: toNumber,
      };

      // Add media if provided
      if (options?.mediaUrl) {
        messageOptions.mediaUrl = [options.mediaUrl];
      }

      // Twilio doesn't support quick replies directly, but we can append them as suggestions
      if (options?.quickReplies && options.quickReplies.length > 0) {
        messageOptions.body += "\n\n*Quick replies:*";
        options.quickReplies.forEach((reply, index) => {
          messageOptions.body += `\n${index + 1}. ${reply}`;
        });
      }

      const sentMessage = await this.client.messages.create(messageOptions);

      logger.info("WhatsApp message sent successfully", {
        messageId: sentMessage.sid,
        to: toNumber,
      });

      return {
        success: true,
        messageId: sentMessage.sid,
      };
    } catch (error) {
      return handleError(logger, "Failed to send WhatsApp message", error, {
        to,
        messageLength: message.length,
        hasMediaUrl: !!options?.mediaUrl,
        hasQuickReplies: !!options?.quickReplies?.length,
      });
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove whatsapp: prefix if present
    let cleaned = phoneNumber.replace("whatsapp:", "");

    // Remove any non-digit characters except +
    cleaned = cleaned.replace(/[^\d+]/g, "");

    // Ensure it starts with +
    if (!cleaned.startsWith("+")) {
      // Assume US number if no country code
      cleaned = `+1${cleaned}`;
    }

    return cleaned;
  }
}
