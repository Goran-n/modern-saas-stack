import type { DrizzleClient } from '@kibly/shared-db'
import { setDb } from './db'
import {
  createTenant as createTenantAction,
  updateTenant as updateTenantAction,
  inviteMember as inviteMemberAction,
  acceptInvitation as acceptInvitationAction,
  updateMemberRole as updateMemberRoleAction,
  removeMember as removeMemberAction,
  generateTenantToken as generateTenantTokenAction,
  verifyToken as verifyTokenAction,
  updateUser as updateUserAction
} from './actions'
import {
  getTenant as getTenantQuery,
  listTenants as listTenantsQuery,
  getUserTenants as getUserTenantsQuery,
  listMembers as listMembersQuery,
  checkPermission as checkPermissionQuery,
  getUserPermissions as getUserPermissionsQuery,
  getUser as getUserQuery
} from './queries'
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


export class TenantService {
  constructor(
    db: DrizzleClient,
    _jwtSecret: string = process.env.JWT_SECRET || 'default-secret'
  ) {
    // Set the database instance for the functional API
    setDb(db)
  }

  // Tenant management
  async createTenant(input: CreateTenantInput): Promise<{ tenant: Tenant; member: TenantMember }> {
    return createTenantAction(input)
  }

  async updateTenant(input: UpdateTenantInput): Promise<Tenant> {
    return updateTenantAction(input)
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return getTenantQuery(tenantId)
  }

  async listTenants(filters?: { status?: TenantStatus }): Promise<Tenant[]> {
    return listTenantsQuery(filters)
  }

  // Member management
  async inviteMember(input: InviteMemberInput): Promise<Invitation> {
    return inviteMemberAction(input)
  }

  async acceptInvitation(token: string, userData: CreateUserInput): Promise<TenantMember> {
    return acceptInvitationAction(token, userData)
  }

  async updateMemberRole(input: UpdateMemberRoleInput): Promise<TenantMember> {
    return updateMemberRoleAction(input)
  }

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    return removeMemberAction(tenantId, memberId)
  }

  async listMembers(tenantId: string): Promise<(TenantMember & { user: User })[]> {
    return listMembersQuery(tenantId)
  }

  // Permission management
  async checkPermission(input: CheckPermissionInput): Promise<boolean> {
    return checkPermissionQuery(input)
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<Permission[]> {
    return getUserPermissionsQuery(tenantId, userId)
  }

  // Authentication is handled by Supabase
  // This method is only used for generating tenant-specific JWT tokens
  async generateTenantToken(userId: string, tenantId?: string): Promise<string> {
    return generateTenantTokenAction(userId, tenantId)
  }

  async verifyToken(token: string): Promise<AuthToken> {
    return verifyTokenAction(token)
  }

  // User management
  async getUser(userId: string): Promise<User | null> {
    return getUserQuery(userId)
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return updateUserAction(userId, updates)
  }

  async getUserTenants(userId: string): Promise<(TenantMember & { tenant: Tenant })[]> {
    return getUserTenantsQuery(userId)
  }
}