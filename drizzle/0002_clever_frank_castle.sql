CREATE TYPE "public"."logo_fetch_status" AS ENUM('pending', 'success', 'not_found', 'failed');--> statement-breakpoint
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
CREATE TABLE "global_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_number" text,
	"vat_number" text,
	"canonical_name" text NOT NULL,
	"primary_domain" text,
	"logo_url" text,
	"logo_fetched_at" timestamp with time zone,
	"logo_fetch_status" "logo_fetch_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "global_supplier_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_company_number" ON "global_suppliers" USING btree ("company_number");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_vat_number" ON "global_suppliers" USING btree ("vat_number");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_primary_domain" ON "global_suppliers" USING btree ("primary_domain");--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_logo_fetch_status" ON "global_suppliers" USING btree ("logo_fetch_status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_global_company_number" ON "global_suppliers" USING btree ("company_number") WHERE company_number IS NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_global_supplier_id_global_suppliers_id_fk" FOREIGN KEY ("global_supplier_id") REFERENCES "public"."global_suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_suppliers_global_supplier_id" ON "suppliers" USING btree ("global_supplier_id");