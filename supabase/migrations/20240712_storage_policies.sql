-- Storage bucket and RLS policies for Kibly
-- This migration sets up the storage policies for the vault bucket

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can upload files to their tenant directory
CREATE POLICY "Users can upload files to their tenant directory" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.jwt()->>'tenant_id'
);

-- Policy 2: Users can view files in their tenant directory
CREATE POLICY "Users can view their tenant files" 
ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.jwt()->>'tenant_id'
);

-- Policy 3: Users can update files in their tenant directory
CREATE POLICY "Users can update their tenant files" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.jwt()->>'tenant_id'
)
WITH CHECK (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.jwt()->>'tenant_id'
);

-- Policy 4: Users can delete files in their tenant directory
CREATE POLICY "Users can delete their tenant files" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.jwt()->>'tenant_id'
);

-- Policy 5: Service role has full access to all files
CREATE POLICY "Service role has full access" 
ON storage.objects
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Note: The anon role should not have any access to the vault bucket
-- This is enforced by not creating any policies for the anon role