import { getConfig } from "@kibly/config";
import { logger } from "@kibly/utils";
import { Portkey } from "portkey-ai";

let portkeyInstance: Portkey | null = null;

/**
 * Get or create Portkey client instance
 */
export function getPortkeyClient(): Portkey {
  if (!portkeyInstance) {
    const config = getConfig().getCore();

    // Validate Portkey configuration
    if (!config.PORTKEY_API_KEY) {
      logger.error(
        "PORTKEY_API_KEY is not configured. Document extraction will not work.",
      );
      throw new Error(
        "PORTKEY_API_KEY is required for document extraction. Please run: doppler secrets set PORTKEY_API_KEY=<your-key>",
      );
    }

    if (!config.PORTKEY_VIRTUAL_KEY) {
      logger.error(
        "PORTKEY_VIRTUAL_KEY is not configured. Document extraction will not work.",
      );
      throw new Error(
        "PORTKEY_VIRTUAL_KEY is required for document extraction. Please run: doppler secrets set PORTKEY_VIRTUAL_KEY=<your-key>",
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
 * Create an Anthropic model client through Portkey
 */
export function createPortkeyAnthropicModel() {
  const portkey = getPortkeyClient();

  // Portkey acts as a gateway to Anthropic
  // The virtual key should be set up in Portkey dashboard
  // to route to Anthropic with the appropriate API key

  return {
    // This will be used by the Vercel AI SDK
    // Portkey will handle the routing to Anthropic
    apiKey: portkey.apiKey,
    baseURL: portkey.baseURL,
    defaultHeaders: {
      "x-portkey-api-key": portkey.apiKey,
      "x-portkey-mode": "proxy",
      "x-portkey-provider": "anthropic",
      ...(portkey.virtualKey && {
        "x-portkey-virtual-key": portkey.virtualKey,
      }),
    },
  };
}
