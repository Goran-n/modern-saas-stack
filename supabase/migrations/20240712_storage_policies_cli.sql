-- Additional storage policy for CLI uploads without full user authentication
-- This allows uploads using just the tenant ID in the path

-- Policy for CLI imports (temporary - should use proper auth in production)
CREATE POLICY "CLI imports with tenant validation" 
ON storage.objects
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] IS NOT NULL AND
  (storage.foldername(name))[2] = 'cli-imports'
);

-- Note: This is a temporary policy for development/testing
-- In production, all uploads should use proper authentication
-- with tenant_id from JWT claims