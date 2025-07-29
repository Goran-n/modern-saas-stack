import { getConfig } from "@figgy/config";
import { createLogger } from "@figgy/utils";
import { Resend } from "resend";
import type { EmailServiceConfig } from "./types";

const logger = createLogger("email-service");

let resendClient: Resend | null = null;

export function getEmailClient(): Resend {
  if (!resendClient) {
    const config = getConfig().get();
    
    if (!config.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    
    resendClient = new Resend(config.RESEND_API_KEY);
    logger.info("Resend client initialized");
  }
  
  return resendClient;
}

export function getEmailConfig(): EmailServiceConfig {
  const config = getConfig().get();
  
  return {
    apiKey: config.RESEND_API_KEY || "",
    fromAddress: config.EMAIL_FROM_ADDRESS || "hello@figgy.com",
    fromName: config.EMAIL_FROM_NAME || "Figgy",
  };
}