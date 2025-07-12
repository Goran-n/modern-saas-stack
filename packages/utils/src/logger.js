import pino from 'pino';
let cachedLogger = null;
let currentConfig = null;
/**
 * Get default logger options based on environment
 */
function getDefaultOptions(config) {
    const level = config?.level || process.env.LOG_LEVEL || 'info';
    const nodeEnv = config?.nodeEnv || process.env.NODE_ENV || 'development';
    const isDevelopment = nodeEnv === 'development';
    const usePretty = config?.pretty !== undefined ? config.pretty : isDevelopment;
    const baseOptions = {
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
    }
    else {
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
function getLogger() {
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
export function configureLogger(config) {
    currentConfig = config;
    cachedLogger = null; // Reset cached logger to force recreation
}
/**
 * Get the main logger instance
 */
export const logger = new Proxy({}, {
    get(_target, prop) {
        const loggerInstance = getLogger();
        const value = loggerInstance[prop];
        if (typeof value === 'function') {
            return value.bind(loggerInstance);
        }
        return value;
    }
});
/**
 * Export child logger factory for scoped logging
 */
export function createLogger(name, bindings) {
    return getLogger().child({ service: name, ...bindings });
}
/**
 * Reset logger (useful for testing)
 */
export function resetLogger() {
    cachedLogger = null;
    currentConfig = null;
}
//# sourceMappingURL=logger.js.map