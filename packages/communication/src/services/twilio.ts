import { getConfig } from "@figgy/config";
import { createLogger, logAndRethrow } from "@figgy/utils";
import twilio from "twilio";
import { COMMUNICATION_WHATSAPP_PREFIX } from "../constants";

const logger = createLogger("twilio-service");

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string; // Format: [prefix]+1234567890
}

export interface WhatsAppMedia {
  mediaUrl: string;
  contentType: string;
  filename?: string;
  sha256?: string;
}

export class TwilioService {
  private client: twilio.Twilio;
  private config: TwilioConfig;

  constructor(config?: Partial<TwilioConfig>) {
    const configInstance = getConfig();
    const envConfig = configInstance.getForCommunication();

    this.config = {
      accountSid: config?.accountSid || envConfig.TWILIO_ACCOUNT_SID || "",
      authToken: config?.authToken || envConfig.TWILIO_AUTH_TOKEN || "",
      whatsappNumber:
        config?.whatsappNumber ||
        `${COMMUNICATION_WHATSAPP_PREFIX}${envConfig.TWILIO_WHATSAPP_NUMBER || ""}`,
    };

    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error("Twilio credentials are required");
    }

    this.client = twilio(this.config.accountSid, this.config.authToken);
    logger.info("Twilio service initialized", {
      accountSid: this.config.accountSid,
      whatsappNumber: this.config.whatsappNumber,
    });
  }

  async sendMessage(to: string, body: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        from: this.config.whatsappNumber,
        to: `${COMMUNICATION_WHATSAPP_PREFIX}${to}`,
        body,
      });

      logger.info("WhatsApp message sent", {
        messageId: message.sid,
        to,
      });

      return message.sid;
    } catch (error) {
      logAndRethrow(logger, "Failed to send WhatsApp message", error, {
        to,
        bodyLength: body.length,
        accountSid: this.config.accountSid,
      });
    }
  }

  async getMediaUrl(mediaId: string): Promise<WhatsAppMedia> {
    try {
      logger.warn("Media download not fully implemented", { mediaId });

      // TODO: Implement actual media retrieval

      throw new Error("Media download not yet implemented");
    } catch (error) {
      logger.error("Failed to get media URL", { mediaId, error });
      throw error;
    }
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(mediaUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error("Failed to download media", { mediaUrl, error });
      throw error;
    }
  }

  async sendVerificationCode(
    phoneNumber: string,
    code: string,
  ): Promise<string> {
    const message = `Your Figgy verification code is: ${code}\n\nThis code will expire in 10 minutes.`;
    return this.sendMessage(phoneNumber, message);
  }

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>,
  ): boolean {
    return twilio.validateRequest(
      this.config.authToken,
      signature,
      url,
      params,
    );
  }
}

let twilioService: TwilioService | null = null;

export function getTwilioService(): TwilioService {
  if (!twilioService) {
    try {
      twilioService = new TwilioService();
    } catch (error) {
      logger.error("Failed to initialize Twilio service", error);
      throw error;
    }
  }
  return twilioService;
}
