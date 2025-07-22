-- Add tenant_id column to slack_user_mappings (nullable first)
ALTER TABLE "slack_user_mappings" ADD COLUMN "tenant_id" uuid;

-- Update existing rows to set tenant_id from slack_workspaces
UPDATE "slack_user_mappings" sm
SET "tenant_id" = sw."tenant_id"
FROM "slack_workspaces" sw
WHERE sm."workspace_id" = sw."workspace_id";

-- Now make the column NOT NULL after data is populated
ALTER TABLE "slack_user_mappings" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Drop the old primary key
ALTER TABLE "slack_user_mappings" DROP CONSTRAINT "slack_user_mappings_workspace_id_slack_user_id_pk";

-- Add the new composite primary key
ALTER TABLE "slack_user_mappings" ADD CONSTRAINT "slack_user_mappings_workspace_id_slack_user_id_tenant_id_pk" PRIMARY KEY("workspace_id","slack_user_id","tenant_id");

-- Create the rest of the tables and modifications from the original migration
CREATE TYPE "public"."duplicate_status" AS ENUM('unique', 'duplicate', 'possible_duplicate', 'reviewing');

CREATE TABLE "communication_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" text NOT NULL,
	"platform" text NOT NULL,
	"sender" text NOT NULL,
	"content" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"is_query" boolean DEFAULT false,
	"parsed_query" jsonb,
	"query_confidence" numeric(3, 2),
	"response" jsonb,
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communication_messages_message_id_unique" UNIQUE("message_id")
);

CREATE TABLE "query_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"intent" text NOT NULL,
	"entities" jsonb,
	"execution_time_ms" integer,
	"result_count" integer,
	"error" text,
	"llm_tokens_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "document_extractions" ADD COLUMN "invoice_fingerprint" text;
ALTER TABLE "document_extractions" ADD COLUMN "duplicate_confidence" numeric(5, 2);
ALTER TABLE "document_extractions" ADD COLUMN "duplicate_candidate_id" uuid;
ALTER TABLE "document_extractions" ADD COLUMN "duplicate_status" "duplicate_status" DEFAULT 'unique';
ALTER TABLE "files" ADD COLUMN "content_hash" text;
ALTER TABLE "files" ADD COLUMN "file_size" bigint;
ALTER TABLE "query_analytics" ADD CONSTRAINT "query_analytics_message_id_communication_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."communication_messages"("id") ON DELETE cascade ON UPDATE no action;