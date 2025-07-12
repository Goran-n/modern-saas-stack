-- Create file processing status enum
CREATE TYPE file_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  path_tokens TEXT[] NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  metadata JSONB,
  source TEXT NOT NULL CHECK (source IN ('integration', 'user_upload', 'whatsapp')),
  source_id TEXT,
  tenant_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  processing_status file_processing_status DEFAULT 'pending',
  bucket TEXT NOT NULL DEFAULT 'vault',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_files_tenant_id ON files(tenant_id);
CREATE INDEX idx_files_source ON files(source);
CREATE INDEX idx_files_processing_status ON files(processing_status);
CREATE INDEX idx_files_created_at ON files(created_at DESC);

-- Add RLS policies for files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Users can insert files for their tenant
CREATE POLICY "Users can insert files for their tenant"
ON files
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.jwt()->>'tenant_id');

-- Users can view files from their tenant
CREATE POLICY "Users can view files from their tenant"
ON files
FOR SELECT
TO authenticated
USING (tenant_id = auth.jwt()->>'tenant_id');

-- Users can update files from their tenant
CREATE POLICY "Users can update files from their tenant"
ON files
FOR UPDATE
TO authenticated
USING (tenant_id = auth.jwt()->>'tenant_id')
WITH CHECK (tenant_id = auth.jwt()->>'tenant_id');

-- Users can delete files from their tenant
CREATE POLICY "Users can delete files from their tenant"
ON files
FOR DELETE
TO authenticated
USING (tenant_id = auth.jwt()->>'tenant_id');

-- Service role has full access
CREATE POLICY "Service role has full access to files"
ON files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);