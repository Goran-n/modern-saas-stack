/**
 * Browser-safe configuration for the extension
 */
import { env, validateEnv } from "../config/env";

interface BrowserConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_URL: string;
  APP_URL: string;
}

class BrowserConfigManager {
  private config: BrowserConfig;

  constructor() {
    // Validate environment variables on initialization
    validateEnv();

    this.config = {
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
      API_URL: env.API_URL,
      APP_URL: env.APP_URL,
    };
  }

  getCore() {
    return {
      SUPABASE_URL: this.config.SUPABASE_URL,
      SUPABASE_ANON_KEY: this.config.SUPABASE_ANON_KEY,
    };
  }

  getApiConfig() {
    return {
      API_URL: this.config.API_URL,
      APP_URL: this.config.APP_URL,
    };
  }
}

// Singleton instance
let configInstance: BrowserConfigManager;

export function getConfig(): BrowserConfigManager {
  if (!configInstance) {
    configInstance = new BrowserConfigManager();
  }
  return configInstance;
}
