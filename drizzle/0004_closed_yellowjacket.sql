CREATE TYPE "public"."email_connection_status" AS ENUM('active', 'inactive', 'error', 'expired');--> statement-breakpoint
CREATE TYPE "public"."email_processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('gmail', 'outlook', 'imap');--> statement-breakpoint
CREATE TABLE "email_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "email_provider" NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"imap_host" varchar(255),
	"imap_port" integer,
	"imap_username" varchar(255),
	"imap_password" text,
	"folder_filter" jsonb DEFAULT '["INBOX"]'::jsonb NOT NULL,
	"sender_filter" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject_filter" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"webhook_subscription_id" varchar(255),
	"webhook_expires_at" timestamp,
	"status" "email_connection_status" DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_processing_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"thread_id" varchar(255),
	"email_date" timestamp NOT NULL,
	"from_address" varchar(255),
	"subject" text,
	"attachment_count" integer DEFAULT 0 NOT NULL,
	"attachments_total_size" integer DEFAULT 0,
	"processing_status" "email_processing_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"processing_duration_ms" integer,
	"file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_processing_log_connection_id_message_id_unique" UNIQUE("connection_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "email_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"emails_per_minute" integer DEFAULT 10 NOT NULL,
	"attachments_per_hour" integer DEFAULT 100 NOT NULL,
	"total_size_per_day" integer DEFAULT 1000000000 NOT NULL,
	"custom_limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_rate_limits_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "document_extractions" ADD COLUMN "ownership_validation" jsonb;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD COLUMN "requires_review" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD COLUMN "review_reason" text;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD COLUMN "review_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_processing_log" ADD CONSTRAINT "email_processing_log_connection_id_email_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."email_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rate_limits" ADD CONSTRAINT "email_rate_limits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;