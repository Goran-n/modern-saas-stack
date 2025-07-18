import { TRPCLink, type TRPCClientError } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";

export interface LoggingLinkOptions {
  enabled?: boolean;
  logErrors?: boolean;
  logSlowRequests?: boolean;
  slowRequestThreshold?: number; // milliseconds
  logger?: {
    info: (message: string, data: any) => void;
    warn: (message: string, data: any) => void;
    error: (message: string, data: any) => void;
  };
}

export function createLoggingLink<TRouter extends AnyRouter>(
  options: LoggingLinkOptions = {}
): TRPCLink<TRouter> {
  const {
    enabled = true,
    logErrors = true,
    logSlowRequests = true,
    slowRequestThreshold = 1000,
    logger = console,
  } = options;

  return () => {
    return ({ next, op }) => {
      if (!enabled) {
        return next(op);
      }

      const startTime = Date.now();
      const { type, path, input } = op;

      // Log request start
      logger.info(`[TRPC] ${type} ${path} - Request started`, {
        type,
        path,
        input: sanitiseClientInput(input),
      });

      return observable((observer) => {
        const subscription = next(op).subscribe({
          next(value) {
            const duration = Date.now() - startTime;

            // Success
            const logData = {
              type,
              path,
              duration,
              status: "success",
            };

            if (logSlowRequests && duration > slowRequestThreshold) {
              logger.warn(`[TRPC] ${type} ${path} - Slow request`, logData);
            } else {
              logger.info(`[TRPC] ${type} ${path} - Request completed`, logData);
            }

            observer.next(value);
          },
          error(err: TRPCClientError<TRouter>) {
            const duration = Date.now() - startTime;
            
            if (logErrors) {
              logger.error(`[TRPC] ${type} ${path} - Request failed`, {
                type,
                path,
                duration,
                status: "error",
                error: {
                  message: err.message,
                  code: err.data?.code,
                  httpStatus: err.data?.httpStatus,
                  errorId: err.data?.errorId,
                },
              });
            }

            observer.error(err);
          },
          complete() {
            observer.complete();
          },
        });

        return () => {
          subscription.unsubscribe();
        };
      });
    };
  };
}

function sanitiseClientInput(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "base64Data",
  ];

  const sanitised = { ...input } as Record<string, unknown>;

  for (const key in sanitised) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitised[key] = "[REDACTED]";
    } else if (typeof sanitised[key] === "object" && sanitised[key] !== null) {
      sanitised[key] = sanitiseClientInput(sanitised[key]);
    }
  }

  return sanitised;
}