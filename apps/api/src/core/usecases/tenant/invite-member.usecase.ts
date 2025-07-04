import { TenantMemberEntity, Role } from '../../domain/tenant'
import { NotFoundError, ConflictError, BusinessRuleError } from '../../../shared/errors'
import type { TenantRepository, TenantMemberRepository } from '../../ports'
import { TENANT, INVITATION } from '../../../shared/constants'

export interface InviteMemberInput {
  tenantId: string
  userId: string
  role: Role
  invitedByUserId: string
  expiryHours?: number
}

export interface InviteMemberOutput {
  membership: TenantMemberEntity
  invitationToken: string
}

export class InviteMemberUseCase {
  constructor(
    private tenantRepository: TenantRepository,
    private tenantMemberRepository: TenantMemberRepository
  ) {}

  async execute(input: InviteMemberInput): Promise<InviteMemberOutput> {
    // Validate business rules
    await this.validateBusinessRules(input)

    // Check if membership already exists
    const existingMembership = await this.tenantMemberRepository.findByUserAndTenant(
      input.userId,
      input.tenantId
    )

    if (existingMembership) {
      if (existingMembership.isActive()) {
        throw new ConflictError('User is already a member of this tenant')
      }
      
      if (existingMembership.isPending() && existingMembership.isInvitationValid()) {
        throw new ConflictError('User already has a pending invitation')
      }

      // Reactivate removed or expired membership
      existingMembership.generateInvitation(input.expiryHours || INVITATION.DEFAULT_EXPIRY_HOURS)
      existingMembership.changeRole(input.role)
      
      const savedMembership = await this.tenantMemberRepository.save(existingMembership)
      
      return {
        membership: savedMembership,
        invitationToken: savedMembership.invitationToken!,
      }
    }

    // Create new membership
    const membership = TenantMemberEntity.create({
      tenantId: input.tenantId,
      userId: input.userId,
      role: input.role,
      status: 'pending',
      invitationToken: null,
      invitationExpiresAt: null,
      joinedAt: null,
      lastAccessAt: null,
    })

    membership.generateInvitation(input.expiryHours || INVITATION.DEFAULT_EXPIRY_HOURS)

    const savedMembership = await this.tenantMemberRepository.save(membership)

    return {
      membership: savedMembership,
      invitationToken: savedMembership.invitationToken!,
    }
  }

  private async validateBusinessRules(input: InviteMemberInput): Promise<void> {
    // Check if tenant exists and is active
    const tenant = await this.tenantRepository.findById(input.tenantId)
    if (!tenant) {
      throw new NotFoundError('Tenant', input.tenantId)
    }

    if (!tenant.isActive()) {
      throw new BusinessRuleError(
        'TENANT_NOT_ACTIVE',
        'Cannot invite members to inactive tenant'
      )
    }

    if (!tenant.canAcceptNewMembers()) {
      throw new BusinessRuleError(
        'TENANT_CANNOT_ACCEPT_MEMBERS',
        'Tenant cannot accept new members'
      )
    }

    // Check if inviter has permission
    const inviterMembership = await this.tenantMemberRepository.findByUserAndTenant(
      input.invitedByUserId,
      input.tenantId
    )

    if (!inviterMembership || !inviterMembership.isActive()) {
      throw new BusinessRuleError(
        'INVITER_NOT_MEMBER',
        'Inviter must be an active member of the tenant'
      )
    }

    if (!inviterMembership.hasPermission('team', 'invite')) {
      throw new BusinessRuleError(
        'INSUFFICIENT_PERMISSIONS',
        'Inviter does not have permission to invite members'
      )
    }

    // Check if inviter can assign this role
    if (!inviterMembership.canChangeRole(input.role)) {
      throw new BusinessRuleError(
        'CANNOT_ASSIGN_ROLE',
        'Inviter cannot assign a role equal to or higher than their own'
      )
    }

    // Check tenant member limits
    const currentMemberCount = await this.tenantMemberRepository.countByTenant(input.tenantId)
    if (currentMemberCount >= TENANT.MAX_MEMBERS) {
      throw new BusinessRuleError(
        'MEMBER_LIMIT_EXCEEDED',
        `Tenant has reached the maximum number of members (${TENANT.MAX_MEMBERS})`
      )
    }

    // Validate role
    if (!['viewer', 'member', 'admin'].includes(input.role)) {
      throw new BusinessRuleError(
        'INVALID_ROLE',
        'Cannot invite users with owner role'
      )
    }

    // Validate expiry hours
    if (input.expiryHours) {
      if (input.expiryHours < INVITATION.MIN_EXPIRY_HOURS || 
          input.expiryHours > INVITATION.MAX_EXPIRY_HOURS) {
        throw new BusinessRuleError(
          'INVALID_EXPIRY',
          `Invitation expiry must be between ${INVITATION.MIN_EXPIRY_HOURS} and ${INVITATION.MAX_EXPIRY_HOURS} hours`
        )
      }
    }
  }
}