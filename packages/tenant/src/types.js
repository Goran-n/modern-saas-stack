import { z } from 'zod';
// Enums
export const TenantStatus = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted'
};
export const MemberRole = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
    VIEWER: 'viewer'
};
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
};
// Schemas
export const tenantStatusSchema = z.enum(['active', 'suspended', 'deleted']);
export const memberRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
// Input schemas
export const createTenantSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    email: z.string().email('Invalid email address'),
    ownerId: z.string().uuid('Invalid owner ID'),
    settings: z.record(z.unknown()).optional(),
    subscription: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional()
});
export const updateTenantSchema = z.object({
    tenantId: z.string().uuid('Invalid tenant ID'),
    name: z.string().min(1, 'Name is required').optional(),
    status: tenantStatusSchema.optional(),
    settings: z.record(z.unknown()).optional(),
    subscription: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional()
});
export const inviteMemberSchema = z.object({
    tenantId: z.string().uuid('Invalid tenant ID'),
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required'),
    role: memberRoleSchema,
    invitedBy: z.string().uuid('Invalid inviter ID')
});
export const updateMemberRoleSchema = z.object({
    tenantId: z.string().uuid('Invalid tenant ID'),
    memberId: z.string().uuid('Invalid member ID'),
    role: memberRoleSchema,
    updatedBy: z.string().uuid('Invalid updater ID').optional()
});
export const checkPermissionSchema = z.object({
    tenantId: z.string().uuid('Invalid tenant ID'),
    userId: z.string().uuid('Invalid user ID'),
    permission: z.enum(Object.values(Permission))
});
export const createUserSchema = z.object({
    id: z.string().uuid('Invalid user ID'),
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required'),
    metadata: z.record(z.unknown()).optional()
});
// Domain schemas
export const tenantSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    email: z.string().email(),
    status: tenantStatusSchema,
    settings: z.record(z.unknown()),
    subscription: z.record(z.unknown()),
    metadata: z.record(z.unknown()),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable().optional()
});
export const userSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
    phone: z.string().nullable().optional(),
    preferences: z.record(z.unknown()),
    lastLoginAt: z.date().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
});
export const tenantMemberSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    userId: z.string().uuid(),
    role: memberRoleSchema,
    invitedBy: z.string().uuid().nullable(),
    joinedAt: z.date(),
    updatedAt: z.date()
});
export const invitationSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    email: z.string().email(),
    role: memberRoleSchema,
    invitedBy: z.string().uuid(),
    token: z.string(),
    expiresAt: z.date(),
    acceptedAt: z.date().nullable(),
    createdAt: z.date()
});
export const authTokenSchema = z.object({
    userId: z.string().uuid(),
    tenantId: z.string().uuid().optional(),
    role: memberRoleSchema.optional()
});
// Role-based permission mappings
export const rolePermissions = {
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
};
//# sourceMappingURL=types.js.map