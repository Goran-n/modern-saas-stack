import { z } from 'zod'
import { router, authedProcedure, tenantProcedure } from '../lib/trpc'
import { container, TOKENS } from '../shared/utils/container'
import type { TenantApplicationService } from '../core/application/tenant.application-service'

// Input validation schemas
const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  slug: z.string().optional(),
})

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  settings: z.record(z.unknown()).optional(),
  subscription: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'member', 'admin', 'owner']),
  customPermissions: z.record(z.unknown()).optional(),
})

const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(['viewer', 'member', 'admin', 'owner']),
})

export const tenantRouter = router({
  // Create a new tenant
  create: authedProcedure
    .input(createTenantSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      
      return await tenantAppService.createTenant({
        name: input.name,
        email: input.email,
        ownerId: ctx.user.id,
        ...(input.slug && { slug: input.slug }),
      })
    }),

  // Get user's tenants
  list: authedProcedure
    .query(async ({ ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      return await tenantAppService.getUserTenants(ctx.user.id)
    }),

  // Get current tenant details
  current: tenantProcedure
    .query(async ({ ctx }) => {
      return ctx.tenantContext.tenant
    }),

  // Update tenant
  update: tenantProcedure
    .input(updateTenantSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      
      return await tenantAppService.updateTenant({
        tenantId: ctx.tenantContext.tenantId,
        membership: ctx.tenantContext.membership,
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email }),
        ...(input.settings && { settings: input.settings }),
        ...(input.subscription && { subscription: input.subscription }),
        ...(input.metadata && { metadata: input.metadata }),
      })
    }),

  // Get tenant members
  members: tenantProcedure
    .query(async ({ ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      
      return await tenantAppService.getMembers({
        tenantId: ctx.tenantContext.tenantId,
        membership: ctx.tenantContext.membership,
      })
    }),

  // Invite member
  inviteMember: tenantProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      
      return await tenantAppService.inviteMember({
        tenantId: ctx.tenantContext.tenantId,
        invitedEmail: input.email,
        invitedBy: ctx.user!.id,
        role: input.role,
        membership: ctx.tenantContext.membership,
        ...(input.customPermissions && { customPermissions: input.customPermissions }),
      })
    }),

  // Update member role
  updateMemberRole: tenantProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      
      return await tenantAppService.updateMemberRole({
        memberId: input.memberId,
        role: input.role,
        updatedBy: ctx.user!.id,
        membership: ctx.tenantContext.membership,
      })
    }),

  // Remove member
  removeMember: tenantProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      
      await tenantAppService.removeMember({
        memberId: input.memberId,
        removedBy: ctx.user!.id,
        membership: ctx.tenantContext.membership,
      })
      
      return { success: true }
    }),

  // Get member permissions
  myPermissions: tenantProcedure
    .query(async ({ ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      return tenantAppService.getMemberPermissions(ctx.tenantContext.membership)
    }),

  // Accept invitation (public endpoint)
  acceptInvitation: authedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      return await tenantAppService.acceptInvitation({
        token: input.token,
        userId: ctx.user!.id,
      })
    }),

  // Validate tenant access
  validateAccess: authedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantAppService = container.resolve(TOKENS.TENANT_APPLICATION_SERVICE) as TenantApplicationService
      const hasAccess = await tenantAppService.validateAccess({
        tenantId: input.tenantId,
        userId: ctx.user!.id,
      })
      return { hasAccess }
    }),
})