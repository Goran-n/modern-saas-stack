-- Add ownership validation columns to document_extractions table
ALTER TABLE document_extractions 
ADD COLUMN ownership_validation JSONB,
ADD COLUMN requires_review BOOLEAN DEFAULT false,
ADD COLUMN review_reason TEXT,
ADD COLUMN review_status TEXT DEFAULT 'pending';

-- Create index for review queue
CREATE INDEX idx_document_extractions_review_queue 
ON document_extractions(requires_review, review_status)
WHERE requires_review = true;

-- Create index for tenant-specific review queue
CREATE INDEX idx_document_extractions_tenant_review 
ON document_extractions(tenant_id, requires_review, review_status)
WHERE requires_review = true;