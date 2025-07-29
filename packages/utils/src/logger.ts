// Dead simple console wrapper
export interface Logger {
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  trace: (...args: any[]) => void;
  fatal: (...args: any[]) => void;
  child: (bindings: Record<string, any>) => Logger;
  level: string;
  silent: (...args: any[]) => void;
}

export interface LoggerConfig {
  level?: string;
  nodeEnv?: string;
  pretty?: boolean;
}

function getTimestamp(): string {
  const now = new Date();
  return `[${now.toTimeString().slice(0, 8)}]`;
}

class ConsoleLogger implements Logger {
  private prefix: string;
  public level: string = "debug";

  constructor(name?: string) {
    this.prefix = name ? `${name}: ` : "";
  }

  info(...args: any[]) {
    console.log(getTimestamp(), "INFO:", this.prefix, ...args);
  }

  error(...args: any[]) {
    // Special handling for objects to ensure they're fully displayed
    const processedArgs = args.map((arg) => {
      if (arg && typeof arg === "object") {
        // For error objects, include the full error
        if (arg instanceof Error) {
          return `Error: ${arg.message}\nStack: ${arg.stack}`;
        }
        // For other objects, use JSON.stringify for full output
        try {
          return JSON.stringify(arg, null, 2);
        } catch (_e) {
          return arg; // Fallback if circular reference
        }
      }
      return arg;
    });
    console.error(getTimestamp(), "ERROR:", this.prefix, ...processedArgs);
  }

  warn(...args: any[]) {
    console.warn(getTimestamp(), "WARN:", this.prefix, ...args);
  }

  debug(...args: any[]) {
    console.log(getTimestamp(), "DEBUG:", this.prefix, ...args);
  }

  trace(...args: any[]) {
    console.log(getTimestamp(), "TRACE:", this.prefix, ...args);
  }

  fatal(...args: any[]) {
    console.error(getTimestamp(), "FATAL:", this.prefix, ...args);
  }

  silent(..._args: any[]) {
    // No-op - silent logging
  }

  child(bindings: Record<string, any>): Logger {
    return new ConsoleLogger(bindings.service || this.prefix);
  }
}

export const logger = new ConsoleLogger();

export function createLogger(
  name: string,
  _bindings?: Record<string, any>,
): Logger {
  return new ConsoleLogger(name);
}

export function configureLogger(_config: LoggerConfig): void {
  // No-op
}

export function resetLogger(): void {
  // No-op
}
