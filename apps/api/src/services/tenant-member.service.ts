import { eq, and } from 'drizzle-orm'
import { getDatabase } from '../database/connection'
import { 
  tenantMembers, 
  type TenantMember, 
  type MemberPermissions,
  type RoleType,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_HIERARCHY
} from '../database/schema'
import { generateInvitationToken } from '../utils/crypto'
import log from '../config/logger'

export class TenantMemberService {
  private db = getDatabase()

  async inviteMember(data: {
    tenantId: string
    invitedEmail: string
    invitedBy: string
    role: RoleType
    customPermissions?: MemberPermissions
  }): Promise<TenantMember> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const [member] = await this.db.insert(tenantMembers).values({
      tenantId: data.tenantId,
      userId: '', // Will be set when invitation is accepted
      invitedEmail: data.invitedEmail,
      invitedBy: data.invitedBy,
      role: data.role,
      permissions: data.customPermissions || {},
      status: 'pending',
      invitationToken,
      invitationExpiresAt: expiresAt,
      invitedAt: new Date(),
    }).returning()

    log.info(`Member invited: ${data.invitedEmail} to tenant ${data.tenantId}`)
    return member
  }

  async acceptInvitation(token: string, userId: string): Promise<TenantMember> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    const [member] = await this.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.invitationToken, token),
          eq(tenantMembers.status, 'pending')
        )
      )

    if (!member) {
      throw new Error('Invalid or expired invitation')
    }

    if (member.invitationExpiresAt && member.invitationExpiresAt < new Date()) {
      throw new Error('Invitation has expired')
    }

    const [updated] = await this.db
      .update(tenantMembers)
      .set({
        userId,
        status: 'active',
        invitationToken: null,
        invitationExpiresAt: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantMembers.id, member.id))
      .returning()

    log.info(`Invitation accepted: ${userId} joined tenant ${member.tenantId}`)
    return updated
  }

  async getMembersByTenant(tenantId: string): Promise<TenantMember[]> {
    if (!this.db) return []

    return await this.db
      .select()
      .from(tenantMembers)
      .where(
        eq(tenantMembers.tenantId, tenantId)
      )
  }

  async getMemberByUserAndTenant(userId: string, tenantId: string): Promise<TenantMember | null> {
    if (!this.db) return null

    const [member] = await this.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.status, 'active')
        )
      )

    return member || null
  }

  async updateMemberRole(
    memberId: string,
    newRole: RoleType,
    updatedBy: string
  ): Promise<TenantMember> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    // Get current member details
    const [currentMember] = await this.db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.id, memberId))

    if (!currentMember) {
      throw new Error('Member not found')
    }

    // Validate role hierarchy - only higher or equal roles can change roles
    const updaterMember = await this.getMemberByUserAndTenant(updatedBy, currentMember.tenantId)
    if (!updaterMember) {
      throw new Error('Updater not found in tenant')
    }

    if (ROLE_HIERARCHY[updaterMember.role] > ROLE_HIERARCHY[newRole]) {
      throw new Error('Insufficient permissions to assign this role')
    }

    // Prevent removing the last owner
    if (currentMember.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await this.countMembersByRole(currentMember.tenantId, 'owner')
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner')
      }
    }

    const [updated] = await this.db
      .update(tenantMembers)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(tenantMembers.id, memberId))
      .returning()

    log.info(`Member role updated: ${memberId} to ${newRole}`)
    return updated
  }

  async updateMemberPermissions(
    memberId: string,
    permissions: MemberPermissions,
    _updatedBy: string
  ): Promise<TenantMember> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    const [updated] = await this.db
      .update(tenantMembers)
      .set({
        permissions,
        updatedAt: new Date(),
      })
      .where(eq(tenantMembers.id, memberId))
      .returning()

    log.info(`Member permissions updated: ${memberId}`)
    return updated
  }

  async removeMember(memberId: string, _removedBy: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    // Get member details
    const [member] = await this.db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.id, memberId))

    if (!member) {
      throw new Error('Member not found')
    }

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const ownerCount = await this.countMembersByRole(member.tenantId, 'owner')
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner')
      }
    }

    await this.db
      .update(tenantMembers)
      .set({
        status: 'removed',
        updatedAt: new Date(),
      })
      .where(eq(tenantMembers.id, memberId))

    log.info(`Member removed: ${memberId} from tenant ${member.tenantId}`)
  }

  async updateLastAccess(userId: string, tenantId: string): Promise<void> {
    if (!this.db) return

    await this.db
      .update(tenantMembers)
      .set({
        lastAccessAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId)
        )
      )
  }

  /**
   * Get effective permissions for a member (role defaults + custom permissions)
   */
  getMemberPermissions(member: TenantMember): MemberPermissions {
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[member.role] || {}
    const customPermissions = (member.permissions as MemberPermissions) || {}
    
    // Merge permissions (custom permissions override role defaults)
    return this.mergePermissions(rolePermissions, customPermissions)
  }

  /**
   * Check if a member has a specific permission
   */
  hasPermission(
    member: TenantMember, 
    category: keyof MemberPermissions, 
    permission: string
  ): boolean {
    const permissions = this.getMemberPermissions(member)
    const categoryPermissions = permissions[category] as Record<string, boolean> || {}
    return categoryPermissions[permission] === true
  }

  /**
   * Check if a member can perform an action based on role hierarchy
   */
  canPerformAction(actorRole: RoleType, targetRole: RoleType): boolean {
    return ROLE_HIERARCHY[actorRole] <= ROLE_HIERARCHY[targetRole]
  }

  private async countMembersByRole(tenantId: string, role: RoleType): Promise<number> {
    if (!this.db) return 0

    const members = await this.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.role, role),
          eq(tenantMembers.status, 'active')
        )
      )

    return members.length
  }

  private mergePermissions(
    base: MemberPermissions, 
    override: MemberPermissions
  ): MemberPermissions {
    const result: MemberPermissions = {}
    
    // Get all categories from both objects
    const categories = new Set([
      ...Object.keys(base),
      ...Object.keys(override)
    ]) as Set<keyof MemberPermissions>
    
    for (const category of categories) {
      const baseCategory = base[category] || {}
      const overrideCategory = override[category] || {}
      
      result[category] = {
        ...baseCategory,
        ...overrideCategory
      }
    }
    
    return result
  }
}