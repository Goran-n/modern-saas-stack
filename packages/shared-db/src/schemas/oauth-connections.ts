import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * OAuth connections table - stores all OAuth integrations
 * Unified storage for Gmail, Outlook, Slack, GitHub, etc.
 */
export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    
    // Relationships
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull(),
    
    // Provider information
    provider: text("provider").notNull(), // gmail, outlook, slack, github, etc.
    accountId: text("account_id").notNull(), // Provider-specific user ID
    accountEmail: text("account_email"), // User's email on the provider
    displayName: text("display_name"), // User's display name
    
    // OAuth tokens (encrypted)
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    
    // Scopes and permissions
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    
    // Connection status
    status: text("status", {
      enum: ["pending", "active", "inactive", "error", "expired"],
    })
      .notNull()
      .default("pending"),
    lastError: text("last_error"),
    
    // Webhook/subscription info (for providers that support it)
    webhookId: text("webhook_id"),
    webhookExpiresAt: timestamp("webhook_expires_at", { withTimezone: true }),
    
    // Provider-specific metadata
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    // Indexes for common queries
    tenantIdx: index("oauth_connections_tenant_idx").on(table.tenantId),
    providerIdx: index("oauth_connections_provider_idx").on(table.provider),
    statusIdx: index("oauth_connections_status_idx").on(table.status),
    userProviderIdx: index("oauth_connections_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
    
    // Ensure unique connection per tenant/provider/account
    uniqueConnection: unique("oauth_connections_unique").on(
      table.tenantId,
      table.provider,
      table.accountId,
    ),
  }),
);

// Relations
export const oauthConnectionsRelations = relations(
  oauthConnections,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [oauthConnections.tenantId],
      references: [tenants.id],
    }),
  }),
);

// Types
export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;