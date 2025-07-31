import { createTRPCRouter } from "../trpc";
import { healthRouter } from "./health";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;