-- Add deduplication columns to existing tables

-- Stage 1: File-level deduplication
ALTER TABLE "files" 
ADD COLUMN IF NOT EXISTS "content_hash" varchar(64),
ADD COLUMN IF NOT EXISTS "file_size" bigint;

-- Create index for efficient duplicate lookups within tenant
CREATE INDEX IF NOT EXISTS "files_tenant_hash_idx" ON "files" USING btree ("tenant_id", "content_hash");

-- Add unique constraint to prevent duplicate files per tenant
-- Note: We don't make this UNIQUE to allow re-uploads if needed, but we'll check in application logic
CREATE INDEX IF NOT EXISTS "files_content_hash_idx" ON "files" USING btree ("content_hash");

-- Stage 2: Document-level deduplication
ALTER TABLE "document_extractions"
ADD COLUMN IF NOT EXISTS "invoice_fingerprint" varchar(64),
ADD COLUMN IF NOT EXISTS "duplicate_confidence" numeric(5, 2),
ADD COLUMN IF NOT EXISTS "duplicate_candidate_id" uuid REFERENCES "document_extractions"("id"),
ADD COLUMN IF NOT EXISTS "duplicate_status" text CHECK ("duplicate_status" IN ('unique', 'duplicate', 'possible_duplicate', 'reviewing'));

-- Create indexes for efficient duplicate detection
CREATE INDEX IF NOT EXISTS "doc_extract_fingerprint_idx" ON "document_extractions" USING btree ("invoice_fingerprint");
CREATE INDEX IF NOT EXISTS "doc_extract_duplicate_status_idx" ON "document_extractions" USING btree ("duplicate_status");

-- Create composite index for tenant-scoped duplicate searches
CREATE INDEX IF NOT EXISTS "doc_extract_tenant_fingerprint_idx" ON "document_extractions" USING btree (
    (SELECT "tenant_id" FROM "files" WHERE "files"."id" = "document_extractions"."file_id"),
    "invoice_fingerprint"
);