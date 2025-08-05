-- Add new file processing statuses for atomic uploads and dead letter queue
-- This migration adds 'pending_upload' and 'dead_letter' to the existing enum

-- First, we need to add the new values to the enum
ALTER TYPE file_processing_status ADD VALUE 'pending_upload' AFTER 'pending';
ALTER TYPE file_processing_status ADD VALUE 'dead_letter' AFTER 'failed';

-- Add index for dead letter files to make queries efficient
CREATE INDEX files_dead_letter_idx ON files(tenant_id, processing_status) 
WHERE processing_status = 'dead_letter';

-- Add index for pending upload files for cleanup job
CREATE INDEX files_pending_upload_idx ON files(tenant_id, processing_status, created_at) 
WHERE processing_status = 'pending_upload';

-- Add index for stuck processing files
CREATE INDEX files_processing_stuck_idx ON files(tenant_id, processing_status, updated_at) 
WHERE processing_status = 'processing';