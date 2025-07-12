# Supabase Storage Configuration

## Overview

Kibly uses Supabase Storage with Row Level Security (RLS) policies to ensure secure, tenant-isolated file storage.

## Storage Bucket

- **Bucket Name**: `vault`
- **Access**: Private (no public access)
- **RLS**: Enabled

## Storage Structure

Files are organised by tenant ID:
```
vault/
├── {tenant-id}/
│   ├── cli-imports/
│   │   └── file1.pdf
│   └── uploads/
│       └── file2.jpg
└── {another-tenant-id}/
    └── ...
```

## RLS Policies

The following policies are applied to the `storage.objects` table:

1. **Users can upload files to their tenant directory**
   - Allows authenticated users to INSERT files only in their tenant's directory
   - Path must start with the user's tenant_id from JWT claims

2. **Users can view their tenant files**
   - Allows authenticated users to SELECT files only from their tenant's directory
   
3. **Users can update their tenant files**
   - Allows authenticated users to UPDATE files only in their tenant's directory

4. **Users can delete their tenant files**
   - Allows authenticated users to DELETE files only from their tenant's directory

5. **Service role has full access**
   - Service role can perform all operations on all files
   - Used for administrative tasks and background jobs

## Authentication

- Files are accessed using authenticated Supabase clients
- The tenant ID is extracted from the user's JWT claims
- Anonymous users have no access to the vault bucket

## Usage

### Uploading Files
```typescript
const filePath = `${tenantId}/uploads/${fileName}`;
await supabase.storage
  .from('vault')
  .upload(filePath, file);
```

### Downloading Files
```typescript
const { data } = await supabase.storage
  .from('vault')
  .download(`${tenantId}/uploads/${fileName}`);
```

## Environment Variables

- `STORAGE_BUCKET`: The storage bucket name (default: 'vault')
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Public anonymous key
- `SUPABASE_SERVICE_KEY`: Service role key (for admin operations)