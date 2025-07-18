import { createTRPCRouter } from "../trpc";
import { filesRouter } from "./files";
import { suppliersRouter } from "./suppliers";
import { authRouter } from "./auth";
import { debugRouter } from "./debug";

// Only include debug router in development
const isDevelopment = process.env.NODE_ENV !== "production";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  files: filesRouter,
  suppliers: suppliersRouter,
  ...(isDevelopment ? { debug: debugRouter } : {}),
});

export type AppRouter = typeof appRouter;