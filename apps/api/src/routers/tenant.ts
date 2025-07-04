import { z } from 'zod'
import { router, authedProcedure, tenantProcedure } from '../lib/trpc'
import { getTenantService, getTenantMemberService } from '../lib/di/services'
import { validateSlug } from '../utils/slug'

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
      const tenantService = await getTenantService()
      
      // Validate slug if provided
      if (input.slug && !validateSlug(input.slug)) {
        throw new Error('Invalid slug format')
      }
      
      const tenantData: any = {
        name: input.name,
        email: input.email,
        ownerId: ctx.user.id,
      }
      if (input.slug !== undefined) tenantData.slug = input.slug
      
      const tenant = await tenantService.createTenant(tenantData)
      
      return tenant
    }),

  // Get user's tenants
  list: authedProcedure
    .query(async ({ ctx }) => {
      const tenantService = await getTenantService()
      
      return await tenantService.getUserTenants(ctx.user.id)
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
      const tenantService = await getTenantService()
      const memberService = await getTenantMemberService()
      
      // Check if user has permission to update tenant
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'tenant',
        'manageSettings'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update tenant')
      }
      
      const updateData: any = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.email !== undefined) updateData.email = input.email
      if (input.settings !== undefined) updateData.settings = input.settings
      if (input.subscription !== undefined) updateData.subscription = input.subscription
      if (input.metadata !== undefined) updateData.metadata = input.metadata
      
      return await tenantService.updateTenant(ctx.tenantContext.tenantId, updateData)
    }),

  // Get tenant members
  members: tenantProcedure
    .query(async ({ ctx }) => {
      const memberService = await getTenantMemberService()
      
      // Check if user can view members
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'team',
        'viewMembers'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view members')
      }
      
      return await memberService.getMembersByTenant(ctx.tenantContext.tenantId)
    }),

  // Invite member
  inviteMember: tenantProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const memberService = await getTenantMemberService()
      
      // Check if user can invite members
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'team',
        'inviteMembers'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to invite members')
      }
      
      const inviteData: any = {
        tenantId: ctx.tenantContext.tenantId,
        invitedEmail: input.email,
        invitedBy: ctx.user!.id,
        role: input.role,
      }
      if (input.customPermissions !== undefined) {
        inviteData.customPermissions = input.customPermissions
      }
      
      return await memberService.inviteMember(inviteData)
    }),

  // Update member role
  updateMemberRole: tenantProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const memberService = await getTenantMemberService()
      
      // Check if user can manage members
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'team',
        'manageMembers'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to manage members')
      }
      
      return await memberService.updateMemberRole(
        input.memberId,
        input.role,
        ctx.user!.id
      )
    }),

  // Remove member
  removeMember: tenantProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const memberService = await getTenantMemberService()
      
      // Check if user can remove members
      const hasPermission = memberService.hasPermission(
        ctx.tenantContext.membership,
        'team',
        'removeMembers'
      )
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to remove members')
      }
      
      await memberService.removeMember(input.memberId, ctx.user!.id)
      return { success: true }
    }),

  // Get member permissions
  myPermissions: tenantProcedure
    .query(async ({ ctx }) => {
      const memberService = await getTenantMemberService()
      return memberService.getMemberPermissions(ctx.tenantContext.membership)
    }),

  // Accept invitation (public endpoint)
  acceptInvitation: authedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const memberService = await getTenantMemberService()
      return await memberService.acceptInvitation(input.token, ctx.user!.id)
    }),

  // Validate tenant access
  validateAccess: authedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantService = await getTenantService()
      const hasAccess = await tenantService.validateTenantAccess(input.tenantId, ctx.user!.id)
      return { hasAccess }
    }),
})