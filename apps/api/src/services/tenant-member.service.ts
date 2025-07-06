import type { TenantMemberRepository } from '../core/ports/tenant-member.repository'
import type { TenantMemberEntity, Role, MemberPermissions, MemberStatus } from '../core/domain/tenant'
import { TenantMemberEntity as TenantMemberEntityClass } from '../core/domain/tenant'
import { container, TOKENS } from '../shared/utils/container'

export interface CreateMemberData {
  tenantId: string
  userId: string
  role: Role
  status?: MemberStatus
  invitationExpiryHours?: number
}

export interface UpdateMemberData {
  role?: Role
  permissions?: Partial<MemberPermissions>
  status?: MemberStatus
}

export class TenantMemberService {
  constructor(
    private readonly tenantMemberRepository: TenantMemberRepository
  ) {}

  async findById(id: string): Promise<TenantMemberEntity | null> {
    return this.tenantMemberRepository.findById(id)
  }

  async findByTenantAndUser(tenantId: string, userId: string): Promise<TenantMemberEntity | null> {
    return this.tenantMemberRepository.findByUserAndTenant(userId, tenantId)
  }

  async findByTenant(tenantId: string): Promise<TenantMemberEntity[]> {
    return this.tenantMemberRepository.findByTenant(tenantId)
  }

  async findByUser(userId: string): Promise<TenantMemberEntity[]> {
    return this.tenantMemberRepository.findByUser(userId)
  }

  async findByInvitationToken(token: string): Promise<TenantMemberEntity | null> {
    return this.tenantMemberRepository.findByInvitationToken(token)
  }

  async create(data: CreateMemberData): Promise<TenantMemberEntity> {
    // Check if member already exists
    const existing = await this.tenantMemberRepository.exists(data.userId, data.tenantId)
    if (existing) {
      throw new Error('User is already a member of this tenant')
    }

    // Create member entity
    const member = TenantMemberEntityClass.create({
      tenantId: data.tenantId,
      userId: data.userId,
      role: data.role,
      status: data.status || 'pending',
      invitationToken: null,
      invitationExpiresAt: null,
      joinedAt: data.status === 'active' ? new Date() : null,
      lastAccessAt: null
    })

    // Generate invitation if status is pending
    if (member.isPending() && data.invitationExpiryHours !== 0) {
      member.generateInvitation(data.invitationExpiryHours || 72)
    }

    return this.tenantMemberRepository.save(member)
  }

  async update(id: string, data: UpdateMemberData): Promise<TenantMemberEntity> {
    const member = await this.tenantMemberRepository.findById(id)
    if (!member) {
      throw new Error(`Member with id ${id} not found`)
    }

    // Update role
    if (data.role) {
      member.changeRole(data.role)
    }

    // Update permissions
    if (data.permissions) {
      member.updatePermissions(data.permissions)
    }

    // Update status
    if (data.status) {
      switch (data.status) {
        case 'active':
          member.activate()
          break
        case 'suspended':
          member.suspend()
          break
        case 'removed':
          member.remove()
          break
        case 'pending':
          // Can't change to pending after creation
          break
      }
    }

    return this.tenantMemberRepository.save(member)
  }

  async save(member: TenantMemberEntity): Promise<TenantMemberEntity> {
    return this.tenantMemberRepository.save(member)
  }

  async delete(id: string): Promise<void> {
    return this.tenantMemberRepository.delete(id)
  }

  async acceptInvitation(token: string): Promise<TenantMemberEntity> {
    const member = await this.tenantMemberRepository.findByInvitationToken(token)
    if (!member) {
      throw new Error('Invalid invitation token')
    }

    if (!member.isInvitationValid()) {
      throw new Error('Invitation has expired')
    }

    member.acceptInvitation()
    return this.tenantMemberRepository.save(member)
  }

  async regenerateInvitation(memberId: string, expiryHours?: number): Promise<TenantMemberEntity> {
    const member = await this.tenantMemberRepository.findById(memberId)
    if (!member) {
      throw new Error(`Member with id ${memberId} not found`)
    }

    if (!member.isPending()) {
      throw new Error('Can only regenerate invitation for pending members')
    }

    member.generateInvitation(expiryHours || 72)
    return this.tenantMemberRepository.save(member)
  }

  async updateLastAccess(userId: string, tenantId: string): Promise<void> {
    const member = await this.tenantMemberRepository.findByUserAndTenant(userId, tenantId)
    if (!member) {
      return // Silently return if member not found
    }

    member.updateLastAccess()
    await this.tenantMemberRepository.save(member)
  }

  async countMembers(tenantId: string): Promise<number> {
    return this.tenantMemberRepository.countByTenant(tenantId)
  }

  async countByRole(tenantId: string, role: Role): Promise<number> {
    return this.tenantMemberRepository.countByRole(tenantId, role)
  }

  async getPendingInvitations(tenantId: string): Promise<TenantMemberEntity[]> {
    return this.tenantMemberRepository.findPendingInvitations(tenantId)
  }

  async cleanupExpiredInvitations(): Promise<void> {
    const repository = container.resolve<TenantMemberRepository>(TOKENS.TENANT_MEMBER_REPOSITORY)
    
    const expiredInvitations = await repository.findExpiredInvitations()
    for (const member of expiredInvitations) {
      await repository.delete(member.id)
    }
  }

  // Permission checking methods
  async hasPermission(
    membership: TenantMemberEntity | { tenantId: string; userId: string } | null,
    module: keyof MemberPermissions,
    permission: string
  ): Promise<boolean> {
    if (!membership) {
      return false
    }

    // If we only have tenantId and userId, fetch the full member entity
    let member: TenantMemberEntity | null
    if ('hasPermission' in membership) {
      member = membership
    } else {
      const repository = container.resolve<TenantMemberRepository>(TOKENS.TENANT_MEMBER_REPOSITORY)
      member = await repository.findByUserAndTenant(membership.userId, membership.tenantId)
    }

    if (!member || !member.isActive()) {
      return false
    }

    return member.hasPermission(module, permission)
  }

  async canManageMember(
    actorMembership: TenantMemberEntity | null,
    targetMemberId: string
  ): Promise<boolean> {
    if (!actorMembership || !actorMembership.isActive()) {
      return false
    }

    // Owners can manage anyone
    if (actorMembership.hasRole('owner')) {
      return true
    }

    // Admins can manage members and viewers
    if (actorMembership.hasRole('admin')) {
      const targetMember = await this.findById(targetMemberId)
      if (!targetMember) {
        return false
      }
      return actorMembership.canChangeRole(targetMember.role)
    }

    return false
  }

  async canChangeRole(
    actorMembership: TenantMemberEntity | null,
    targetRole: Role
  ): Promise<boolean> {
    if (!actorMembership || !actorMembership.isActive()) {
      return false
    }

    // Check if actor has permission to change roles
    if (!actorMembership.hasPermission('team', 'changeRoles')) {
      return false
    }

    // Check if actor's role is high enough to assign the target role
    return actorMembership.canChangeRole(targetRole)
  }

  async isOwner(userId: string, tenantId: string): Promise<boolean> {
    const member = await this.findByTenantAndUser(tenantId, userId)
    return member?.hasRole('owner') && member.isActive() || false
  }

  async isAdmin(userId: string, tenantId: string): Promise<boolean> {
    const member = await this.findByTenantAndUser(tenantId, userId)
    return member?.hasRoleOrHigher('admin') && member.isActive() || false
  }

  async isMember(userId: string, tenantId: string): Promise<boolean> {
    const member = await this.findByTenantAndUser(tenantId, userId)
    return member?.isActive() || false
  }

  async getMembersByTenant(tenantId: string): Promise<TenantMemberEntity[]> {
    return this.findByTenant(tenantId)
  }

  async inviteMember(data: {
    tenantId: string
    invitedEmail: string
    invitedBy: string
    role: Role
    customPermissions?: Partial<MemberPermissions>
  }): Promise<TenantMemberEntity> {
    // Create a pending member with invitation
    const member = await this.create({
      tenantId: data.tenantId,
      userId: data.invitedEmail, // Temporary - will be replaced when accepted
      role: data.role,
      status: 'pending',
      invitationExpiryHours: 72
    })
    
    // Apply custom permissions if provided
    if (data.customPermissions) {
      member.updatePermissions(data.customPermissions)
      await this.save(member)
    }
    
    // TODO: Send invitation email
    
    return member
  }

  async updateMemberRole(memberId: string, role: Role, _updatedBy: string): Promise<TenantMemberEntity> {
    return this.update(memberId, { role })
  }

  async removeMember(memberId: string, _removedBy: string): Promise<void> {
    const member = await this.findById(memberId)
    if (!member) {
      throw new Error(`Member with id ${memberId} not found`)
    }
    
    member.remove()
    await this.save(member)
  }

  async getMemberPermissions(membership: TenantMemberEntity | null): Promise<MemberPermissions | null> {
    if (!membership || !membership.isActive()) {
      return null
    }
    
    return membership.permissions
  }

  async getMemberByUserAndTenant(userId: string, tenantId: string): Promise<TenantMemberEntity | null> {
    return this.findByTenantAndUser(tenantId, userId)
  }
}