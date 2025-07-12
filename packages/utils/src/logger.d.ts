import type { Logger } from 'pino';
/**
 * Logger configuration interface
 */
export interface LoggerConfig {
    level?: string;
    nodeEnv?: string;
    pretty?: boolean;
}
/**
 * Configure the logger with new settings
 * This will recreate the logger with the new configuration
 */
export declare function configureLogger(config: LoggerConfig): void;
/**
 * Get the main logger instance
 */
export declare const logger: Logger;
/**
 * Export child logger factory for scoped logging
 */
export declare function createLogger(name: string, bindings?: Record<string, any>): Logger;
/**
 * Reset logger (useful for testing)
 */
export declare function resetLogger(): void;
export type { Logger } from 'pino';
//# sourceMappingURL=logger.d.ts.map