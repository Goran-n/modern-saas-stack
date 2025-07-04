# File Domain Purpose

## Overview
The File domain provides the core business logic for managing files within the Kibly system. It serves as a centralized registry for all files that enter the system, tracking their lifecycle, storage, and relationships.

## What This Domain Does

### Core Responsibilities
1. **File Registration**: Creates and maintains records for all files entering the system
2. **Duplicate Detection**: Identifies files with identical content using SHA-256 hashing
3. **Status Management**: Tracks file processing states (uploaded, processing, ready, failed)
4. **Review Tracking**: Manages whether files have been reviewed and their disposition
5. **Version Control**: Supports file versioning when source files change
6. **Metadata Management**: Stores and manages file metadata including source information

## Domain Structure

### Entity: FileEntity
The core aggregate root that encapsulates all file-related business logic.

**Key Properties:**
- `id`: Unique identifier
- `tenantId`: Multi-tenant isolation
- `filename` / `originalFilename`: Sanitized and original names
- `sha256Hash`: Content hash for deduplication
- `storageKey` / `storageBucket`: S3 storage location
- `source`: Origin (dropbox, google_drive, onedrive, etc.)
- `status`: Processing state
- `reviewStatus`: Review state
- `isDuplicate` / `duplicateOf`: Duplicate tracking

**Business Methods:**
- `markAsProcessing()`: Transitions to processing state
- `markAsReady()`: Marks file as successfully processed
- `markAsFailed()`: Records processing failure
- `markAsDuplicate()`: Flags as duplicate while preserving record
- `updateReviewStatus()`: Updates review disposition
- `updateExtractedText()`: Stores extracted text for search

### Value Objects

#### FileSource (Enum)
- `dropbox`
- `google_drive` 
- `onedrive`
- `office365`
- `whatsapp`
- `manual`

#### FileStatus (Enum)
- `uploaded`: Initial state
- `processing`: Being processed
- `ready`: Successfully processed
- `failed`: Processing failed
- `deleted`: Soft deleted

#### ReviewStatus (Enum)
- `not_reviewed`: Awaiting review
- `ignored`: Reviewed but not relevant
- `reviewed`: Reviewed and processed
- `duplicate`: Identified as duplicate
- `processing`: Under review

## Business Rules

1. **All files are preserved**: Even duplicates are kept with appropriate flags
2. **Immutable hashes**: SHA-256 hash is calculated once and never changed
3. **Version incrementing**: Every update increments the version number
4. **Tenant isolation**: All operations are scoped to tenant
5. **Audit trail**: Created/updated timestamps and user tracking

## Integration Points

This domain integrates with:
- **Storage (S3)**: For physical file storage
- **Repository**: For persistence
- **File Service**: For orchestration
- **Integration Domain**: Links to external sources

## Current Capabilities

The domain currently supports:
- Creating file records with full metadata
- Detecting and flagging duplicates
- Managing file lifecycle states
- Tracking review decisions
- Storing extracted text for future search
- Maintaining audit information

## Data Flow

1. File enters system → FileEntity created with metadata
2. Hash calculated → Checked against existing files
3. If duplicate found → Marked but preserved
4. Storage location recorded → Status updated
5. Review/processing occurs → Status transitions tracked
6. All changes → Version incremented, audit updated