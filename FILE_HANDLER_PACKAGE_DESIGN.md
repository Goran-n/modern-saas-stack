# File Manager Package Design Ticket

## Overview
Implement a Turborepo package for internal file management that will manage files from various sources including direct integrations (e.g., Xero) and WhatsApp uploads stored in Supabase Storage.

## Requirements
- Store files in Supabase Storage
- Track file source (integration, user upload, WhatsApp)
- Support multi-tenancy
- Follow Figgy style guide
- Document processing pipeline

## Design

### 1. Database Schema

```typescript
// packages/file-manager/src/schema.ts

export const fileProcessingStatusEnum = pgEnum('file_processing_status', [
  'pending',
  'processing',
  'completed',
  'failed'
]);

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: text('file_name').notNull(),
  pathTokens: text('path_tokens').array().notNull(), // Hierarchical path storage
  mimeType: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  metadata: jsonb('metadata'), // Flexible metadata storage
  source: text('source', {
    enum: ['integration', 'user_upload', 'whatsapp']
  }).notNull(),
  sourceId: text('source_id'), // Reference to source entity
  tenantId: uuid('tenant_id').notNull(),
  uploadedBy: uuid('uploaded_by').notNull(),
  processingStatus: fileProcessingStatusEnum('processing_status').default('pending'),
  bucket: text('bucket').notNull().default('files'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### 2. Package Structure

```
packages/file-manager/
├── src/
│   ├── schema.ts        # Drizzle schema definition
│   ├── types.ts         # TypeScript types and Zod schemas
│   ├── operations.ts    # File operations (upload, download, delete)
│   └── index.ts         # Public exports
├── package.json
└── tsconfig.json
```

### 3. Core Types

```typescript
// packages/file-manager/src/types.ts

import { z } from 'zod';

export const fileSourceSchema = z.enum(['integration', 'user_upload', 'whatsapp']);

export const processingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const createFileSchema = z.object({
  fileName: z.string(),
  pathTokens: z.array(z.string()),
  mimeType: z.string(),
  size: z.number(),
  source: fileSourceSchema,
  sourceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tenantId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  bucket: z.string().default('files'),
});

export type FileSource = z.infer<typeof fileSourceSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;
```

### 4. File Operations

```typescript
// packages/file-manager/src/operations.ts

import { upload, download, remove, signedUrl } from '@figgy/supabase/storage';

import { stripSpecialCharacters } from '@figgy/utils';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@figgy/supabase/types';

export async function uploadFile(
  client: SupabaseClient,
  file: File,
  input: CreateFileInput,
  db: Database
): Promise<string> {
  const sanitizedFileName = stripSpecialCharacters(file.name);
  const fullPath = [...input.pathTokens, sanitizedFileName];

  // Upload to Supabase Storage
  const publicUrl = await upload(client, {
    file,
    path: fullPath,
    bucket: input.bucket,
  });

  // Save to database
  const [record] = await db.insert(files).values({
    ...input,
    fileName: sanitizedFileName,
    pathTokens: fullPath,
  }).returning();

  return record.id;
}

export async function downloadFile(
  client: SupabaseClient,
  fileId: string,
  tenantId: string,
  db: Database
): Promise<Blob> {
  // Get file record
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) throw new Error('File not found');

  // Download from Supabase Storage
  const { data } = await download(client, {
    bucket: file.bucket,
    path: file.pathTokens.join('/'),
  });

  return data!;
}

export async function getFileUrl(
  client: SupabaseClient,
  fileId: string,
  tenantId: string,
  expiresIn: number = 3600,
  db: Database
): Promise<string> {
  // Get file record
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) throw new Error('File not found');

  // Generate signed URL
  const { data } = await signedUrl(client, {
    bucket: file.bucket,
    path: file.pathTokens.join('/'),
    expireIn: expiresIn,
  });

  return data!.signedUrl;
}

export async function deleteFile(
  client: SupabaseClient,
  fileId: string,
  tenantId: string,
  db: Database
): Promise<void> {
  // Get file record
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)));

  if (!file) throw new Error('File not found');

  // Delete from Supabase Storage
  await remove(client, {
    bucket: file.bucket,
    path: file.pathTokens,
  });

  // Delete from database
  await db.delete(files).where(eq(files.id, fileId));
}

export async function updateProcessingStatus(
  fileId: string,
  status: ProcessingStatus,
  db: Database
): Promise<void> {
  await db
    .update(files)
    .set({
      processingStatus: status,
      updatedAt: new Date()
    })
    .where(eq(files.id, fileId));
}
```

## Missing Packages (Need to Create)

The file manager package depends on three internal packages that need to be created:

### 1. `@figgy/supabase/storage`
**Purpose**: Wrapper for Supabase Storage operations with consistent error handling and logging.

**Package Structure**:
```
packages/supabase/storage/
├── src/
│   ├── operations.ts    # Storage operations
│   ├── types.ts         # TypeScript types
│   └── index.ts         # Public exports
├── package.json
└── tsconfig.json
```

**Required Functions**:
```typescript
// packages/supabase/storage/src/operations.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UploadOptions {
  file: File;
  path: string[];
  bucket: string;
}

export interface DownloadOptions {
  bucket: string;
  path: string;
}

export interface RemoveOptions {
  bucket: string;
  path: string[];
}

export interface SignedUrlOptions {
  bucket: string;
  path: string;
  expireIn: number;
}

export async function upload(client: SupabaseClient, options: UploadOptions): Promise<string>;
export async function download(client: SupabaseClient, options: DownloadOptions): Promise<{ data: Blob }>;
export async function remove(client: SupabaseClient, options: RemoveOptions): Promise<void>;
export async function signedUrl(client: SupabaseClient, options: SignedUrlOptions): Promise<{ data: { signedUrl: string } }>;
```

### 2. `@figgy/utils`
**Purpose**: Common utility functions used across the Figgy platform.

**Package Structure**:
```
packages/utils/
├── src/
│   ├── string.ts        # String utilities
│   ├── validation.ts    # Validation helpers
│   └── index.ts         # Public exports
├── package.json
└── tsconfig.json
```

**Required Functions**:
```typescript
// packages/utils/src/string.ts
export function stripSpecialCharacters(input: string): string;

// packages/utils/src/index.ts
export * from './string';
export * from './validation';
```

### 3. `@figgy/supabase/types`
**Purpose**: TypeScript types for Supabase integration, including database schema types.

**Package Structure**:
```
packages/supabase/types/
├── src/
│   ├── database.ts      # Database schema types
│   ├── storage.ts       # Storage types
│   └── index.ts         # Public exports
├── package.json
└── tsconfig.json
```

**Required Exports**:
```typescript
// packages/supabase/types/src/database.ts
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export type Database = DrizzleD1Database<any>; // Or appropriate Drizzle type

// packages/supabase/types/src/index.ts
export * from './database';
export * from './storage';
```

## Dependencies
- `drizzle-orm` - Database ORM
- `@supabase/supabase-js` - Supabase client
- `zod` - Schema validation
- `@figgy/utils` - Logging and common utilities
- `@figgy/supabase/storage` - **[NEEDS CREATION]** Supabase Storage wrapper
- `@figgy/supabase/types` - **[NEEDS CREATION]** Supabase TypeScript types
