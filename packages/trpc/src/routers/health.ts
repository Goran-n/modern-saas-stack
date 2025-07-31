import { checkDatabaseHealth } from "@my-app/shared-db";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const healthRouter = createTRPCRouter({
  check: publicProcedure.query(async () => {
    const dbHealthy = await checkDatabaseHealth();
    
    return {
      status: dbHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
      },
    };
  }),
});