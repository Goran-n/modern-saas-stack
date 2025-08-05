-- Fix file_processing_status enum by adding missing values
-- The 0008 migration recreated the enum but missed 'pending_upload' and 'dead_letter'

-- Add 'pending_upload' value after 'pending'
ALTER TYPE file_processing_status ADD VALUE IF NOT EXISTS 'pending_upload' AFTER 'pending';

-- Add 'dead_letter' value after 'failed'  
ALTER TYPE file_processing_status ADD VALUE IF NOT EXISTS 'dead_letter' AFTER 'failed';

-- Create indices for the new enum values (if they don't exist)
CREATE INDEX IF NOT EXISTS files_pending_upload_idx ON files(tenant_id, processing_status, created_at) 
WHERE processing_status = 'pending_upload';

CREATE INDEX IF NOT EXISTS files_dead_letter_idx ON files(tenant_id, processing_status) 
WHERE processing_status = 'dead_letter';