import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

// Email provider enum
export const emailProviderEnum = pgEnum("email_provider", [
  "gmail",
  "outlook",
  "imap",
]);

// Connection status enum
export const emailConnectionStatusEnum = pgEnum("email_connection_status", [
  "active",
  "inactive",
  "error",
  "expired",
]);

// Processing status enum
export const emailProcessingStatusEnum = pgEnum("email_processing_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Email connections table
export const emailConnections = pgTable("email_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: emailProviderEnum("provider").notNull(),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  
  // OAuth tokens (encrypted)
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // IMAP credentials (encrypted)
  imapHost: varchar("imap_host", { length: 255 }),
  imapPort: integer("imap_port"),
  imapUsername: varchar("imap_username", { length: 255 }),
  imapPassword: text("imap_password"), // encrypted
  
  // Configuration
  folderFilter: jsonb("folder_filter").default(["INBOX"]).notNull().$type<string[]>(),
  senderFilter: jsonb("sender_filter").default([]).notNull().$type<string[]>(),
  subjectFilter: jsonb("subject_filter").default([]).notNull().$type<string[]>(),
  
  // Webhook configuration
  webhookSubscriptionId: varchar("webhook_subscription_id", { length: 255 }),
  webhookExpiresAt: timestamp("webhook_expires_at"),
  
  // Status
  status: emailConnectionStatusEnum("status").default("active").notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  metadata: jsonb("metadata").default({}).notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by").notNull(),
});

// Email processing log table
export const emailProcessingLog = pgTable(
  "email_processing_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull(),
      // Note: No foreign key constraint as this can reference either emailConnections or oauthConnections
    messageId: varchar("message_id", { length: 255 }).notNull(),
    threadId: varchar("thread_id", { length: 255 }),
    emailDate: timestamp("email_date").notNull(),
    fromAddress: varchar("from_address", { length: 255 }),
    subject: text("subject"),
    attachmentCount: integer("attachment_count").default(0).notNull(),
    attachmentsTotalSize: integer("attachments_total_size").default(0),
    processingStatus: emailProcessingStatusEnum("processing_status")
      .default("pending")
      .notNull(),
    processedAt: timestamp("processed_at"),
    processingDurationMs: integer("processing_duration_ms"),
    fileIds: jsonb("file_ids").default([]).notNull().$type<string[]>(),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueMessagePerConnection: unique().on(table.connectionId, table.messageId),
  })
);

// Email rate limits table
export const emailRateLimits = pgTable("email_rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  emailsPerMinute: integer("emails_per_minute").default(10).notNull(),
  attachmentsPerHour: integer("attachments_per_hour").default(100).notNull(),
  totalSizePerDay: integer("total_size_per_day").default(1000000000).notNull(), // 1GB default
  customLimits: jsonb("custom_limits").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports
export type EmailConnection = typeof emailConnections.$inferSelect;
export type NewEmailConnection = typeof emailConnections.$inferInsert;
export type EmailProcessingLogEntry = typeof emailProcessingLog.$inferSelect;
export type NewEmailProcessingLogEntry = typeof emailProcessingLog.$inferInsert;
export type EmailRateLimit = typeof emailRateLimits.$inferSelect;
export type NewEmailRateLimit = typeof emailRateLimits.$inferInsert;