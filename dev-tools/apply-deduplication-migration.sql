-- Add deduplication columns to existing tables
-- This script only adds the new columns, skipping type creation

-- Stage 1: File-level deduplication
ALTER TABLE "files" 
ADD COLUMN IF NOT EXISTS "content_hash" varchar(64),
ADD COLUMN IF NOT EXISTS "file_size" bigint;

-- Create index for efficient duplicate lookups within tenant
CREATE INDEX IF NOT EXISTS "files_tenant_hash_idx" ON "files" USING btree ("tenant_id", "content_hash");

-- Add index for content hash lookups
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

-- Note: Skipping the composite index that references tenant_id from files table as it's complex
-- and might need a different approach