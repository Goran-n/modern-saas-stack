import type { Logger } from "pino";

/**
 * Standard error handler utility for consistent error logging across the application
 */
export function logError(
  logger: Logger,
  message: string,
  error: unknown,
  context?: Record<string, any>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  const errorType = error instanceof Error ? error.constructor.name : typeof error;
  
  logger.error(message, {
    error: errorMessage,
    stack: errorStack,
    errorType,
    ...context,
  });
}

/**
 * Standard error handler that logs and returns a standardized error response
 * Useful for API endpoints and service methods that need to return error states
 */
export function handleError<T = any>(
  logger: Logger,
  message: string,
  error: unknown,
  context?: Record<string, any>
): { success: false; error: string; details?: T } {
  logError(logger, message, error, context);
  
  return {
    success: false,
    error: error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

/**
 * Standard error handler for async operations that may throw
 * Logs the error and re-throws it for upstream handling
 */
export function logAndRethrow(
  logger: Logger,
  message: string,
  error: unknown,
  context?: Record<string, any>
): never {
  logError(logger, message, error, context);
  throw error;
}