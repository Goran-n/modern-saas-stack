import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

// Default configuration
const defaultOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
};

// Development configuration with pretty printing
const devOptions: LoggerOptions = {
  ...defaultOptions,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
};

// Production configuration (structured JSON)
const prodOptions: LoggerOptions = {
  ...defaultOptions,
  formatters: {
    level: (label) => ({ level: label }),
  },
};

// Create logger instance based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const options = isDevelopment ? devOptions : prodOptions;

export const logger: Logger = pino(options);

// Export child logger factory for scoped logging
export function createLogger(name: string, bindings?: Record<string, any>): Logger {
  return logger.child({ service: name, ...bindings });
}

// Re-export types for convenience
export type { Logger } from 'pino';