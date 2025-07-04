import { initTRPC, TRPCError } from '@trpc/server'
import { trpcErrorFormatter } from '../middleware/error-handler'
import type { TRPCContext } from './context'


// Initialize tRPC with proper configuration
const t = initTRPC.context<TRPCContext>().create({
  errorFormatter: trpcErrorFormatter,
})

// Export base utilities
export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// Logging middleware
const loggingMiddleware = middleware(async ({ ctx, next, path, type }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start
  
  ctx.log.info(`${type} ${path} completed in ${duration}ms`, {
    duration,
    requestId: ctx.requestId,
    userId: ctx.user?.id,
    tenantId: ctx.tenantContext?.tenantId,
  })
  
  return result
})

// Authentication middleware
const authMiddleware = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Type narrowing
    },
  })
})

// Tenant context middleware
const tenantMiddleware = middleware(({ ctx, next }) => {
  if (!ctx.tenantContext) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Tenant context required',
    })
  }
  return next({
    ctx: {
      ...ctx,
      tenantContext: ctx.tenantContext, // Type narrowing
    },
  })
})

// Procedure variants
export const loggedProcedure = publicProcedure.use(loggingMiddleware)
export const authedProcedure = publicProcedure.use(authMiddleware)
export const tenantProcedure = authedProcedure.use(tenantMiddleware)

// Procedure variants with logging
export const loggedAuthedProcedure = authedProcedure.use(loggingMiddleware)
export const loggedTenantProcedure = tenantProcedure.use(loggingMiddleware)