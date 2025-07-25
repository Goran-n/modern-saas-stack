import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { communicationRouter } from "./communication";
import { debugRouter } from "./debug";
import { duplicatesRouter } from "./duplicates";
import { filesRouter } from "./files";
import { suppliersRouter } from "./suppliers";
import { tenantRouter } from "./tenant";
import { usersRouter } from "./users";

// Only include debug router in development
const isDevelopment = process.env.NODE_ENV !== "production";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  files: filesRouter,
  suppliers: suppliersRouter,
  tenant: tenantRouter,
  communication: communicationRouter,
  duplicates: duplicatesRouter,
  users: usersRouter,
  ...(isDevelopment ? { debug: debugRouter } : {}),
});

export type AppRouter = typeof appRouter;
