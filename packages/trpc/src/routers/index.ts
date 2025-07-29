import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { debugRouter } from "./debug";
import { duplicatesRouter } from "./duplicates";
import { emailRouter } from "./email";
import { filesRouter } from "./files";
import { invitationsRouter } from "./invitations";
import { searchRouter } from "./search";
import { suppliersRouter } from "./suppliers";
import { tenantRouter } from "./tenant";
import { usersRouter } from "./users";

// Only include debug router in development
const isDevelopment = process.env.NODE_ENV !== "production";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  email: emailRouter,
  files: filesRouter,
  invitations: invitationsRouter,
  search: searchRouter,
  suppliers: suppliersRouter,
  tenant: tenantRouter,
  duplicates: duplicatesRouter,
  users: usersRouter,
  ...(isDevelopment ? { debug: debugRouter } : {}),
});

export type AppRouter = typeof appRouter;
