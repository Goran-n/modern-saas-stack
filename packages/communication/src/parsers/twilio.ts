import { createLogger } from "@figgy/utils";
import { COMMUNICATION_DEFAULT_MIME_TYPE, COMMUNICATION_WHATSAPP_PREFIX } from "../constants";
import type { ParsedWhatsAppMessage } from "../types";
import {
  extractTwilioMedia,
  TwilioWhatsAppWebhookSchema,
} from "../types/twilio";

const logger = createLogger("twilio-parser");

export function parseTwilioWhatsAppPayload(
  payload: unknown,
): ParsedWhatsAppMessage | null {
  try {
    const validated = TwilioWhatsAppWebhookSchema.parse(payload);
    const media = extractTwilioMedia(payload as Record<string, any>);

    const phoneNumber = validated.From.replace(
      COMMUNICATION_WHATSAPP_PREFIX,
      "",
    );

    let type: "text" | "document" | "image" = "text";
    let mediaUrl: string | undefined;
    let mimeType: string | undefined;

    if (media.length > 0) {
      const firstMedia = media[0];
      if (firstMedia) {
        mimeType = firstMedia.contentType;
        mediaUrl = firstMedia.url;

        if (mimeType.startsWith("image/")) {
          type = "image";
        } else if (
          mimeType === COMMUNICATION_DEFAULT_MIME_TYPE ||
          mimeType.startsWith("application/")
        ) {
          type = "document";
        }
      }
    }

    const parsed: ParsedWhatsAppMessage = {
      messageId: validated.MessageSid,
      phoneNumber,
      timestamp: new Date(),
      type,
      content: validated.Body || undefined,
      mediaId: mediaUrl,
      mimeType,
    };

    logger.info("Parsed Twilio WhatsApp message", {
      messageId: parsed.messageId,
      type: parsed.type,
      hasMedia: !!mediaUrl,
    });

    return parsed;
  } catch (error) {
    logger.error({
      err: error,
      msg: "Failed to parse Twilio WhatsApp payload",
    });
    return null;
  }
}

export function isTwilioWhatsAppWebhook(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;

  const obj = payload as Record<string, any>;
  return (
    typeof obj.MessageSid === "string" &&
    typeof obj.From === "string" &&
    obj.From.startsWith(COMMUNICATION_WHATSAPP_PREFIX)
  );
}
