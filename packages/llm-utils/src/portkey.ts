import { getConfig } from "@kibly/config";
import { createLogger } from "@kibly/utils";
import { Portkey } from "portkey-ai";

const logger = createLogger("portkey");

let portkeyInstance: Portkey | null = null;

/**
 * Get or create shared Portkey client instance
 * Used across all services that need LLM access
 */
export function getPortkeyClient(): Portkey {
  if (!portkeyInstance) {
    const config = getConfig().getCore();

    // Validate Portkey configuration
    if (!config.PORTKEY_API_KEY) {
      logger.error(
        "PORTKEY_API_KEY is not configured. LLM services will not work.",
      );
      throw new Error(
        "PORTKEY_API_KEY is required for LLM services. Please run: doppler secrets set PORTKEY_API_KEY=<your-key>",
      );
    }

    if (!config.PORTKEY_VIRTUAL_KEY) {
      logger.error(
        "PORTKEY_VIRTUAL_KEY is not configured. LLM services will not work.",
      );
      throw new Error(
        "PORTKEY_VIRTUAL_KEY is required for LLM services. Please run: doppler secrets set PORTKEY_VIRTUAL_KEY=<your-key>",
      );
    }

    // Construct Portkey client with virtual key as per their guide
    portkeyInstance = new Portkey({
      apiKey: config.PORTKEY_API_KEY,
      virtualKey: config.PORTKEY_VIRTUAL_KEY,
    });

    logger.info("Portkey client initialized", {
      hasVirtualKey: true,
      virtualKey: config.PORTKEY_VIRTUAL_KEY.substring(0, 10) + "...",
    });
  }

  return portkeyInstance;
}

/**
 * Reset the Portkey instance (useful for testing)
 */
export function resetPortkeyClient(): void {
  portkeyInstance = null;
}