import { logger } from "@kibly/utils";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { errorTracker } from "../services/error-tracker";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    // Track error and get ID
    const errorId = errorTracker.trackError(error, {
      path: shape.data.path,
      userId: ctx?.user?.id || undefined,
      tenantId: ctx?.tenantId || undefined,
      requestId: ctx?.requestId,
    });

    logger.error({
      err: error,
      errorId,
      requestId: ctx?.requestId,
      userId: ctx?.user?.id || undefined,
      tenantId: ctx?.tenantId || undefined,
      path: shape.data.path,
      msg: `TRPC Error: ${error.message}`,
    });

    return {
      ...shape,
      data: {
        ...shape.data,
        errorId,
        zodError:
          error.cause instanceof Error && error.code === "BAD_REQUEST"
            ? error.cause
            : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const middleware = t.middleware;

// Base procedure for internal use only - should not be exported directly
export const baseProcedure = t.procedure;
