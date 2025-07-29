-- Create logo fetch status enum
CREATE TYPE "logo_fetch_status" AS ENUM ('pending', 'success', 'not_found', 'failed');

-- Create global suppliers table
CREATE TABLE IF NOT EXISTS "global_suppliers" (
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

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_global_suppliers_company_number" ON "global_suppliers" ("company_number");
CREATE INDEX IF NOT EXISTS "idx_global_suppliers_vat_number" ON "global_suppliers" ("vat_number");
CREATE INDEX IF NOT EXISTS "idx_global_suppliers_primary_domain" ON "global_suppliers" ("primary_domain");
CREATE INDEX IF NOT EXISTS "idx_global_suppliers_logo_fetch_status" ON "global_suppliers" ("logo_fetch_status");

-- Add unique constraint for company number
CREATE UNIQUE INDEX IF NOT EXISTS "unique_global_company_number" ON "global_suppliers" ("company_number") WHERE company_number IS NOT NULL;

-- Add global supplier ID to suppliers table
ALTER TABLE "suppliers" ADD COLUMN "global_supplier_id" uuid REFERENCES "global_suppliers"("id");

-- Add index for global supplier ID
CREATE INDEX IF NOT EXISTS "idx_suppliers_global_supplier_id" ON "suppliers" ("global_supplier_id");