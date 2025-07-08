import { createLogger } from '@kibly/utils/logger'
import type { DrizzleClient } from '@kibly/shared-db'

const logger = createLogger('tenant')
import { 
  users, 
  tenants, 
  tenantMembers,
  invitations 
} from '@kibly/shared-db/schemas/tenants'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { addDays } from 'date-fns'
import type {
  CreateTenantInput,
  UpdateTenantInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  CheckPermissionInput,
  CreateUserInput,
  Tenant,
  User,
  TenantMember,
  Invitation,
  AuthToken,
  Permission,
  TenantStatus
} from './types'
import { rolePermissions } from './types'

export class TenantService {
  constructor(
    private db: DrizzleClient,
    private jwtSecret: string = process.env.JWT_SECRET || 'default-secret'
  ) {}

  // Tenant management
  async createTenant(input: CreateTenantInput): Promise<{ tenant: Tenant; member: TenantMember }> {
    logger.info('Creating new tenant', { name: input.name, ownerId: input.ownerId })

    // Start transaction
    const result = await this.db.transaction(async (tx) => {
      // Create tenant
      const [tenant] = await tx.insert(tenants).values({
        name: input.name,
        slug: input.slug,
        email: input.email,
        status: 'active',
        settings: input.settings || {},
        subscription: input.subscription || {},
        metadata: input.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning()

      // Add user as owner
      const [member] = await tx.insert(tenantMembers).values({
        id: uuidv4(),
        tenantId: tenant.id,
        userId: input.ownerId,
        role: 'owner',
        invitedBy: null,
        joinedAt: new Date(),
        updatedAt: new Date()
      }).returning()

      logger.info('Tenant created successfully', { 
        tenantId: tenant.id, 
        userId: input.ownerId,
        role: 'OWNER'
      })

      return { tenant, member }
    })

    return {
      ...result,
      tenant: {
        ...result.tenant,
        settings: result.tenant.settings as Record<string, any>,
        subscription: result.tenant.subscription as Record<string, any>,
        metadata: result.tenant.metadata as Record<string, any>
      } as Tenant
    }
  }

  async updateTenant(input: UpdateTenantInput): Promise<Tenant> {
    logger.info('Updating tenant', { tenantId: input.tenantId })

    const updates: any = {
      updatedAt: new Date()
    }

    if (input.name !== undefined) updates.name = input.name
    if (input.status !== undefined) updates.status = input.status
    if (input.settings !== undefined) updates.settings = input.settings
    if (input.subscription !== undefined) updates.subscription = input.subscription
    if (input.metadata !== undefined) updates.metadata = input.metadata

    const [updated] = await this.db.update(tenants)
      .set(updates)
      .where(eq(tenants.id, input.tenantId))
      .returning()

    if (!updated) {
      throw new Error('Tenant not found')
    }

    logger.info('Tenant updated', { tenantId: updated.id })
    return {
      ...updated,
      settings: updated.settings as Record<string, any>,
      subscription: updated.subscription as Record<string, any>,
      metadata: updated.metadata as Record<string, any>
    } as Tenant
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const [tenant] = await this.db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)

    return tenant ? {
      ...tenant,
      settings: tenant.settings as Record<string, any>,
      subscription: tenant.subscription as Record<string, any>,
      metadata: tenant.metadata as Record<string, any>
    } as Tenant : null
  }

  async listTenants(filters?: { status?: TenantStatus }): Promise<Tenant[]> {
    const results = await this.db.select()
      .from(tenants)
      .where(filters?.status ? eq(tenants.status, filters.status) : undefined)
      .orderBy(desc(tenants.createdAt))

    return results.map(tenant => ({
      ...tenant,
      settings: tenant.settings as Record<string, any>,
      subscription: tenant.subscription as Record<string, any>,
      metadata: tenant.metadata as Record<string, any>
    } as Tenant))
  }

  // Member management
  async inviteMember(input: InviteMemberInput): Promise<Invitation> {
    logger.info('Inviting member', { 
      tenantId: input.tenantId, 
      email: input.email,
      role: input.role 
    })

    // Check if user already exists
    const [existingUser] = await this.db.select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)

    if (existingUser) {
      // Check if already a member
      const [existingMember] = await this.db.select()
        .from(tenantMembers)
        .where(and(
          eq(tenantMembers.tenantId, input.tenantId),
          eq(tenantMembers.userId, existingUser.id)
        ))
        .limit(1)

      if (existingMember) {
        throw new Error('User is already a member of this tenant')
      }
    }

    // Create invitation
    const [invitation] = await this.db.insert(invitations).values({
      id: uuidv4(),
      tenantId: input.tenantId,
      email: input.email,
      role: input.role,
      invitedBy: input.invitedBy,
      token: nanoid(32),
      expiresAt: addDays(new Date(), 7),
      acceptedAt: null,
      createdAt: new Date()
    }).returning()

    logger.info('Invitation created', { invitationId: invitation.id })

    // TODO: Send invitation email

    return invitation
  }

  async acceptInvitation(token: string, userData: CreateUserInput): Promise<TenantMember> {
    logger.info('Accepting invitation', { token })

    // Find valid invitation
    const [invitation] = await this.db.select()
      .from(invitations)
      .where(and(
        eq(invitations.token, token),
        isNull(invitations.acceptedAt)
      ))
      .limit(1)

    if (!invitation || invitation.expiresAt < new Date()) {
      throw new Error('Invalid or expired invitation')
    }

    // Create or get user
    let user: User
    const [existingUser] = await this.db.select()
      .from(users)
      .where(eq(users.email, invitation.email))
      .limit(1)

    if (existingUser) {
      user = existingUser as User
    } else {
      // User should be created in Supabase first
      const [newUser] = await this.db.insert(users).values({
        id: userData.id, // Supabase user ID
        email: invitation.email,
        name: userData.name,
        emailVerified: true, // Email verified through invitation
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning()
      user = newUser as User
    }

    // Add member to tenant
    const [member] = await this.db.insert(tenantMembers).values({
      id: uuidv4(),
      tenantId: invitation.tenantId,
      userId: user.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
      updatedAt: new Date()
    }).returning()

    // Mark invitation as accepted
    await this.db.update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id))

    logger.info('Invitation accepted', { 
      memberId: member.id,
      tenantId: member.tenantId,
      userId: user.id 
    })

    return member
  }

  async updateMemberRole(input: UpdateMemberRoleInput): Promise<TenantMember> {
    logger.info('Updating member role', { 
      memberId: input.memberId,
      newRole: input.role 
    })

    // Check if trying to remove last owner
    if (input.role !== 'owner') {
      const owners = await this.db.select()
        .from(tenantMembers)
        .where(and(
          eq(tenantMembers.tenantId, input.tenantId),
          eq(tenantMembers.role, 'owner')
        ))

      if (owners.length === 1 && owners[0].id === input.memberId) {
        throw new Error('Cannot remove the last owner')
      }
    }

    const [updated] = await this.db.update(tenantMembers)
      .set({
        role: input.role,
        updatedAt: new Date()
      })
      .where(and(
        eq(tenantMembers.id, input.memberId),
        eq(tenantMembers.tenantId, input.tenantId)
      ))
      .returning()

    if (!updated) {
      throw new Error('Member not found')
    }

    logger.info('Member role updated', { memberId: updated.id })
    return updated
  }

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    logger.info('Removing member', { tenantId, memberId })

    // Check if trying to remove last owner
    const [member] = await this.db.select()
      .from(tenantMembers)
      .where(eq(tenantMembers.id, memberId))
      .limit(1)

    if (member && member.role === 'owner') {
      const owners = await this.db.select()
        .from(tenantMembers)
        .where(and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.role, 'owner')
        ))

      if (owners.length === 1) {
        throw new Error('Cannot remove the last owner')
      }
    }

    await this.db.delete(tenantMembers)
      .where(and(
        eq(tenantMembers.id, memberId),
        eq(tenantMembers.tenantId, tenantId)
      ))

    logger.info('Member removed', { memberId })
  }

  async listMembers(tenantId: string): Promise<(TenantMember & { user: User })[]> {
    const members = await this.db.select({
      member: tenantMembers,
      user: users
    })
      .from(tenantMembers)
      .innerJoin(users, eq(tenantMembers.userId, users.id))
      .where(eq(tenantMembers.tenantId, tenantId))
      .orderBy(desc(tenantMembers.joinedAt))

    return members.map(({ member, user }) => ({
      ...member,
      user: user as User
    }))
  }

  // Permission management
  async checkPermission(input: CheckPermissionInput): Promise<boolean> {
    // Get user's role in tenant
    const [member] = await this.db.select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, input.tenantId),
        eq(tenantMembers.userId, input.userId)
      ))
      .limit(1)

    if (!member) {
      return false
    }

    // Check if role has permission
    const permissions = rolePermissions[member.role as keyof typeof rolePermissions]
    return permissions.includes(input.permission as Permission)
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<Permission[]> {
    const [member] = await this.db.select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      ))
      .limit(1)

    if (!member) {
      return []
    }

    return rolePermissions[member.role as keyof typeof rolePermissions]
  }

  // Authentication is handled by Supabase
  // This method is only used for generating tenant-specific JWT tokens
  async generateTenantToken(userId: string, tenantId?: string): Promise<string> {
    logger.info('Generating tenant token', { userId, tenantId })

    // Get user's tenants
    const memberships = await this.db.select()
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, userId)) as TenantMember[]

    if (memberships.length === 0) {
      throw new Error('User has no tenant memberships')
    }

    // Use provided tenantId or default to first tenant
    const targetTenantId = tenantId || memberships[0].tenantId
    const membership = memberships.find(m => m.tenantId === targetTenantId)

    if (!membership) {
      throw new Error('User is not a member of the specified tenant')
    }

    // Generate token
    const tokenPayload: AuthToken = {
      userId,
      tenantId: membership.tenantId,
      role: membership.role
    }

    const token = jwt.sign(tokenPayload, this.jwtSecret, { expiresIn: '7d' })

    logger.info('Tenant token generated', { userId, tenantId: membership.tenantId })

    return token
  }

  async verifyToken(token: string): Promise<AuthToken> {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthToken
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  // User management
  async getUser(userId: string): Promise<User | null> {
    const [user] = await this.db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return (user as User) || null
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [updated] = await this.db.update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning()

    if (!updated) {
      throw new Error('User not found')
    }

    return updated as User
  }

  async getUserTenants(userId: string): Promise<(TenantMember & { tenant: Tenant })[]> {
    const memberships = await this.db.select({
      member: tenantMembers,
      tenant: tenants
    })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(eq(tenantMembers.userId, userId))
      .orderBy(desc(tenantMembers.joinedAt))

    return memberships.map(({ member, tenant }) => ({
      ...member,
      tenant: tenant as Tenant
    }))
  }
}