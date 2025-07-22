/**
 * Browser-compatible logger for the extension
 */

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
  child: (bindings: Record<string, any>) => Logger;
}

function formatMessage(
  level: string,
  service: string,
  message: string,
  ...args: any[]
): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${service}]`;
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    const logMethod = level === "info" ? "log" : level;
    (console as any)[logMethod](prefix, message, ...args);
  } else {
    // In production, only log warnings and errors
    if (level === "error" || level === "warn") {
      (console as any)[level](prefix, message, ...args);
    }
  }
}

export function createLogger(
  service: string,
  bindings?: Record<string, any>,
): Logger {
  const fullService = bindings
    ? `${service}:${JSON.stringify(bindings)}`
    : service;

  return {
    info: (message: string, ...args: any[]) =>
      formatMessage("info", fullService, message, ...args),
    error: (message: string, ...args: any[]) =>
      formatMessage("error", fullService, message, ...args),
    warn: (message: string, ...args: any[]) =>
      formatMessage("warn", fullService, message, ...args),
    debug: (message: string, ...args: any[]) =>
      formatMessage("debug", fullService, message, ...args),
    child: (childBindings: Record<string, any>) =>
      createLogger(service, { ...bindings, ...childBindings }),
  };
}
