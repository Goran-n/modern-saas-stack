import { z } from 'zod'

export const roleSchema = z.enum(['viewer', 'member', 'admin', 'owner'])
export type Role = z.infer<typeof roleSchema>

export const memberStatusSchema = z.enum(['pending', 'active', 'suspended', 'removed'])
export type MemberStatus = z.infer<typeof memberStatusSchema>

export const memberPermissionsSchema = z.object({
  files: z.object({
    view: z.boolean().optional(),
    create: z.boolean().optional(),
    edit: z.boolean().optional(),
    delete: z.boolean().optional(),
  }).optional(),
  providers: z.object({
    connect: z.boolean().optional(),
    disconnect: z.boolean().optional(),
    configure: z.boolean().optional(),
  }).optional(),
  analytics: z.object({
    view: z.boolean().optional(),
    export: z.boolean().optional(),
  }).optional(),
  team: z.object({
    view: z.boolean().optional(),
    invite: z.boolean().optional(),
    remove: z.boolean().optional(),
    changeRoles: z.boolean().optional(),
  }).optional(),
  tenant: z.object({
    view: z.boolean().optional(),
    edit: z.boolean().optional(),
    delete: z.boolean().optional(),
    billing: z.boolean().optional(),
  }).optional(),
}).strict()

export type MemberPermissions = z.infer<typeof memberPermissionsSchema>

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
}

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, MemberPermissions> = {
  owner: {
    files: { view: true, create: true, edit: true, delete: true },
    providers: { connect: true, disconnect: true, configure: true },
    analytics: { view: true, export: true },
    team: { view: true, invite: true, remove: true, changeRoles: true },
    tenant: { view: true, edit: true, delete: true, billing: true },
  },
  admin: {
    files: { view: true, create: true, edit: true, delete: true },
    providers: { connect: true, disconnect: true, configure: true },
    analytics: { view: true, export: true },
    team: { view: true, invite: true, remove: true, changeRoles: false },
    tenant: { view: true, edit: true, delete: false, billing: false },
  },
  member: {
    files: { view: true, create: true, edit: true, delete: false },
    providers: { connect: false, disconnect: false, configure: false },
    analytics: { view: true, export: false },
    team: { view: true, invite: false, remove: false, changeRoles: false },
    tenant: { view: true, edit: false, delete: false, billing: false },
  },
  viewer: {
    files: { view: true, create: false, edit: false, delete: false },
    providers: { connect: false, disconnect: false, configure: false },
    analytics: { view: true, export: false },
    team: { view: true, invite: false, remove: false, changeRoles: false },
    tenant: { view: true, edit: false, delete: false, billing: false },
  },
}

export interface TenantMemberEntityProps {
  id: string
  tenantId: string
  userId: string
  role: Role
  permissions: MemberPermissions
  status: MemberStatus
  invitationToken: string | null
  invitationExpiresAt: Date | null
  joinedAt: Date | null
  lastAccessAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class TenantMemberEntity {
  private constructor(private props: TenantMemberEntityProps) {}

  static create(props: Omit<TenantMemberEntityProps, 'id' | 'createdAt' | 'updatedAt' | 'permissions'>): TenantMemberEntity {
    const now = new Date()
    const permissions = DEFAULT_ROLE_PERMISSIONS[props.role]
    
    return new TenantMemberEntity({
      ...props,
      id: crypto.randomUUID(),
      permissions,
      createdAt: now,
      updatedAt: now,
    })
  }

  static fromDatabase(props: TenantMemberEntityProps): TenantMemberEntity {
    return new TenantMemberEntity(props)
  }

  get id(): string { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get userId(): string { return this.props.userId }
  get role(): Role { return this.props.role }
  get permissions(): MemberPermissions { return this.props.permissions }
  get status(): MemberStatus { return this.props.status }
  get invitationToken(): string | null { return this.props.invitationToken }
  get invitationExpiresAt(): Date | null { return this.props.invitationExpiresAt }
  get joinedAt(): Date | null { return this.props.joinedAt }
  get lastAccessAt(): Date | null { return this.props.lastAccessAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  isActive(): boolean {
    return this.props.status === 'active'
  }

  isPending(): boolean {
    return this.props.status === 'pending'
  }

  isSuspended(): boolean {
    return this.props.status === 'suspended'
  }

  isRemoved(): boolean {
    return this.props.status === 'removed'
  }

  isInvitationValid(): boolean {
    if (!this.props.invitationToken || !this.props.invitationExpiresAt) {
      return false
    }
    return this.props.invitationExpiresAt > new Date()
  }

  hasRole(role: Role): boolean {
    return this.props.role === role
  }

  hasRoleOrHigher(role: Role): boolean {
    return ROLE_HIERARCHY[this.props.role] <= ROLE_HIERARCHY[role]
  }

  canChangeRole(targetRole: Role): boolean {
    return ROLE_HIERARCHY[this.props.role] < ROLE_HIERARCHY[targetRole]
  }

  hasPermission(category: keyof MemberPermissions, permission: string): boolean {
    const categoryPerms = this.props.permissions[category]
    if (!categoryPerms) return false
    return (categoryPerms as any)[permission] === true
  }

  activate(): void {
    this.props.status = 'active'
    this.props.joinedAt = new Date()
    this.props.invitationToken = null
    this.props.invitationExpiresAt = null
    this.touch()
  }

  suspend(): void {
    if (this.props.status === 'removed') {
      throw new Error('Cannot suspend removed member')
    }
    this.props.status = 'suspended'
    this.touch()
  }

  remove(): void {
    this.props.status = 'removed'
    this.touch()
  }

  changeRole(newRole: Role): void {
    this.props.role = newRole
    this.props.permissions = DEFAULT_ROLE_PERMISSIONS[newRole]
    this.touch()
  }

  updatePermissions(permissions: Partial<MemberPermissions>): void {
    this.props.permissions = { ...this.props.permissions, ...permissions }
    this.touch()
  }

  updateLastAccess(): void {
    this.props.lastAccessAt = new Date()
    this.touch()
  }

  generateInvitation(expiryHours: number = 72): void {
    this.props.invitationToken = crypto.randomUUID()
    this.props.invitationExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
    this.props.status = 'pending'
    this.touch()
  }

  acceptInvitation(): void {
    if (!this.isInvitationValid()) {
      throw new Error('Invalid or expired invitation')
    }
    this.activate()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }

  toDatabase(): TenantMemberEntityProps {
    return { ...this.props }
  }
}