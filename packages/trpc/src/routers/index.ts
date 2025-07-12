import { createTRPCRouter } from "../trpc";
import { filesRouter } from "./files";

export const appRouter = createTRPCRouter({
  files: filesRouter,
});

export type AppRouter = typeof appRouter;