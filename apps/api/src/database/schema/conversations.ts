import { pgTable, uuid, varchar, timestamp, integer, jsonb, pgEnum, index, text, boolean } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { files } from './files'

// Enums
export const channelTypeEnum = pgEnum('channel_type', ['whatsapp', 'slack', 'teams', 'email'])
export const channelStatusEnum = pgEnum('channel_status', ['pending', 'active', 'inactive', 'failed'])
export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'archived', 'closed'])
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound'])
export const messageTypeEnum = pgEnum('message_type', ['text', 'file', 'image', 'voice', 'system'])

// User communication channels (WhatsApp, Slack, etc.)
export const userChannels = pgTable('user_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull(), // Supabase user ID
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channel_type: channelTypeEnum('channel_type').notNull(),
  channel_identifier: varchar('channel_identifier', { length: 255 }).notNull(), // phone number, slack user id, etc.
  channel_name: varchar('channel_name', { length: 255 }), // friendly name
  status: channelStatusEnum('status').notNull().default('pending'),
  is_verified: boolean('is_verified').notNull().default(false),
  verification_code: varchar('verification_code', { length: 6 }),
  verification_expires_at: timestamp('verification_expires_at'),
  settings: jsonb('settings').default({}).notNull(),
  last_active_at: timestamp('last_active_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
}, (table) => ({
  userIdx: index('idx_user_channels_user').on(table.user_id),
  tenantIdx: index('idx_user_channels_tenant').on(table.tenant_id),
  uniqueUserChannel: index('unique_user_channel').on(table.user_id, table.channel_type, table.channel_identifier),
}))

// Conversations between users and AI
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull(), // Supabase user ID
  channel_id: uuid('channel_id').notNull().references(() => userChannels.id, { onDelete: 'cascade' }),
  external_thread_id: varchar('external_thread_id', { length: 255 }), // Slack thread ID, WhatsApp conversation ID
  status: conversationStatusEnum('status').notNull().default('active'),
  metadata: jsonb('metadata').default({}).notNull(),
  message_count: integer('message_count').notNull().default(0),
  last_message_at: timestamp('last_message_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
}, (table) => ({
  userIdx: index('idx_conversations_user').on(table.user_id),
  tenantIdx: index('idx_conversations_tenant').on(table.tenant_id),
  channelIdx: index('idx_conversations_channel').on(table.channel_id),
}))

// Individual messages
export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversation_id: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  external_message_id: varchar('external_message_id', { length: 255 }), // Twilio SID, Slack timestamp
  direction: messageDirectionEnum('direction').notNull(),
  message_type: messageTypeEnum('message_type').notNull(),
  content: text('content'),
  metadata: jsonb('metadata').default({}).notNull(), // delivery status, read receipts, etc.
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  conversationIdx: index('idx_conversation_messages_conversation').on(table.conversation_id),
  externalMessageIdx: index('idx_conversation_messages_external').on(table.external_message_id),
}))

// Files shared in conversations
export const conversationFiles = pgTable('conversation_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  message_id: uuid('message_id').notNull().references(() => conversationMessages.id, { onDelete: 'cascade' }),
  file_id: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  original_name: varchar('original_name', { length: 255 }),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  messageIdx: index('idx_conversation_files_message').on(table.message_id),
  fileIdx: index('idx_conversation_files_file').on(table.file_id),
}))

// Types
export type UserChannelRow = typeof userChannels.$inferSelect
export type NewUserChannelRow = typeof userChannels.$inferInsert
export type ConversationRow = typeof conversations.$inferSelect
export type NewConversationRow = typeof conversations.$inferInsert
export type ConversationMessageRow = typeof conversationMessages.$inferSelect
export type NewConversationMessageRow = typeof conversationMessages.$inferInsert
export type ConversationFileRow = typeof conversationFiles.$inferSelect
export type NewConversationFileRow = typeof conversationFiles.$inferInsert