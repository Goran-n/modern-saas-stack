import { z } from 'zod'

// Enums
export const TenantStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted'
} as const

export const MemberRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
} as const

export const Permission = {
  // Tenant management
  TENANT_VIEW: 'tenant:view',
  TENANT_UPDATE: 'tenant:update',
  TENANT_DELETE: 'tenant:delete',

  // Member management
  MEMBER_VIEW: 'member:view',
  MEMBER_INVITE: 'member:invite',
  MEMBER_UPDATE: 'member:update',
  MEMBER_REMOVE: 'member:remove',

  // Communication permissions
  COMMUNICATION_VIEW: 'communication:view',
  COMMUNICATION_SEND: 'communication:send',
  COMMUNICATION_MANAGE: 'communication:manage',

  // Integration permissions
  INTEGRATION_VIEW: 'integration:view',
  INTEGRATION_MANAGE: 'integration:manage',

  // Sync permissions
  SYNC_VIEW: 'sync:view',
  SYNC_EXECUTE: 'sync:execute',
  SYNC_MANAGE: 'sync:manage'
} as const

// Type exports
export type TenantStatus = typeof TenantStatus[keyof typeof TenantStatus]
export type MemberRole = typeof MemberRole[keyof typeof MemberRole]
export type Permission = typeof Permission[keyof typeof Permission]

// Schemas
export const tenantStatusSchema = z.enum(['active', 'suspended', 'deleted'])
export const memberRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer'])

// Input types
export interface CreateTenantInput {
  name: string
  slug: string
  email: string
  ownerId: string
  settings?: Record<string, any>
  subscription?: Record<string, any>
  metadata?: Record<string, any>
}

export interface UpdateTenantInput {
  tenantId: string
  name?: string
  status?: TenantStatus
  settings?: Record<string, any>
  subscription?: Record<string, any>
  metadata?: Record<string, any>
}

export interface InviteMemberInput {
  tenantId: string
  email: string
  name: string
  role: MemberRole
  invitedBy: string
}

export interface UpdateMemberRoleInput {
  tenantId: string
  memberId: string
  role: MemberRole
  updatedBy?: string
}

export interface CheckPermissionInput {
  tenantId: string
  userId: string
  permission: Permission
}

export interface CreateUserInput {
  id: string // Supabase user ID
  email: string
  name: string
  metadata?: Record<string, any>
}

// Domain types
export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  status: TenantStatus
  settings: Record<string, any>
  subscription: Record<string, any>
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export interface User {
  id: string
  email: string
  name: string
  emailVerified: boolean
  phoneVerified: boolean
  phone?: string | null
  preferences: Record<string, any>
  lastLoginAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TenantMember {
  id: string
  tenantId: string
  userId: string
  role: MemberRole
  invitedBy: string | null
  joinedAt: Date
  updatedAt: Date
}

export interface Invitation {
  id: string
  tenantId: string
  email: string
  role: MemberRole
  invitedBy: string
  token: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export interface AuthToken {
  userId: string
  tenantId?: string
  role?: MemberRole
}

// Role-based permission mappings
export const rolePermissions: Record<MemberRole, Permission[]> = {
  owner: Object.values(Permission), // All permissions
  admin: [
    Permission.TENANT_VIEW,
    Permission.TENANT_UPDATE,
    Permission.MEMBER_VIEW,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_UPDATE,
    Permission.COMMUNICATION_VIEW,
    Permission.COMMUNICATION_SEND,
    Permission.COMMUNICATION_MANAGE,
    Permission.INTEGRATION_VIEW,
    Permission.INTEGRATION_MANAGE,
    Permission.SYNC_VIEW,
    Permission.SYNC_EXECUTE,
    Permission.SYNC_MANAGE
  ],
  member: [
    Permission.TENANT_VIEW,
    Permission.MEMBER_VIEW,
    Permission.COMMUNICATION_VIEW,
    Permission.COMMUNICATION_SEND,
    Permission.INTEGRATION_VIEW,
    Permission.SYNC_VIEW,
    Permission.SYNC_EXECUTE
  ],
  viewer: [
    Permission.TENANT_VIEW,
    Permission.MEMBER_VIEW,
    Permission.COMMUNICATION_VIEW,
    Permission.INTEGRATION_VIEW,
    Permission.SYNC_VIEW
  ]
}
