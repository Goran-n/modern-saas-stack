import { TenantService } from '../../services/tenant.service'
import { TenantMemberService } from '../../services/tenant-member.service'
import { validateSlug } from '../../utils/slug'

export interface CreateTenantCommand {
  name: string
  email: string
  slug?: string
  ownerId: string
}

export interface UpdateTenantCommand {
  tenantId: string
  name?: string
  email?: string
  settings?: Record<string, unknown>
  subscription?: Record<string, unknown>
  metadata?: Record<string, unknown>
  membership: any
}

export interface InviteMemberCommand {
  tenantId: string
  invitedEmail: string
  invitedBy: string
  role: 'viewer' | 'member' | 'admin' | 'owner'
  customPermissions?: Record<string, unknown>
  membership: any
}

export interface UpdateMemberRoleCommand {
  memberId: string
  role: 'viewer' | 'member' | 'admin' | 'owner'
  updatedBy: string
  membership: any
}

export interface RemoveMemberCommand {
  memberId: string
  removedBy: string
  membership: any
}

export interface GetMembersCommand {
  tenantId: string
  membership: any
}

export interface ValidateAccessCommand {
  tenantId: string
  userId: string
}

export interface AcceptInvitationCommand {
  token: string
  userId: string
}

export class TenantApplicationService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantMemberService: TenantMemberService
  ) {}

  async createTenant(command: CreateTenantCommand): Promise<any> {
    // Validate slug if provided
    if (command.slug && !validateSlug(command.slug)) {
      throw new Error('Invalid slug format')
    }
    
    const tenantData: any = {
      name: command.name,
      email: command.email,
      ownerId: command.ownerId,
    }
    if (command.slug !== undefined) {
      tenantData.slug = command.slug
    }
    
    return await this.tenantService.createTenant(tenantData)
  }

  async getUserTenants(userId: string): Promise<any[]> {
    const tenantEntities = await this.tenantService.getUserTenants(userId)
    
    // Transform domain entities to DTOs for frontend consumption
    return tenantEntities.map(tenantWithMembership => {
      return {
        id: tenantWithMembership.id.toString(),
        name: tenantWithMembership.name,
        slug: tenantWithMembership.slug,
        email: tenantWithMembership.email,
        status: tenantWithMembership.status,
        settings: tenantWithMembership.settings,
        subscription: tenantWithMembership.subscription,
        metadata: tenantWithMembership.metadata,
        createdAt: tenantWithMembership.createdAt,
        updatedAt: tenantWithMembership.updatedAt,
        deletedAt: tenantWithMembership.deletedAt,
        membership: {
          id: (tenantWithMembership as any).membership.id,
          role: (tenantWithMembership as any).membership.role,
          status: (tenantWithMembership as any).membership.status,
          permissions: (tenantWithMembership as any).membership.permissions,
          joinedAt: (tenantWithMembership as any).membership.joinedAt,
          lastAccessAt: (tenantWithMembership as any).membership.lastAccessAt
        }
      }
    })
  }

  async updateTenant(command: UpdateTenantCommand): Promise<any> {
    // Check if user has permission to update tenant
    const hasPermission = this.tenantMemberService.hasPermission(
      command.membership,
      'tenant',
      'manageSettings'
    )
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to update tenant')
    }
    
    const updateData: any = {}
    if (command.name !== undefined) updateData.name = command.name
    if (command.email !== undefined) updateData.email = command.email
    if (command.settings !== undefined) updateData.settings = command.settings
    if (command.subscription !== undefined) updateData.subscription = command.subscription
    if (command.metadata !== undefined) updateData.metadata = command.metadata
    
    return await this.tenantService.updateTenant(command.tenantId, updateData)
  }

  async getMembers(command: GetMembersCommand): Promise<any[]> {
    // Check if user can view members
    const hasPermission = this.tenantMemberService.hasPermission(
      command.membership,
      'team',
      'viewMembers'
    )
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to view members')
    }
    
    return await this.tenantMemberService.getMembersByTenant(command.tenantId)
  }

  async inviteMember(command: InviteMemberCommand): Promise<any> {
    // Check if user can invite members
    const hasPermission = this.tenantMemberService.hasPermission(
      command.membership,
      'team',
      'inviteMembers'
    )
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to invite members')
    }
    
    const inviteData: any = {
      tenantId: command.tenantId,
      invitedEmail: command.invitedEmail,
      invitedBy: command.invitedBy,
      role: command.role,
    }
    if (command.customPermissions !== undefined) {
      inviteData.customPermissions = command.customPermissions
    }
    
    return await this.tenantMemberService.inviteMember(inviteData)
  }

  async updateMemberRole(command: UpdateMemberRoleCommand): Promise<any> {
    // Check if user can manage members
    const hasPermission = this.tenantMemberService.hasPermission(
      command.membership,
      'team',
      'manageMembers'
    )
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to manage members')
    }
    
    return await this.tenantMemberService.updateMemberRole(
      command.memberId,
      command.role,
      command.updatedBy
    )
  }

  async removeMember(command: RemoveMemberCommand): Promise<void> {
    // Check if user can remove members
    const hasPermission = this.tenantMemberService.hasPermission(
      command.membership,
      'team',
      'removeMembers'
    )
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to remove members')
    }
    
    await this.tenantMemberService.removeMember(command.memberId, command.removedBy)
  }

  async getMemberPermissions(membership: any): Promise<any> {
    return this.tenantMemberService.getMemberPermissions(membership)
  }

  async acceptInvitation(command: AcceptInvitationCommand): Promise<any> {
    return await this.tenantMemberService.acceptInvitation(command.token)
  }

  async validateAccess(command: ValidateAccessCommand): Promise<boolean> {
    return await this.tenantService.validateTenantAccess(command.tenantId, command.userId)
  }
}