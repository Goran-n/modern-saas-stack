import { z } from 'zod'
import { router, publicProcedure } from '../lib/trpc'

export const userRouter = router({
  getAll: publicProcedure
    .query(() => {
      // TODO: Replace with actual database query
      return [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ]
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      // TODO: Replace with actual database query
      return {
        id: input.id,
        name: 'John Doe',
        email: 'john@example.com',
      }
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }))
    .mutation(({ input }) => {
      // TODO: Replace with actual database insert
      return {
        id: Math.floor(Math.random() * 1000),
        name: input.name,
        email: input.email,
        createdAt: new Date().toISOString(),
      }
    }),
})