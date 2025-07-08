import { pgTable, text, timestamp, jsonb, boolean, pgEnum, uuid, varchar } from 'drizzle-orm/pg-core'

// Enums - match existing database
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'deleted'])
export const memberRoleEnum = pgEnum('member_role', ['viewer', 'member', 'admin', 'owner'])
export const memberStatusEnum = pgEnum('member_status', ['pending', 'active', 'suspended', 'removed'])

// Users table - matches existing database structure
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 255 }),
  emailVerified: boolean('email_verified').default(false).notNull(),
  phoneVerified: boolean('phone_verified').default(false).notNull(),
  preferences: jsonb('preferences').default({}).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Tenants table - matches existing database structure
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  status: tenantStatusEnum('status').default('active').notNull(),
  settings: jsonb('settings').default({}).notNull(),
  subscription: jsonb('subscription').default({}).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
})

// Tenant members table - matches existing database structure
export const tenantMembers = pgTable('tenant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull(), // Text to support both UUID and Supabase IDs
  role: memberRoleEnum('role').default('member').notNull(),
  permissions: jsonb('permissions').default({}).notNull(),
  status: memberStatusEnum('status').default('pending').notNull(),
  invitedBy: text('invited_by'),
  invitedEmail: varchar('invited_email', { length: 255 }),
  invitationToken: varchar('invitation_token', { length: 255 }),
  invitationExpiresAt: timestamp('invitation_expires_at'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastAccessAt: timestamp('last_access_at'),
  invitedAt: timestamp('invited_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Invitations table
export const invitations = pgTable('invitations', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull(),
  role: memberRoleEnum('role').notNull(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

// Type exports
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
export type TenantMember = typeof tenantMembers.$inferSelect
export type NewTenantMember = typeof tenantMembers.$inferInsert
export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert