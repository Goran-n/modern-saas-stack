import { z } from 'zod';
export declare const TenantStatus: {
    readonly ACTIVE: "active";
    readonly SUSPENDED: "suspended";
    readonly DELETED: "deleted";
};
export declare const MemberRole: {
    readonly OWNER: "owner";
    readonly ADMIN: "admin";
    readonly MEMBER: "member";
    readonly VIEWER: "viewer";
};
export declare const Permission: {
    readonly TENANT_VIEW: "tenant:view";
    readonly TENANT_UPDATE: "tenant:update";
    readonly TENANT_DELETE: "tenant:delete";
    readonly MEMBER_VIEW: "member:view";
    readonly MEMBER_INVITE: "member:invite";
    readonly MEMBER_UPDATE: "member:update";
    readonly MEMBER_REMOVE: "member:remove";
    readonly COMMUNICATION_VIEW: "communication:view";
    readonly COMMUNICATION_SEND: "communication:send";
    readonly COMMUNICATION_MANAGE: "communication:manage";
    readonly INTEGRATION_VIEW: "integration:view";
    readonly INTEGRATION_MANAGE: "integration:manage";
    readonly SYNC_VIEW: "sync:view";
    readonly SYNC_EXECUTE: "sync:execute";
    readonly SYNC_MANAGE: "sync:manage";
};
export type TenantStatus = typeof TenantStatus[keyof typeof TenantStatus];
export type MemberRole = typeof MemberRole[keyof typeof MemberRole];
export type Permission = typeof Permission[keyof typeof Permission];
export declare const tenantStatusSchema: z.ZodEnum<["active", "suspended", "deleted"]>;
export declare const memberRoleSchema: z.ZodEnum<["owner", "admin", "member", "viewer"]>;
export declare const createTenantSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    email: z.ZodString;
    ownerId: z.ZodString;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    subscription: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    slug: string;
    ownerId: string;
    settings?: Record<string, unknown> | undefined;
    subscription?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    name: string;
    email: string;
    slug: string;
    ownerId: string;
    settings?: Record<string, unknown> | undefined;
    subscription?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export declare const updateTenantSchema: z.ZodObject<{
    tenantId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "suspended", "deleted"]>>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    subscription: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    name?: string | undefined;
    status?: "active" | "suspended" | "deleted" | undefined;
    settings?: Record<string, unknown> | undefined;
    subscription?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    tenantId: string;
    name?: string | undefined;
    status?: "active" | "suspended" | "deleted" | undefined;
    settings?: Record<string, unknown> | undefined;
    subscription?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export declare const inviteMemberSchema: z.ZodObject<{
    tenantId: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "member", "viewer"]>;
    invitedBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    tenantId: string;
    role: "viewer" | "member" | "admin" | "owner";
    invitedBy: string;
}, {
    name: string;
    email: string;
    tenantId: string;
    role: "viewer" | "member" | "admin" | "owner";
    invitedBy: string;
}>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export declare const updateMemberRoleSchema: z.ZodObject<{
    tenantId: z.ZodString;
    memberId: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "member", "viewer"]>;
    updatedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    role: "viewer" | "member" | "admin" | "owner";
    memberId: string;
    updatedBy?: string | undefined;
}, {
    tenantId: string;
    role: "viewer" | "member" | "admin" | "owner";
    memberId: string;
    updatedBy?: string | undefined;
}>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export declare const checkPermissionSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
    permission: z.ZodEnum<[Permission, ...Permission[]]>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    permission: Permission;
}, {
    tenantId: string;
    userId: string;
    permission: Permission;
}>;
export type CheckPermissionInput = z.infer<typeof checkPermissionSchema>;
export declare const createUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    name: string;
    email: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export declare const tenantSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    email: z.ZodString;
    status: z.ZodEnum<["active", "suspended", "deleted"]>;
    settings: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    subscription: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    deletedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    status: "active" | "suspended" | "deleted";
    settings: Record<string, unknown>;
    subscription: Record<string, unknown>;
    metadata: Record<string, unknown>;
    deletedAt?: Date | null | undefined;
}, {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    status: "active" | "suspended" | "deleted";
    settings: Record<string, unknown>;
    subscription: Record<string, unknown>;
    metadata: Record<string, unknown>;
    deletedAt?: Date | null | undefined;
}>;
export type Tenant = z.infer<typeof tenantSchema>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    emailVerified: z.ZodBoolean;
    phoneVerified: z.ZodBoolean;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preferences: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    lastLoginAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    preferences: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    phone?: string | null | undefined;
    lastLoginAt?: Date | null | undefined;
}, {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    preferences: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    phone?: string | null | undefined;
    lastLoginAt?: Date | null | undefined;
}>;
export type User = z.infer<typeof userSchema>;
export declare const tenantMemberSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    userId: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "member", "viewer"]>;
    invitedBy: z.ZodNullable<z.ZodString>;
    joinedAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    updatedAt: Date;
    tenantId: string;
    userId: string;
    role: "viewer" | "member" | "admin" | "owner";
    invitedBy: string | null;
    joinedAt: Date;
}, {
    id: string;
    updatedAt: Date;
    tenantId: string;
    userId: string;
    role: "viewer" | "member" | "admin" | "owner";
    invitedBy: string | null;
    joinedAt: Date;
}>;
export type TenantMember = z.infer<typeof tenantMemberSchema>;
export declare const invitationSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "member", "viewer"]>;
    invitedBy: z.ZodString;
    token: z.ZodString;
    expiresAt: z.ZodDate;
    acceptedAt: z.ZodNullable<z.ZodDate>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    createdAt: Date;
    tenantId: string;
    role: "viewer" | "member" | "admin" | "owner";
    invitedBy: string;
    token: string;
    expiresAt: Date;
    acceptedAt: Date | null;
}, {
    id: string;
    email: string;
    createdAt: Date;
    tenantId: string;
    role: "viewer" | "member" | "admin" | "owner";
    invitedBy: string;
    token: string;
    expiresAt: Date;
    acceptedAt: Date | null;
}>;
export type Invitation = z.infer<typeof invitationSchema>;
export declare const authTokenSchema: z.ZodObject<{
    userId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["owner", "admin", "member", "viewer"]>>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    tenantId?: string | undefined;
    role?: "viewer" | "member" | "admin" | "owner" | undefined;
}, {
    userId: string;
    tenantId?: string | undefined;
    role?: "viewer" | "member" | "admin" | "owner" | undefined;
}>;
export type AuthToken = z.infer<typeof authTokenSchema>;
export declare const rolePermissions: Record<MemberRole, Permission[]>;
//# sourceMappingURL=types.d.ts.map