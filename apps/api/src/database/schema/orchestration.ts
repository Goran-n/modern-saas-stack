import { 
  pgTable, 
  text, 
  timestamp, 
  integer, 
  jsonb,
  index,
  uniqueIndex,
  pgEnum
} from 'drizzle-orm/pg-core'

// Enums
export const intentTypeEnum = pgEnum('intent_type', [
  'question',
  'document_submission',
  'command',
  'clarification',
  'greeting',
  'unknown'
])

export const intentSubTypeEnum = pgEnum('intent_sub_type', [
  'vat_query',
  'transaction_query',
  'receipt_status',
  'deadline_query',
  'receipt_upload',
  'invoice_upload',
  'statement_upload',
  'generate_report',
  'export_data',
  'reconcile'
])

export const decisionActionEnum = pgEnum('decision_action', [
  'respond',
  'request_info',
  'execute_function',
  'escalate',
  'clarify'
])

// Orchestration context table
export const orchestrationContexts = pgTable('orchestration_contexts', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  userId: text('user_id').notNull(),
  channelId: text('channel_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  
  // Context data
  recentMessages: jsonb('recent_messages').notNull().default([]),
  currentIntent: jsonb('current_intent'),
  pendingActions: jsonb('pending_actions').notNull().default([]),
  sessionData: jsonb('session_data').notNull().default({}),
  
  // Timestamps
  lastActivity: timestamp('last_activity', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  version: integer('version').notNull().default(1)
}, (table) => ({
  conversationIdx: index('orchestration_contexts_conversation_idx').on(table.conversationId),
  userIdx: index('orchestration_contexts_user_idx').on(table.userId),
  tenantIdx: index('orchestration_contexts_tenant_idx').on(table.tenantId),
  lastActivityIdx: index('orchestration_contexts_last_activity_idx').on(table.lastActivity),
  uniqueConversation: uniqueIndex('orchestration_contexts_conversation_unique').on(table.conversationId)
}))

// AI decisions table
export const aiDecisions = pgTable('ai_decisions', {
  id: text('id').primaryKey(),
  contextId: text('context_id').notNull(),
  conversationId: text('conversation_id').notNull(),
  
  // Intent and decision data
  intent: jsonb('intent').notNull(),
  decision: jsonb('decision').notNull(),
  executedActions: jsonb('executed_actions').notNull().default([]),
  
  // Response and metrics
  responseText: text('response_text').notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  modelUsed: text('model_used').notNull(),
  processingTime: integer('processing_time').notNull(), // milliseconds
  
  // Permissions tracking
  permissionsDenied: jsonb('permissions_denied'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  version: integer('version').notNull().default(1)
}, (table) => ({
  contextIdx: index('ai_decisions_context_idx').on(table.contextId),
  conversationIdx: index('ai_decisions_conversation_idx').on(table.conversationId),
  createdAtIdx: index('ai_decisions_created_at_idx').on(table.createdAt),
  modelIdx: index('ai_decisions_model_idx').on(table.modelUsed)
}))

// Prompt templates table (for managing AI prompts)
export const promptTemplates = pgTable('prompt_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  
  // Prompt configuration
  systemPrompt: text('system_prompt'),
  userPromptTemplate: text('user_prompt_template').notNull(),
  variables: jsonb('variables').notNull().default([]),
  examples: jsonb('examples').default([]),
  
  // Metadata
  category: text('category'),
  isActive: integer('is_active').notNull().default(1),
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  version: integer('version').notNull().default(1)
}, (table) => ({
  nameIdx: uniqueIndex('prompt_templates_name_idx').on(table.name),
  categoryIdx: index('prompt_templates_category_idx').on(table.category),
  activeIdx: index('prompt_templates_active_idx').on(table.isActive)
}))

// AI function definitions table
export const aiFunctions = pgTable('ai_functions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  
  // Function configuration
  parameters: jsonb('parameters').notNull(),
  requiredPermission: text('required_permission'),
  
  // Handler information
  handlerName: text('handler_name').notNull(),
  handlerConfig: jsonb('handler_config').default({}),
  
  // Status
  isActive: integer('is_active').notNull().default(1),
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  nameIdx: uniqueIndex('ai_functions_name_idx').on(table.name),
  activeIdx: index('ai_functions_active_idx').on(table.isActive),
  permissionIdx: index('ai_functions_permission_idx').on(table.requiredPermission)
}))

// Conversation summaries table (for long-term memory)
export const conversationSummaries = pgTable('conversation_summaries', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  
  // Summary data
  summary: text('summary').notNull(),
  keyPoints: jsonb('key_points').notNull().default([]),
  topics: jsonb('topics').default([]),
  
  // Metadata
  messageCount: integer('message_count').notNull(),
  dateRange: jsonb('date_range').notNull(), // {from: Date, to: Date}
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  conversationIdx: index('conversation_summaries_conversation_idx').on(table.conversationId),
  userIdx: index('conversation_summaries_user_idx').on(table.userId),
  tenantIdx: index('conversation_summaries_tenant_idx').on(table.tenantId),
  createdAtIdx: index('conversation_summaries_created_at_idx').on(table.createdAt)
}))

// Type exports for use in repositories
export type OrchestrationContext = typeof orchestrationContexts.$inferSelect
export type NewOrchestrationContext = typeof orchestrationContexts.$inferInsert

export type AIDecision = typeof aiDecisions.$inferSelect
export type NewAIDecision = typeof aiDecisions.$inferInsert

export type PromptTemplate = typeof promptTemplates.$inferSelect
export type NewPromptTemplate = typeof promptTemplates.$inferInsert

export type AIFunction = typeof aiFunctions.$inferSelect
export type NewAIFunction = typeof aiFunctions.$inferInsert

export type ConversationSummary = typeof conversationSummaries.$inferSelect
export type NewConversationSummary = typeof conversationSummaries.$inferInsert