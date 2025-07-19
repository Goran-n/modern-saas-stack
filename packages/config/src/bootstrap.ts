import { configureLogger, createLogger } from "@kibly/utils";
import {
  Config,
  ConfigValidationError,
  type EnvironmentConfig,
} from "./config";

const logger = createLogger("config-bootstrap");

/**
 * Bootstrap options
 */
export interface BootstrapOptions {
  /** Exit process on validation failure (default: true) */
  exitOnFailure?: boolean;
  /** Custom environment variables */
  customEnv?: Record<string, string>;
  /** Silent mode - don't log success messages */
  silent?: boolean;
}

/**
 * Bootstrap the application configuration
 * This should be called at the very start of your application
 *
 * @param options - Bootstrap options
 * @returns Validated configuration or null if validation failed and exitOnFailure is false
 */
export function bootstrap(
  options: BootstrapOptions = {},
): EnvironmentConfig | null {
  const { exitOnFailure = true, customEnv, silent = false } = options;

  const config = Config.getInstance();

  try {
    // Validate configuration
    const validatedConfig = config.validate(customEnv);

    // Configure logger with validated config
    configureLogger({
      level: validatedConfig.LOG_LEVEL,
      nodeEnv: validatedConfig.NODE_ENV,
      pretty: validatedConfig.NODE_ENV === "development",
    });

    if (!silent) {
      logger.info("🚀 Application configuration bootstrap successful", {
        environment: validatedConfig.NODE_ENV,
        logLevel: validatedConfig.LOG_LEVEL,
        port: validatedConfig.PORT,
        host: validatedConfig.HOST,
      });
    }

    return validatedConfig;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      logger.error("❌ Configuration bootstrap failed", {
        error: error.message,
        validationErrors: error.errors.errors.length,
      });

      // Log each validation error for better debugging
      error.errors.errors.forEach((err, index) => {
        logger.error(`  ${index + 1}. ${err.path.join(".")}: ${err.message}`);
      });

      if (exitOnFailure) {
        logger.error("Exiting due to configuration validation failure...");
        process.exit(1);
      }

      return null;
    }

    // Unexpected error
    logger.error("❌ Unexpected error during configuration bootstrap", {
      error,
    });

    if (exitOnFailure) {
      logger.error("Exiting due to unexpected error...");
      process.exit(1);
    }

    return null;
  }
}

/**
 * Bootstrap configuration for a specific service/package
 * Validates only the required configuration for that service
 *
 * @param service - The service to bootstrap for
 * @param options - Bootstrap options
 * @returns Service-specific configuration
 */
export function bootstrapForService(
  service: "file-manager" | "web-app" | "core",
  options: BootstrapOptions = {},
) {
  const fullConfig = bootstrap(options);
  if (!fullConfig) {
    return null;
  }

  const config = Config.getInstance();

  try {
    switch (service) {
      case "file-manager":
        return config.getForFileManager();
      case "web-app":
        return config.getForWebApp();
      case "core":
        return config.getCore();
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  } catch (error) {
    logger.error(`Failed to get configuration for service: ${service}`, {
      error,
    });

    if (options.exitOnFailure !== false) {
      process.exit(1);
    }

    return null;
  }
}

/**
 * Validate required environment variables for production deployment
 * Use this in CI/CD pipelines to catch configuration issues early
 */
export function validateProductionConfig(): boolean {
  try {
    const config = Config.getInstance();

    // Force production validation
    const productionEnv = {
      ...process.env,
      NODE_ENV: "production",
    };

    config.validate(productionEnv);
    logger.info("✅ Production configuration validation successful");
    return true;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      logger.error("❌ Production configuration validation failed");
      logger.error(error.message);
    } else {
      logger.error("❌ Unexpected error during production validation", {
        error,
      });
    }
    return false;
  }
}

/**
 * Print configuration summary (without sensitive values)
 * Useful for debugging and deployment verification
 */
export function printConfigSummary(): void {
  const config = Config.getInstance();

  if (!config.isValid()) {
    logger.warn("Configuration not validated. Call bootstrap() first.");
    return;
  }

  const fullConfig = config.get();

  // Create summary without sensitive values
  const summary = {
    environment: fullConfig.NODE_ENV,
    logLevel: fullConfig.LOG_LEVEL,
    port: fullConfig.PORT,
    host: fullConfig.HOST,
    webPort: fullConfig.WEB_PORT,
    apiUrl: fullConfig.API_URL,
    redisHost: fullConfig.REDIS_HOST,
    redisPort: fullConfig.REDIS_PORT,
    redisTls: fullConfig.REDIS_TLS,
    databaseConfigured: !!fullConfig.DATABASE_URL,
    supabaseConfigured:
      !!fullConfig.SUPABASE_URL && !!fullConfig.SUPABASE_ANON_KEY,
    jwtConfigured: !!fullConfig.JWT_SECRET,
  };

  logger.info("📋 Configuration Summary", summary);
}
