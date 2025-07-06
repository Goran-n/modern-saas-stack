import { z } from 'zod'
import { router, publicProcedure, tenantProcedure } from '../lib/trpc'
import { TRPCError } from '@trpc/server'

// Command/Query imports
import { CreateUserCommand } from '../core/application/commands/user/create-user.command'
import { ChangeUserEmailCommand } from '../core/application/commands/user/change-user-email.command'
import { GetUserQuery } from '../core/application/queries/user/get-user.query'

// Domain imports
import { UserEntity } from '../core/domain/user'

// Bus imports
import type { CommandBus } from '../core/application/shared/command'
import type { QueryBus } from '../core/application/shared/query'
import { container, TOKENS } from '../shared/utils/container'

// Input validation schemas (co-located with routes, not in shared package)
const createUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8).optional(),
})

const updateUserEmailSchema = z.object({
  userId: z.string().uuid(),
  newEmail: z.string().email(),
})

const getUserSchema = z.object({
  userId: z.string().uuid(),
})

// Helper functions to get buses from container
const getCommandBus = () => container.resolve<CommandBus>(TOKENS.COMMAND_BUS)
const getQueryBus = () => container.resolve<QueryBus>(TOKENS.QUERY_BUS)

export const enhancedUserRouter = router({
  // Create user using command pattern
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      try {
        const command = new CreateUserCommand(
          input.email,
          input.phone,
          input.firstName,
          input.lastName,
          input.password
        )
        
        const user = await getCommandBus().execute<UserEntity>(command)
        
        // Return simple serialization of domain entity
        return {
          id: user.id.toString(),
          email: user.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          status: user.status,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: error.message,
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        })
      }
    }),

  // Get user using query pattern
  get: tenantProcedure
    .input(getUserSchema)
    .query(async ({ input, ctx }) => {
      try {
        const query = new GetUserQuery(input.userId, ctx.user!.id)
        const user = await getQueryBus().execute<UserEntity | null>(query)
        
        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          })
        }
        
        // Return simple serialization
        return {
          id: user.id.toString(),
          email: user.email,
          phone: user.phone,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          status: user.status,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          lastLoginAt: user.lastLoginAt?.toISOString(),
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          })
        }
        throw error
      }
    }),

  // Update user email using command pattern
  changeEmail: tenantProcedure
    .input(updateUserEmailSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const command = new ChangeUserEmailCommand(
          input.userId,
          input.newEmail,
          ctx.user!.id
        )
        
        const user = await getCommandBus().execute<UserEntity>(command)
        
        return {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          updatedAt: user.updatedAt.toISOString(),
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            })
          }
          if (error.message.includes('already in use')) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: error.message,
            })
          }
          if (error.message.includes('own email')) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: error.message,
            })
          }
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user email',
        })
      }
    }),

  // Get current user (authenticated)
  me: tenantProcedure
    .query(async ({ ctx }) => {
      const query = new GetUserQuery(ctx.user!.id, ctx.user!.id)
      const user = await getQueryBus().execute<UserEntity | null>(query)
      
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }
      
      return {
        id: user.id.toString(),
        email: user.email,
        phone: user.phone,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        displayName: user.displayName,
        initials: user.initials,
        canLogin: user.canLogin(),
        isFullyVerified: user.isFullyVerified(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }
    }),
})