import type { DrizzleClient } from "@kibly/shared-db";
import {
  acceptInvitation as acceptInvitationAction,
  createTenant as createTenantAction,
  generateTenantToken as generateTenantTokenAction,
  inviteMember as inviteMemberAction,
  removeMember as removeMemberAction,
  updateMemberRole as updateMemberRoleAction,
  updateTenant as updateTenantAction,
  updateUser as updateUserAction,
  verifyToken as verifyTokenAction,
} from "./actions";
import { setDb } from "./db";
import {
  checkPermission as checkPermissionQuery,
  getTenant as getTenantQuery,
  getUserPermissions as getUserPermissionsQuery,
  getUser as getUserQuery,
  getUserTenants as getUserTenantsQuery,
  listMembers as listMembersQuery,
  listTenants as listTenantsQuery,
} from "./queries";
import type {
  AuthToken,
  CheckPermissionInput,
  CreateTenantInput,
  CreateUserInput,
  Invitation,
  InviteMemberInput,
  Permission,
  Tenant,
  TenantMember,
  TenantStatus,
  UpdateMemberRoleInput,
  UpdateTenantInput,
  User,
} from "./types";

export class TenantService {
  constructor(db: DrizzleClient, _jwtSecret: string) {
    if (!_jwtSecret) {
      throw new Error(
        "JWT_SECRET is required for TenantService initialization",
      );
    }
    // Set the database instance for the functional API
    setDb(db);
  }

  // Tenant management
  async createTenant(
    input: CreateTenantInput,
  ): Promise<{ tenant: Tenant; member: TenantMember }> {
    return createTenantAction(input);
  }

  async updateTenant(input: UpdateTenantInput): Promise<Tenant> {
    return updateTenantAction(input);
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return getTenantQuery(tenantId);
  }

  async listTenants(filters?: { status?: TenantStatus }): Promise<Tenant[]> {
    return listTenantsQuery(filters);
  }

  // Member management
  async inviteMember(input: InviteMemberInput): Promise<Invitation> {
    return inviteMemberAction(input);
  }

  async acceptInvitation(
    token: string,
    userData: CreateUserInput,
  ): Promise<TenantMember> {
    return acceptInvitationAction(token, userData);
  }

  async updateMemberRole(input: UpdateMemberRoleInput): Promise<TenantMember> {
    return updateMemberRoleAction(input);
  }

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    return removeMemberAction(tenantId, memberId);
  }

  async listMembers(
    tenantId: string,
  ): Promise<(TenantMember & { user: User })[]> {
    return listMembersQuery(tenantId);
  }

  // Permission management
  async checkPermission(input: CheckPermissionInput): Promise<boolean> {
    return checkPermissionQuery(input);
  }

  async getUserPermissions(
    tenantId: string,
    userId: string,
  ): Promise<Permission[]> {
    return getUserPermissionsQuery(tenantId, userId);
  }

  // Authentication is handled by Supabase
  // This method is only used for generating tenant-specific JWT tokens
  async generateTenantToken(
    userId: string,
    tenantId?: string,
  ): Promise<string> {
    return generateTenantTokenAction(userId, tenantId);
  }

  async verifyToken(token: string): Promise<AuthToken> {
    return verifyTokenAction(token);
  }

  // User management
  async getUser(userId: string): Promise<User | null> {
    return getUserQuery(userId);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return updateUserAction(userId, updates);
  }

  async getUserTenants(
    userId: string,
  ): Promise<(TenantMember & { tenant: Tenant })[]> {
    return getUserTenantsQuery(userId);
  }
}
