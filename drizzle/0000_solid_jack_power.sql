CREATE TYPE "public"."document_type" AS ENUM('invoice', 'receipt', 'purchase_order', 'credit_note', 'quote', 'contract', 'statement', 'other');--> statement-breakpoint
CREATE TYPE "public"."extraction_method" AS ENUM('primary', 'ocr_fallback', 'manual');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('valid', 'needs_review', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."file_processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."attribute_type" AS ENUM('address', 'phone', 'email', 'website', 'bank_account');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('invoice', 'manual');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('viewer', 'member', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "slack_user_mappings" (
	"workspace_id" text NOT NULL,
	"slack_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slack_user_mappings_workspace_id_slack_user_id_pk" PRIMARY KEY("workspace_id","slack_user_id")
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
	"line_items" jsonb[],
	"overall_confidence" numeric(5, 2) NOT NULL,
	"data_completeness" numeric(5, 2) NOT NULL,
	"validation_status" "validation_status" NOT NULL,
	"annotations" jsonb,
	"matched_supplier_id" uuid,
	"match_confidence" numeric(5, 2),
	"suggested_matches" jsonb[],
	"extraction_method" "extraction_method" NOT NULL,
	"processing_duration_ms" integer NOT NULL,
	"model_version" text NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"processing_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_matched_supplier_id_suppliers_id_fk" FOREIGN KEY ("matched_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_attributes" ADD CONSTRAINT "supplier_attributes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_data_sources" ADD CONSTRAINT "supplier_data_sources_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "phone_user_idx" ON "whatsapp_verifications" USING btree ("phone_number","user_id");--> statement-breakpoint
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
CREATE UNIQUE INDEX "unique_company_number_per_tenant" ON "suppliers" USING btree ("tenant_id","company_number") WHERE company_number IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_slug_per_tenant" ON "suppliers" USING btree ("tenant_id","slug");