export { BaseEmailProvider } from "./base.provider";
export { GmailProvider } from "./gmail.provider";
export { OutlookProvider } from "./outlook.provider";
export { IMAPProvider } from "./imap.provider";

import type { EmailProvider as IEmailProvider } from "../types";
import { EmailProvider } from "../types";
import { GmailProvider } from "./gmail.provider";
import { OutlookProvider } from "./outlook.provider";
import { IMAPProvider } from "./imap.provider";

/**
 * Factory function to create email provider instances
 */
export function createEmailProvider(provider: EmailProvider): IEmailProvider {
  switch (provider) {
    case EmailProvider.GMAIL:
      return new GmailProvider();
    case EmailProvider.OUTLOOK:
      return new OutlookProvider();
    case EmailProvider.IMAP:
      return new IMAPProvider();
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}