import type { DrizzleClient } from '@kibly/shared-db';
import type { CreateTenantInput, UpdateTenantInput, InviteMemberInput, UpdateMemberRoleInput, CheckPermissionInput, CreateUserInput, Tenant, User, TenantMember, Invitation, AuthToken, Permission, TenantStatus } from './types';
export declare class TenantService {
    constructor(db: DrizzleClient, _jwtSecret?: string);
    createTenant(input: CreateTenantInput): Promise<{
        tenant: Tenant;
        member: TenantMember;
    }>;
    updateTenant(input: UpdateTenantInput): Promise<Tenant>;
    getTenant(tenantId: string): Promise<Tenant | null>;
    listTenants(filters?: {
        status?: TenantStatus;
    }): Promise<Tenant[]>;
    inviteMember(input: InviteMemberInput): Promise<Invitation>;
    acceptInvitation(token: string, userData: CreateUserInput): Promise<TenantMember>;
    updateMemberRole(input: UpdateMemberRoleInput): Promise<TenantMember>;
    removeMember(tenantId: string, memberId: string): Promise<void>;
    listMembers(tenantId: string): Promise<(TenantMember & {
        user: User;
    })[]>;
    checkPermission(input: CheckPermissionInput): Promise<boolean>;
    getUserPermissions(tenantId: string, userId: string): Promise<Permission[]>;
    generateTenantToken(userId: string, tenantId?: string): Promise<string>;
    verifyToken(token: string): Promise<AuthToken>;
    getUser(userId: string): Promise<User | null>;
    updateUser(userId: string, updates: Partial<User>): Promise<User>;
    getUserTenants(userId: string): Promise<(TenantMember & {
        tenant: Tenant;
    })[]>;
}
//# sourceMappingURL=service.d.ts.map