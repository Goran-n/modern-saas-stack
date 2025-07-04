-- Create enum types for files
DO $$ BEGIN
  CREATE TYPE "public"."file_source" AS ENUM('dropbox', 'google_drive', 'onedrive', 'office365', 'whatsapp', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."file_status" AS ENUM('uploaded', 'processing', 'ready', 'failed', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."review_status" AS ENUM('not_reviewed', 'ignored', 'reviewed', 'duplicate', 'processing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE "file_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"sha256_hash" varchar(64) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"change_reason" text,
	"changed_by" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_file_version" UNIQUE("file_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_id" uuid,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256_hash" varchar(64) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"storage_bucket" varchar(100) NOT NULL,
	"source" "file_source" NOT NULL,
	"source_id" varchar(255),
	"source_path" text,
	"source_modified_at" timestamp,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "file_status" DEFAULT 'uploaded' NOT NULL,
	"review_status" "review_status" DEFAULT 'not_reviewed' NOT NULL,
	"rejection_reason" text,
	"is_duplicate" boolean DEFAULT false NOT NULL,
	"duplicate_of" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"virus_scanned" boolean DEFAULT false NOT NULL,
	"virus_scan_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"updated_by" varchar(255),
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_source_file" UNIQUE("tenant_id","source","source_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_parent_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "bank_statements" DROP CONSTRAINT "bank_statements_duplicate_of_id_bank_statements_id_fk";
--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_duplicate_of_files_id_fk" FOREIGN KEY ("duplicate_of") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_file_versions_file" ON "file_versions" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_files_tenant" ON "files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_files_hash" ON "files" USING btree ("sha256_hash");--> statement-breakpoint
CREATE INDEX "idx_files_status" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_files_source" ON "files" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_files_duplicate" ON "files" USING btree ("duplicate_of");--> statement-breakpoint
CREATE INDEX "idx_files_integration" ON "files" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "idx_files_tenant_status" ON "files" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_files_tenant_review" ON "files" USING btree ("tenant_id","review_status");