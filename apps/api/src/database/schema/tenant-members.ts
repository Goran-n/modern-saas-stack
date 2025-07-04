import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const memberRoleEnum = pgEnum('member_role', ['viewer', 'member', 'admin', 'owner'])
export const memberStatusEnum = pgEnum('member_status', ['pending', 'active', 'suspended', 'removed'])

export const tenantMembers = pgTable('tenant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Relationships
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').notNull(), // Supabase user ID or similar
  
  // Role and permissions
  role: memberRoleEnum('role').default('member').notNull(),
  permissions: jsonb('permissions').default('{}').notNull(),
  
  // Status management
  status: memberStatusEnum('status').default('pending').notNull(),
  
  // Invitation handling
  invitedBy: text('invited_by'),
  invitedEmail: varchar('invited_email', { length: 255 }),
  invitationToken: varchar('invitation_token', { length: 255 }),
  invitationExpiresAt: timestamp('invitation_expires_at'),
  
  // Activity tracking
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastAccessAt: timestamp('last_access_at'),
  invitedAt: timestamp('invited_at'),
  
  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type TenantMember = typeof tenantMembers.$inferSelect
export type NewTenantMember = typeof tenantMembers.$inferInsert

// Role hierarchy levels (lower number = higher privilege)
export const ROLE_HIERARCHY = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
} as const

export type RoleType = keyof typeof ROLE_HIERARCHY

// Permission categories for Kibly
export interface MemberPermissions {
  // File management
  files?: {
    upload?: boolean
    view?: boolean
    delete?: boolean
    reprocess?: boolean
    exportData?: boolean
  }
  
  // Provider integrations
  providers?: {
    create?: boolean
    view?: boolean
    update?: boolean
    delete?: boolean
    manageCredentials?: boolean
    testConnection?: boolean
  }
  
  // Invoice matching
  matching?: {
    viewMatches?: boolean
    approveMatches?: boolean
    rejectMatches?: boolean
    manualMatch?: boolean
    bulkOperations?: boolean
  }
  
  // Supplier management
  suppliers?: {
    create?: boolean
    view?: boolean
    update?: boolean
    delete?: boolean
    merge?: boolean
    verify?: boolean
  }
  
  // Analytics and reporting
  analytics?: {
    viewReports?: boolean
    exportReports?: boolean
    viewMetrics?: boolean
    viewAuditLog?: boolean
    accessRawData?: boolean
  }
  
  // Team management
  team?: {
    viewMembers?: boolean
    inviteMembers?: boolean
    manageMembers?: boolean
    assignRoles?: boolean
    removeMembers?: boolean
  }
  
  // Tenant administration
  tenant?: {
    viewSettings?: boolean
    manageSettings?: boolean
    manageBilling?: boolean
    manageIntegrations?: boolean
    deleteTenant?: boolean
    viewAuditLog?: boolean
  }
  
  // API access
  api?: {
    useApi?: boolean
    manageApiKeys?: boolean
    viewApiLogs?: boolean
    webhookAccess?: boolean
  }
}

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, MemberPermissions> = {
  viewer: {
    files: { view: true },
    providers: { view: true },
    matching: { viewMatches: true },
    suppliers: { view: true },
    analytics: { viewReports: true, viewMetrics: true },
    team: { viewMembers: true },
    tenant: { viewSettings: true },
    api: { useApi: true },
  },
  
  member: {
    files: { upload: true, view: true, reprocess: true },
    providers: { view: true, testConnection: true },
    matching: { viewMatches: true, approveMatches: true, rejectMatches: true, manualMatch: true },
    suppliers: { create: true, view: true, update: true },
    analytics: { viewReports: true, viewMetrics: true, exportReports: true },
    team: { viewMembers: true },
    tenant: { viewSettings: true },
    api: { useApi: true, viewApiLogs: true },
  },
  
  admin: {
    files: { upload: true, view: true, delete: true, reprocess: true, exportData: true },
    providers: { create: true, view: true, update: true, delete: true, manageCredentials: true, testConnection: true },
    matching: { viewMatches: true, approveMatches: true, rejectMatches: true, manualMatch: true, bulkOperations: true },
    suppliers: { create: true, view: true, update: true, delete: true, merge: true, verify: true },
    analytics: { viewReports: true, exportReports: true, viewMetrics: true, viewAuditLog: true, accessRawData: true },
    team: { viewMembers: true, inviteMembers: true, manageMembers: true, assignRoles: true },
    tenant: { viewSettings: true, manageSettings: true, manageIntegrations: true, viewAuditLog: true },
    api: { useApi: true, manageApiKeys: true, viewApiLogs: true, webhookAccess: true },
  },
  
  owner: {
    files: { upload: true, view: true, delete: true, reprocess: true, exportData: true },
    providers: { create: true, view: true, update: true, delete: true, manageCredentials: true, testConnection: true },
    matching: { viewMatches: true, approveMatches: true, rejectMatches: true, manualMatch: true, bulkOperations: true },
    suppliers: { create: true, view: true, update: true, delete: true, merge: true, verify: true },
    analytics: { viewReports: true, exportReports: true, viewMetrics: true, viewAuditLog: true, accessRawData: true },
    team: { viewMembers: true, inviteMembers: true, manageMembers: true, assignRoles: true, removeMembers: true },
    tenant: { viewSettings: true, manageSettings: true, manageBilling: true, manageIntegrations: true, deleteTenant: true, viewAuditLog: true },
    api: { useApi: true, manageApiKeys: true, viewApiLogs: true, webhookAccess: true },
  },
}