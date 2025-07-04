import { z } from 'zod'
import { router, publicProcedure } from '../lib/trpc'

export const healthRouter = router({
  check: publicProcedure
    .query(() => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'kibly-api',
      }
    }),

  ping: publicProcedure
    .input(z.object({ message: z.string().optional() }))
    .query(({ input }) => {
      return {
        pong: true,
        message: input.message || 'Hello from Kibly API!',
        timestamp: new Date().toISOString(),
      }
    }),
})