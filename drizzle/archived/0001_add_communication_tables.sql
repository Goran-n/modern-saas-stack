-- Create communication tables for WhatsApp and Slack user mappings

-- WhatsApp phone number verification and mapping
CREATE TABLE IF NOT EXISTS "whatsapp_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"verification_code" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique index for phone + user combination
CREATE UNIQUE INDEX IF NOT EXISTS "phone_user_idx" ON "whatsapp_verifications" USING btree ("phone_number","user_id");

-- Verified WhatsApp mappings (simple, one phone -> one user for now)
CREATE TABLE IF NOT EXISTS "whatsapp_mappings" (
	"phone_number" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Slack OAuth tokens and workspace mapping
CREATE TABLE IF NOT EXISTS "slack_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bot_token" text NOT NULL,
	"bot_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_workspaces_workspace_id_unique" UNIQUE("workspace_id")
);

-- Slack user mappings within a workspace
CREATE TABLE IF NOT EXISTS "slack_user_mappings" (
	"workspace_id" text NOT NULL,
	"slack_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_user_mappings_workspace_id_slack_user_id_pk" PRIMARY KEY("workspace_id","slack_user_id")
);