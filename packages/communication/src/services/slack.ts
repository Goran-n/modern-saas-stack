import { getConfig } from "@figgy/config";
import { createLogger } from "@figgy/utils";

const logger = createLogger("slack-service");

export interface SlackConfig {
  botToken: string;
  signingSecret?: string;
}

export class SlackService {
  private config: SlackConfig;

  constructor(config?: Partial<SlackConfig>) {
    const configInstance = getConfig();
    const envConfig = configInstance.getForCommunication();

    const signingSecret =
      config?.signingSecret || envConfig.SLACK_SIGNING_SECRET;
    this.config = {
      botToken: config?.botToken || envConfig.SLACK_BOT_TOKEN || "",
      ...(signingSecret && { signingSecret }),
    };

    if (!this.config.botToken) {
      logger.warn("Slack bot token not configured");
    }

    logger.info("Slack service initialized");
  }

  /**
   * Download file from Slack using the private download URL
   * Slack file URLs require authentication via Bearer token
   */
  async downloadFile(downloadUrl: string): Promise<Buffer> {
    if (!this.config.botToken) {
      throw new Error("Slack bot token is required for file downloads");
    }

    try {
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${this.config.botToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download file: ${response.statusText} (${response.status})`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error("Failed to download Slack file", { downloadUrl, error });
      throw error;
    }
  }

  /**
   * Verify Slack request signature (for webhook security)
   * This should be used at the API layer to verify webhooks
   */
  verifyRequestSignature(
    signature: string,
    timestamp: string,
    body: string,
  ): boolean {
    if (!this.config.signingSecret) {
      logger.warn("No signing secret configured, skipping verification");
      return true;
    }

    // Slack signature verification logic
    // Format: v0=hash
    const [version] = signature.split("=");
    if (version !== "v0") {
      return false;
    }

    // Recreate the signature base string
    const sigBaseString = `v0:${timestamp}:${body}`;

    // Create HMAC with SHA256
    const crypto = require("node:crypto");
    const mySignature =
      "v0=" +
      crypto
        .createHmac("sha256", this.config.signingSecret)
        .update(sigBaseString, "utf8")
        .digest("hex");

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(mySignature, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  }
}

// Export singleton instance for convenience
let slackService: SlackService | null = null;

export function getSlackService(): SlackService {
  if (!slackService) {
    try {
      slackService = new SlackService();
    } catch (error) {
      logger.error("Failed to initialize Slack service", error);
      throw error;
    }
  }
  return slackService;
}
