-- Add unique constraint for invoice fingerprints per tenant
-- This prevents duplicate invoices from being created at the database level

-- First, let's create a function to get tenant_id from file_id
CREATE OR REPLACE FUNCTION get_tenant_id_from_file_id(file_uuid UUID)
RETURNS UUID AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    SELECT tenant_id INTO tenant_uuid
    FROM files
    WHERE id = file_uuid;
    
    RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a computed column for tenant_id in document_extractions
-- This allows us to create a unique constraint on (tenant_id, invoice_fingerprint)
ALTER TABLE "document_extractions"
ADD COLUMN IF NOT EXISTS "computed_tenant_id" UUID 
GENERATED ALWAYS AS (get_tenant_id_from_file_id(file_id)) STORED;

-- Create index on computed_tenant_id for performance
CREATE INDEX IF NOT EXISTS "doc_extract_computed_tenant_idx" 
ON "document_extractions" USING btree ("computed_tenant_id");

-- Add unique constraint to prevent duplicate invoices per tenant
-- Only apply to non-null fingerprints (not all documents have fingerprints)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_invoice_fingerprint_per_tenant" 
ON "document_extractions" USING btree ("computed_tenant_id", "invoice_fingerprint") 
WHERE "invoice_fingerprint" IS NOT NULL;

-- Add index to improve duplicate detection performance
CREATE INDEX IF NOT EXISTS "doc_extract_fingerprint_tenant_idx" 
ON "document_extractions" USING btree ("invoice_fingerprint", "computed_tenant_id") 
WHERE "invoice_fingerprint" IS NOT NULL;

-- Update existing duplicate detection index to include tenant
DROP INDEX IF EXISTS "doc_extract_fingerprint_idx";
CREATE INDEX IF NOT EXISTS "doc_extract_fingerprint_status_idx" 
ON "document_extractions" USING btree ("invoice_fingerprint", "duplicate_status") 
WHERE "invoice_fingerprint" IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX "unique_invoice_fingerprint_per_tenant" IS 
'Ensures that each invoice fingerprint is unique within a tenant, preventing duplicate invoice extractions';