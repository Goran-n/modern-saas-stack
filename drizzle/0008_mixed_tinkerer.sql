CREATE TYPE "public"."audit_entity_type" AS ENUM('file', 'supplier', 'email', 'user', 'extraction', 'connection');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'failure', 'partial', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('invoice', 'receipt', 'purchase_order', 'credit_note', 'quote', 'contract', 'statement', 'other');--> statement-breakpoint
CREATE TYPE "public"."duplicate_status" AS ENUM('unique', 'duplicate', 'possible_duplicate', 'reviewing');--> statement-breakpoint
CREATE TYPE "public"."extraction_method" AS ENUM('primary', 'ocr_fallback', 'manual');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('valid', 'needs_review', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."email_connection_status" AS ENUM('active', 'inactive', 'error', 'expired');--> statement-breakpoint
CREATE TYPE "public"."email_processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('gmail', 'outlook', 'imap');--> statement-breakpoint
CREATE TYPE "public"."file_processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."enrichment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'manual');--> statement-breakpoint
CREATE TYPE "public"."logo_fetch_status" AS ENUM('pending', 'success', 'not_found', 'failed');--> statement-breakpoint
CREATE TYPE "public"."attribute_type" AS ENUM('address', 'phone', 'email', 'website', 'bank_account');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('invoice', 'manual');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('viewer', 'member', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"event_type" text NOT NULL,
	"decision" text NOT NULL,
	"context" jsonb,
	"metadata" jsonb,
	"outcome" "audit_outcome" NOT NULL,
	"confidence" numeric(5, 4),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"duration" numeric(10, 3),
	"correlation_id" uuid NOT NULL,
	"parent_event_id" uuid,
	"user_id" uuid,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "slack_linking_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"slack_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"slack_email" text,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_linking_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "slack_user_mappings" (
	"workspace_id" text NOT NULL,
	"slack_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_user_mappings_workspace_id_slack_user_id_tenant_id_pk" PRIMARY KEY("workspace_id","slack_user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "slack_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bot_token" text NOT NULL,
	"bot_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_workspaces_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_mappings" (
	"phone_number" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"verification_code" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"document_type" "document_type" NOT NULL,
	"document_type_confidence" numeric(5, 2) NOT NULL,
	"extracted_fields" jsonb NOT NULL,
	"company_profile" jsonb,
	"line_items" jsonb,
	"overall_confidence" numeric(5, 2) NOT NULL,
	"data_completeness" numeric(5, 2) NOT NULL,
	"validation_status" "validation_status" NOT NULL,
	"annotations" jsonb,
	"matched_supplier_id" uuid,
	"match_confidence" numeric(5, 2),
	"suggested_matches" jsonb,
	"invoice_fingerprint" text,
	"duplicate_confidence" numeric(5, 2),
	"duplicate_candidate_id" uuid,
	"duplicate_status" "duplicate_status" DEFAULT 'unique',
	"extraction_method" "extraction_method" NOT NULL,
	"processing_duration_ms" integer NOT NULL,
	"model_version" text NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"processing_notes" text,
	"ownership_validation" jsonb,
	"requires_review" boolean DEFAULT false,
	"review_reason" text,
	"review_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"path_tokens" text[] NOT NULL,
	"mime_type" text NOT NULL,
	"size" bigint NOT NULL,
	"metadata" jsonb,
	"source" text NOT NULL,
	"source_id" text,
	"tenant_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"processing_status" "file_processing_status" DEFAULT 'pending',
	"bucket" text DEFAULT 'vault' NOT NULL,
	"content_hash" text,
	"file_size" bigint,
	"thumbnail_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_number" text,
	"vat_number" text,
	"canonical_name" text NOT NULL,
	"primary_domain" text,
	"logo_url" text,
	"logo_fetched_at" timestamp with time zone,
	"logo_fetch_status" "logo_fetch_status" DEFAULT 'pending' NOT NULL,
	"enrichment_status" "enrichment_status" DEFAULT 'pending' NOT NULL,
	"enrichment_data" jsonb,
	"last_enrichment_at" timestamp with time zone,
	"enrichment_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"attribute_type" "attribute_type" NOT NULL,
	"value" jsonb NOT NULL,
	"hash" text NOT NULL,
	"source_type" "data_source" NOT NULL,
	"source_id" text,
	"confidence" integer DEFAULT 50 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "supplier_data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"source_type" "data_source" NOT NULL,
	"source_id" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_number" text,
	"vat_number" text,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"global_supplier_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"invited_by" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tenant_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"invited_by" text,
	"invited_email" varchar(255),
	"invitation_token" varchar(255),
	"invitation_expires_at" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_access_at" timestamp,
	"invited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"subscription" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT 'gdhiif36ynt1xqc0ffhc7pez' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"account_id" text NOT NULL,
	"account_email" text,
	"display_name" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"webhook_id" text,
	"webhook_expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "oauth_connections_unique" UNIQUE("tenant_id","provider","account_id")
);
--> statement-breakpoint
ALTER TABLE "query_analytics" ADD CONSTRAINT "query_analytics_message_id_communication_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."communication_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_matched_supplier_id_suppliers_id_fk" FOREIGN KEY ("matched_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rate_limits" ADD CONSTRAINT "email_rate_limits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_attributes" ADD CONSTRAINT "supplier_attributes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_data_sources" ADD CONSTRAINT "supplier_data_sources_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_global_supplier_id_global_suppliers_id_fk" FOREIGN KEY ("global_supplier_id") REFERENCES "public"."global_suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_tenant_id_idx" ON "audit_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_event_type_idx" ON "audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_events_timestamp_idx" ON "audit_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_idx" ON "audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "audit_events_parent_event_idx" ON "audit_events" USING btree ("parent_event_id");--> statement-breakpoint
CREATE INDEX "audit_events_tenant_entity_idx" ON "audit_events" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_tenant_time_idx" ON "audit_events" USING btree ("tenant_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "phone_user_idx" ON "whatsapp_verifications" USING btree ("phone_number","user_id");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_company_number" ON "global_suppliers" USING btree ("company_number");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_vat_number" ON "global_suppliers" USING btree ("vat_number");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_primary_domain" ON "global_suppliers" USING btree ("primary_domain");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_logo_fetch_status" ON "global_suppliers" USING btree ("logo_fetch_status");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_enrichment_status" ON "global_suppliers" USING btree ("enrichment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_global_company_number" ON "global_suppliers" USING btree ("company_number") WHERE company_number IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_supplier_attributes_supplier_id" ON "supplier_attributes" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_attributes_type" ON "supplier_attributes" USING btree ("attribute_type");--> statement-breakpoint
CREATE INDEX "idx_supplier_attributes_active" ON "supplier_attributes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_supplier_attributes_hash" ON "supplier_attributes" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_attribute_value" ON "supplier_attributes" USING btree ("supplier_id","attribute_type","hash");--> statement-breakpoint
CREATE INDEX "idx_supplier_data_sources_supplier_id" ON "supplier_data_sources" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_data_sources_source_type" ON "supplier_data_sources" USING btree ("source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_source_per_supplier" ON "supplier_data_sources" USING btree ("supplier_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_tenant_id" ON "suppliers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_status" ON "suppliers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suppliers_company_number" ON "suppliers" USING btree ("company_number");--> statement-breakpoint
CREATE INDEX "idx_suppliers_vat_number" ON "suppliers" USING btree ("vat_number");--> statement-breakpoint
CREATE INDEX "idx_suppliers_global_supplier_id" ON "suppliers" USING btree ("global_supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_company_number_per_tenant" ON "suppliers" USING btree ("tenant_id","company_number") WHERE company_number IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_slug_per_tenant" ON "suppliers" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "oauth_connections_tenant_idx" ON "oauth_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "oauth_connections_provider_idx" ON "oauth_connections" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "oauth_connections_status_idx" ON "oauth_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "oauth_connections_user_provider_idx" ON "oauth_connections" USING btree ("user_id","provider");