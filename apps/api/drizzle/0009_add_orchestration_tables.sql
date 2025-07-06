-- Create enums for orchestration
CREATE TYPE "intent_type" AS ENUM ('question', 'document_submission', 'command', 'clarification', 'greeting', 'unknown');
CREATE TYPE "intent_sub_type" AS ENUM ('vat_query', 'transaction_query', 'receipt_status', 'deadline_query', 'receipt_upload', 'invoice_upload', 'statement_upload', 'generate_report', 'export_data', 'reconcile');
CREATE TYPE "decision_action" AS ENUM ('respond', 'request_info', 'execute_function', 'escalate', 'clarify');

-- Create orchestration_contexts table
CREATE TABLE IF NOT EXISTS "orchestration_contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"recent_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_intent" jsonb,
	"pending_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"session_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_activity" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);

-- Create ai_decisions table
CREATE TABLE IF NOT EXISTS "ai_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"context_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"intent" jsonb NOT NULL,
	"decision" jsonb NOT NULL,
	"executed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_text" text NOT NULL,
	"tokens_used" integer NOT NULL,
	"model_used" text NOT NULL,
	"processing_time" integer NOT NULL,
	"permissions_denied" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS "prompt_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text,
	"user_prompt_template" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb,
	"category" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);

-- Create ai_functions table
CREATE TABLE IF NOT EXISTS "ai_functions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"parameters" jsonb NOT NULL,
	"required_permission" text,
	"handler_name" text NOT NULL,
	"handler_config" jsonb DEFAULT '{}'::jsonb,
	"is_active" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create conversation_summaries table
CREATE TABLE IF NOT EXISTS "conversation_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"summary" text NOT NULL,
	"key_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb,
	"message_count" integer NOT NULL,
	"date_range" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for orchestration_contexts
CREATE INDEX IF NOT EXISTS "orchestration_contexts_conversation_idx" ON "orchestration_contexts" ("conversation_id");
CREATE INDEX IF NOT EXISTS "orchestration_contexts_user_idx" ON "orchestration_contexts" ("user_id");
CREATE INDEX IF NOT EXISTS "orchestration_contexts_tenant_idx" ON "orchestration_contexts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "orchestration_contexts_last_activity_idx" ON "orchestration_contexts" ("last_activity");
CREATE UNIQUE INDEX IF NOT EXISTS "orchestration_contexts_conversation_unique" ON "orchestration_contexts" ("conversation_id");

-- Create indexes for ai_decisions
CREATE INDEX IF NOT EXISTS "ai_decisions_context_idx" ON "ai_decisions" ("context_id");
CREATE INDEX IF NOT EXISTS "ai_decisions_conversation_idx" ON "ai_decisions" ("conversation_id");
CREATE INDEX IF NOT EXISTS "ai_decisions_created_at_idx" ON "ai_decisions" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_decisions_model_idx" ON "ai_decisions" ("model_used");

-- Create indexes for prompt_templates
CREATE UNIQUE INDEX IF NOT EXISTS "prompt_templates_name_idx" ON "prompt_templates" ("name");
CREATE INDEX IF NOT EXISTS "prompt_templates_category_idx" ON "prompt_templates" ("category");
CREATE INDEX IF NOT EXISTS "prompt_templates_active_idx" ON "prompt_templates" ("is_active");

-- Create indexes for ai_functions
CREATE UNIQUE INDEX IF NOT EXISTS "ai_functions_name_idx" ON "ai_functions" ("name");
CREATE INDEX IF NOT EXISTS "ai_functions_active_idx" ON "ai_functions" ("is_active");
CREATE INDEX IF NOT EXISTS "ai_functions_permission_idx" ON "ai_functions" ("required_permission");

-- Create indexes for conversation_summaries
CREATE INDEX IF NOT EXISTS "conversation_summaries_conversation_idx" ON "conversation_summaries" ("conversation_id");
CREATE INDEX IF NOT EXISTS "conversation_summaries_user_idx" ON "conversation_summaries" ("user_id");
CREATE INDEX IF NOT EXISTS "conversation_summaries_tenant_idx" ON "conversation_summaries" ("tenant_id");
CREATE INDEX IF NOT EXISTS "conversation_summaries_created_at_idx" ON "conversation_summaries" ("created_at");