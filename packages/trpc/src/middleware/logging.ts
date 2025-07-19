import { logger } from "@kibly/utils";
import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc";

interface LogContext {
  requestId: string;
  userId?: string | undefined;
  tenantId?: string | undefined;
  path: string;
  type: "query" | "mutation" | "subscription";
  input?: unknown;
  startTime: number;
}

function sanitiseInput(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "authorization",
    "cookie",
    "session",
    "creditCard",
    "ssn",
    "base64Data", // Large file data
  ];

  const sanitised = { ...input } as Record<string, unknown>;

  for (const key in sanitised) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitised[key] = "[REDACTED]";
    } else if (typeof sanitised[key] === "object" && sanitised[key] !== null) {
      sanitised[key] = sanitiseInput(sanitised[key]);
    }
  }

  return sanitised;
}

function getResponseSize(data: unknown): number {
  try {
    return JSON.stringify(data).length;
  } catch {
    return -1;
  }
}

export const loggingMiddleware = middleware(
  async ({ ctx, next, path, type, input }) => {
    const logContext: LogContext = {
      requestId: ctx.requestId,
      userId: ctx.user?.id,
      tenantId: ctx.tenantId || undefined,
      path,
      type,
      input: sanitiseInput(input),
      startTime: Date.now(),
    };

    logger.info({
      ...logContext,
      userAgent: ctx.headers.get("user-agent"),
      ip: ctx.headers.get("x-forwarded-for") || ctx.headers.get("x-real-ip"),
      msg: `TRPC Request Started: ${path}`,
    });

    try {
      const result = await next();
      const duration = Date.now() - logContext.startTime;

      logger.info({
        ...logContext,
        duration,
        status: "success",
        responseSize: getResponseSize(result),
        msg: `TRPC Request Completed: ${path}`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - logContext.startTime;

      if (error instanceof TRPCError) {
        const logLevel =
          error.code === "INTERNAL_SERVER_ERROR" ? "error" : "warn";

        logger[logLevel]({
          err: error,
          ...logContext,
          duration,
          status: "error",
          errorCode: error.code,
          errorCause: error.cause,
          msg: "TRPC Request Failed",
        });
      } else if (error instanceof Error) {
        logger.error({
          err: error,
          ...logContext,
          duration,
          status: "error",
          msg: "TRPC Request Failed - Unexpected Error",
        });
      } else {
        logger.error({
          error: String(error),
          ...logContext,
          duration,
          status: "error",
          msg: "TRPC Request Failed - Unknown Error",
        });
      }

      throw error;
    }
  },
);

export const createLoggingMiddleware = () => loggingMiddleware;
