-- Update the files table source constraint to include 'slack'
-- This fixes the issue where Slack file uploads were failing due to constraint violation

-- Drop the existing constraint
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_source_check;

-- Add the new constraint including 'slack'
ALTER TABLE files ADD CONSTRAINT files_source_check 
  CHECK (source IN ('integration', 'user_upload', 'whatsapp', 'slack'));

-- Add a comment to document this change
COMMENT ON CONSTRAINT files_source_check ON files IS 'Validates allowed source values for file uploads, including Slack integration';