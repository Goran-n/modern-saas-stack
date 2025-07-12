import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

let cachedLogger: Logger | null = null;
let currentConfig: LoggerConfig | null = null;

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level?: string;
  nodeEnv?: string;
  pretty?: boolean;
}

/**
 * Get default logger options based on environment
 */
function getDefaultOptions(config?: LoggerConfig): LoggerOptions {
  const level = config?.level || process.env.LOG_LEVEL || 'info';
  const nodeEnv = config?.nodeEnv || process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const usePretty = config?.pretty !== undefined ? config.pretty : isDevelopment;

  const baseOptions: LoggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  };

  if (usePretty) {
    // Development configuration with pretty printing
    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    };
  } else {
    // Production configuration (structured JSON)
    return {
      ...baseOptions,
      formatters: {
        level: (label) => ({ level: label }),
      },
    };
  }
}

/**
 * Get or create the logger instance
 */
function getLogger(): Logger {
  if (!cachedLogger) {
    const options = getDefaultOptions(currentConfig || undefined);
    cachedLogger = pino(options);
  }
  return cachedLogger;
}

/**
 * Configure the logger with new settings
 * This will recreate the logger with the new configuration
 */
export function configureLogger(config: LoggerConfig): void {
  currentConfig = config;
  cachedLogger = null; // Reset cached logger to force recreation
}

/**
 * Get the main logger instance
 */
export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop) {
    const loggerInstance = getLogger();
    const value = loggerInstance[prop as keyof Logger];
    if (typeof value === 'function') {
      return value.bind(loggerInstance);
    }
    return value;
  }
});

/**
 * Export child logger factory for scoped logging
 */
export function createLogger(name: string, bindings?: Record<string, any>): Logger {
  return getLogger().child({ service: name, ...bindings });
}

/**
 * Reset logger (useful for testing)
 */
export function resetLogger(): void {
  cachedLogger = null;
  currentConfig = null;
}

// Re-export types for convenience
export type { Logger } from 'pino';