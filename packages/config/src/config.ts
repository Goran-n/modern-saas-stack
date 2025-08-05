import { createLogger } from "@figgy/utils";
import { z } from "zod";
import { type EnvironmentConfig, getEnvironmentSchema } from "./environments";
import {
  type BackendConfig,
  type FrontendConfig,
  type ExtensionConfig,
  backendSchema,
  frontendSchema,
  extensionSchema,
} from "./schemas";

const logger = createLogger("config");

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError,
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

/**
 * Main configuration class for managing and validating environment variables
 */
export class Config {
  private static instance: Config | null = null;
  private _config: EnvironmentConfig | null = null;
  private _validated = false;

  private constructor() {}

  /**
   * Get the singleton config instance
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Reset the config instance (useful for testing)
   */
  public static reset(): void {
    Config.instance = null;
  }

  /**
   * Validate and load configuration based on current environment
   * @param customEnv - Custom environment variables (useful for testing)
   * @returns Validated configuration object
   */
  public validate(customEnv?: Record<string, string>): EnvironmentConfig {
    const env = customEnv || process.env;
    const nodeEnv = env.NODE_ENV || "development";

    logger.info("Validating configuration", { environment: nodeEnv });

    try {
      // Get the appropriate schema for the environment
      const schema = getEnvironmentSchema(nodeEnv);

      // Parse and validate the environment variables
      const result = schema.parse(env);

      this._config = result;
      this._validated = true;

      logger.info("Configuration validation successful", {
        environment: nodeEnv,
        configKeys: Object.keys(result).length,
      });

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = this.formatValidationErrors(error);
        logger.error("Configuration validation failed", {
          environment: nodeEnv,
          errors: error.issues,
        });
        throw new ConfigValidationError(errorMessage, error);
      }
      throw error;
    }
  }

  /**
   * Get validated configuration (must call validate first)
   */
  public get(): EnvironmentConfig {
    if (!this._validated || !this._config) {
      throw new Error("Configuration not validated. Call validate() first.");
    }
    return this._config;
  }

  /**
   * Get backend configuration
   */
  public getBackend(): BackendConfig {
    const config = this.get();
    return backendSchema.parse(config);
  }

  /**
   * Get frontend configuration
   */
  public getFrontend(): FrontendConfig {
    const config = this.get();
    return frontendSchema.parse(config);
  }

  /**
   * Get extension configuration
   */
  public getExtension(): ExtensionConfig {
    const config = this.get();
    return extensionSchema.parse(config);
  }

  /**
   * Legacy methods for backward compatibility
   */
  public getForFileManager(): BackendConfig {
    return this.getBackend();
  }

  public getForWebApp(): FrontendConfig {
    return this.getFrontend();
  }

  public getCore(): BackendConfig {
    return this.getBackend();
  }

  public getForTenant(): BackendConfig {
    return this.getBackend();
  }

  public getForCommunication(): BackendConfig {
    return this.getBackend();
  }

  /**
   * Check if configuration is valid without throwing
   */
  public isValid(): boolean {
    return this._validated && this._config !== null;
  }

  /**
   * Get current environment
   */
  public getEnvironment(): string {
    return this._config?.NODE_ENV || process.env.NODE_ENV || "development";
  }

  /**
   * Format Zod validation errors into a readable message
   */
  private formatValidationErrors(error: z.ZodError): string {
    const errors = error.issues.map((err: any) => {
      const path = err.path.join(".");
      return `${path}: ${err.message}`;
    });

    return `Configuration validation failed:\n${errors.join("\n")}`;
  }
}

/**
 * Get the global config instance
 */
export function getConfig(): Config {
  return Config.getInstance();
}

/**
 * Convenience function to validate and get configuration
 */
export function validateConfig(
  customEnv?: Record<string, string>,
): EnvironmentConfig {
  const config = getConfig();
  return config.validate(customEnv);
}

// Type exports for convenience
export type {
  EnvironmentConfig,
  BackendConfig,
  FrontendConfig,
  ExtensionConfig,
};

// Legacy type aliases for backward compatibility
export type CoreConfig = BackendConfig;
export type FileManagerConfig = BackendConfig;
export type WebAppConfig = FrontendConfig;
export type TenantConfig = BackendConfig;
export type CommunicationConfig = BackendConfig;
export type FullConfig = BackendConfig;