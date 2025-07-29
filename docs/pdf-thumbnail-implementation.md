# PDF Thumbnail Implementation

## Overview
This document describes the implementation of PDF thumbnail generation for the Kibly platform.

## Implementation Summary

### 1. Database Schema
- Added `thumbnailPath` field to the `files` table
- Migration: `/supabase/migrations/20250727_231116_add_thumbnail_path.sql`

### 2. Background Job Architecture
- Created `generate-thumbnail` job in `/packages/jobs/src/tasks/files/generate-thumbnail.ts`
- Job triggered automatically on PDF upload
- Uses separate queue per tenant for concurrency control
- Falls back to placeholder thumbnail if PDF rendering fails

### 3. Thumbnail Specifications
- Format: WebP
- Dimensions: 300x424 pixels (A4 aspect ratio)
- Quality: 80%
- Storage path: `{tenantId}/thumbnails/{fileId}_thumb.webp`

### 4. Frontend Display
- Updated `FileCard.vue` component to display thumbnails
- Implements lazy loading with fallback to PDF icon
- Shows loading spinner while thumbnail loads

### 5. CLI Tools
- Generate missing thumbnails: `bun run thumbnails:generate`
- Check status: `bun run thumbnails:check`
- Supports dry-run, tenant filtering, and batch limits

## PDF.co Integration

### API Configuration
The implementation now uses PDF.co API for reliable cloud-based PDF to WebP conversion:
- Add `PDF_CO_API_KEY` to your environment variables
- Get your API key from https://pdf.co
- The API is optional - if not configured, placeholder thumbnails will be generated

### How It Works
1. Generate a signed URL for the PDF from Supabase
2. Send the URL to PDF.co's `/v1/pdf/convert/to/webp` endpoint
3. PDF.co downloads the PDF, renders the first page, and returns a WebP image URL
4. Download the WebP image and resize it to 300x424 pixels (A4 ratio)
5. Upload the thumbnail to Supabase storage

### Benefits of PDF.co
- No native dependencies or build issues
- Handles complex PDFs reliably
- Cloud-based processing (no local CPU/memory usage)
- Automatic fallback to placeholder if API fails

## Usage

### Generate Thumbnails for New Uploads
Thumbnails are automatically generated when PDFs are uploaded via:
- `uploadFile()` in `/packages/file-manager/src/operations.ts`
- `uploadFileFromBase64()` in the same file

### Generate Missing Thumbnails
```bash
# Check PDFs without thumbnails
cd packages/file-manager && bun run thumbnails:check

# Generate thumbnails (limit 10)
cd packages/file-manager && bun run thumbnails:generate --limit 10

# Generate for specific tenant
cd packages/file-manager && bun run thumbnails:generate --tenant <tenant-id>
```

### Monitor Job Execution
```bash
# Start Trigger.dev dashboard
cd packages/jobs && bun dev
```

## Future Improvements

1. **Fix Native Dependencies**: Resolve the canvas build issues for proper PDF rendering
2. **Retry Logic**: Implement retry for failed PDF renders before falling back to placeholder
3. **Multiple Page Support**: Generate thumbnails for documents with multiple important pages
4. **Performance**: Consider using a dedicated PDF rendering service for better performance
5. **Caching**: Implement CDN caching for thumbnail images

## Dependencies
- `sharp`: Image processing (resizing, format conversion)
- `@trigger.dev/sdk`: Background job processing
- PDF.co API: Cloud-based PDF to image conversion (optional)