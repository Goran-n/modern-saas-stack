import { setDb } from './db';
import { createTenant as createTenantAction, updateTenant as updateTenantAction, inviteMember as inviteMemberAction, acceptInvitation as acceptInvitationAction, updateMemberRole as updateMemberRoleAction, removeMember as removeMemberAction, generateTenantToken as generateTenantTokenAction, verifyToken as verifyTokenAction, updateUser as updateUserAction } from './actions';
import { getTenant as getTenantQuery, listTenants as listTenantsQuery, getUserTenants as getUserTenantsQuery, listMembers as listMembersQuery, checkPermission as checkPermissionQuery, getUserPermissions as getUserPermissionsQuery, getUser as getUserQuery } from './queries';
export class TenantService {
    constructor(db, _jwtSecret = process.env.JWT_SECRET || 'default-secret') {
        // Set the database instance for the functional API
        setDb(db);
    }
    // Tenant management
    async createTenant(input) {
        return createTenantAction(input);
    }
    async updateTenant(input) {
        return updateTenantAction(input);
    }
    async getTenant(tenantId) {
        return getTenantQuery(tenantId);
    }
    async listTenants(filters) {
        return listTenantsQuery(filters);
    }
    // Member management
    async inviteMember(input) {
        return inviteMemberAction(input);
    }
    async acceptInvitation(token, userData) {
        return acceptInvitationAction(token, userData);
    }
    async updateMemberRole(input) {
        return updateMemberRoleAction(input);
    }
    async removeMember(tenantId, memberId) {
        return removeMemberAction(tenantId, memberId);
    }
    async listMembers(tenantId) {
        return listMembersQuery(tenantId);
    }
    // Permission management
    async checkPermission(input) {
        return checkPermissionQuery(input);
    }
    async getUserPermissions(tenantId, userId) {
        return getUserPermissionsQuery(tenantId, userId);
    }
    // Authentication is handled by Supabase
    // This method is only used for generating tenant-specific JWT tokens
    async generateTenantToken(userId, tenantId) {
        return generateTenantTokenAction(userId, tenantId);
    }
    async verifyToken(token) {
        return verifyTokenAction(token);
    }
    // User management
    async getUser(userId) {
        return getUserQuery(userId);
    }
    async updateUser(userId, updates) {
        return updateUserAction(userId, updates);
    }
    async getUserTenants(userId) {
        return getUserTenantsQuery(userId);
    }
}
//# sourceMappingURL=service.js.map