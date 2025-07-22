/**
 * Simple console wrapper for browser extension
 * Provides a consistent logging interface across the extension
 */

interface ConsoleWrapper {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Simple console wrapper that prefixes messages with timestamp and context
 */
export function createConsole(context?: string): ConsoleWrapper {
  const prefix = context ? `[${context}]` : '[Extension]';

  return {
    log: (...args: any[]) => {
      console.log(`${getTimestamp()} ${prefix}:`, ...args);
    },

    error: (...args: any[]) => {
      console.error(`${getTimestamp()} ${prefix}:`, ...args);
    },

    warn: (...args: any[]) => {
      console.warn(`${getTimestamp()} ${prefix}:`, ...args);
    },

    debug: (...args: any[]) => {
      console.log(`${getTimestamp()} ${prefix} [DEBUG]:`, ...args);
    },

    info: (...args: any[]) => {
      console.log(`${getTimestamp()} ${prefix} [INFO]:`, ...args);
    },
  };
}

// Default console instance
export const extensionConsole = createConsole();