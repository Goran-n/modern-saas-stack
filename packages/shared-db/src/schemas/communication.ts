import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// WhatsApp phone number verification and mapping
export const whatsappVerifications = pgTable(
  "whatsapp_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneNumber: text("phone_number").notNull(), // E.164 format
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull(),
    verificationCode: text("verification_code").notNull(),
    verified: boolean("verified").notNull().default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      // Allow multiple verification attempts per phone
      phoneUserIdx: uniqueIndex("phone_user_idx").on(
        table.phoneNumber,
        table.userId,
      ),
    };
  },
);

// Verified WhatsApp mappings (simple, one phone -> one user for now)
export const whatsappMappings = pgTable("whatsapp_mappings", {
  phoneNumber: text("phone_number").primaryKey(), // E.164 format
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Slack OAuth tokens and workspace mapping
export const slackWorkspaces = pgTable("slack_workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id").notNull().unique(), // Slack team ID
  tenantId: uuid("tenant_id").notNull(),
  botToken: text("bot_token").notNull(), // Encrypted xoxb- token
  botUserId: text("bot_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Slack user mappings within a workspace
export const slackUserMappings = pgTable(
  "slack_user_mappings",
  {
    workspaceId: text("workspace_id").notNull(),
    slackUserId: text("slack_user_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.workspaceId, table.slackUserId] }),
    };
  },
);

// Communication messages for storing text messages and NLQ queries
export const communicationMessages = pgTable("communication_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: text("message_id").notNull().unique(),
  platform: text("platform", {
    enum: ["whatsapp", "slack"],
  }).notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"),
  
  // Query processing fields
  isQuery: boolean("is_query").default(false),
  parsedQuery: jsonb("parsed_query"),
  queryConfidence: numeric("query_confidence", { precision: 3, scale: 2 }),
  response: jsonb("response"),
  processingTimeMs: integer("processing_time_ms"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Query analytics for tracking NLQ performance
export const queryAnalytics = pgTable("query_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => communicationMessages.id, { onDelete: "cascade" }),
  intent: text("intent").notNull(),
  entities: jsonb("entities"),
  executionTimeMs: integer("execution_time_ms"),
  resultCount: integer("result_count"),
  error: text("error"),
  llmTokensUsed: integer("llm_tokens_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Type exports
export type WhatsappVerification = typeof whatsappVerifications.$inferSelect;
export type NewWhatsappVerification = typeof whatsappVerifications.$inferInsert;
export type WhatsappMapping = typeof whatsappMappings.$inferSelect;
export type NewWhatsappMapping = typeof whatsappMappings.$inferInsert;
export type SlackWorkspace = typeof slackWorkspaces.$inferSelect;
export type NewSlackWorkspace = typeof slackWorkspaces.$inferInsert;
export type SlackUserMapping = typeof slackUserMappings.$inferSelect;
export type NewSlackUserMapping = typeof slackUserMappings.$inferInsert;
export type CommunicationMessage = typeof communicationMessages.$inferSelect;
export type NewCommunicationMessage = typeof communicationMessages.$inferInsert;
export type QueryAnalytic = typeof queryAnalytics.$inferSelect;
export type NewQueryAnalytic = typeof queryAnalytics.$inferInsert;
