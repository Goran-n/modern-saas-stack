# Anti-Duplication System

A comprehensive two-stage deduplication system for files and documents, designed to prevent duplicate processing and save LLM tokens.

## Overview

The system implements two stages of duplicate detection:

1. **Stage 1: File-Level Deduplication** - Detects exact file duplicates using SHA256 content hashing
2. **Stage 2: Invoice-Level Deduplication** - Detects semantic duplicates using fuzzy matching and scoring

## Features

### File-Level Deduplication
- SHA256 content hashing for exact duplicate detection
- Tenant-isolated duplicate checking
- Zero false positives for identical files
- Prevents processing of already-uploaded files

### Invoice-Level Deduplication
- Composite fingerprinting of key invoice fields
- Fuzzy matching for vendor names
- Date proximity detection (±1 day tolerance)
- Amount matching with rounding tolerance (±0.01)
- Configurable confidence thresholds

## Architecture

```
packages/deduplication/
├── src/
│   ├── services/
│   │   ├── deduplication.service.ts      # Main service orchestrator
│   │   ├── file-deduplication.service.ts # File-level duplicate detection
│   │   └── invoice-deduplication.service.ts # Invoice-level detection
│   ├── utils/
│   │   ├── hash.ts        # SHA256 hashing utilities
│   │   └── scoring.ts     # Similarity scoring algorithms
│   └── types/
│       └── index.ts       # Type definitions
```

## Usage

### Basic Usage

```typescript
import { DeduplicationService } from '@figgy/deduplication';

const service = new DeduplicationService();

// Check file duplicate
const fileResult = await service.checkFileDuplicate(
  contentHash,
  fileSize,
  tenantId
);

// Check invoice duplicate
const invoiceResult = await service.checkInvoiceDuplicate(
  extractionId,
  extractedFields,
  tenantId
);
```

### Integration Points

1. **File Upload** - Calculate hash before storage
2. **File Processing** - Check duplicates before LLM processing
3. **Document Extraction** - Check invoice duplicates after extraction

## Duplicate Types

- **exact** (≥95% confidence) - Certain duplicate
- **likely** (≥85% confidence) - High probability duplicate
- **possible** (≥70% confidence) - Potential duplicate
- **unique** (<70% confidence) - Not a duplicate

## Database Schema

### Files Table Additions
- `content_hash` (varchar 64) - SHA256 hash of file content
- `file_size` (bigint) - File size for validation

### Document Extractions Additions
- `invoice_fingerprint` (varchar 64) - Composite hash of key fields
- `duplicate_confidence` (numeric 5,2) - Confidence score (0-1)
- `duplicate_candidate_id` (uuid) - Reference to potential duplicate
- `duplicate_status` (enum) - Status: unique/duplicate/possible_duplicate/reviewing

## API Endpoints

- `POST /api/trpc/duplicates.checkFileHash` - Pre-upload duplicate check
- `GET /api/trpc/duplicates.getExtractionDuplicates` - Get duplicate info
- `GET /api/trpc/duplicates.listDuplicates` - List all duplicates
- `GET /api/trpc/duplicates.getDuplicateStats` - System-wide statistics
- `PUT /api/trpc/duplicates.updateDuplicateStatus` - Manual status update

## Configuration

### Thresholds
```typescript
const thresholds = {
  CERTAIN: 0.95,   // Auto-reject duplicates
  LIKELY: 0.85,    // Flag for review
  POSSIBLE: 0.70,  // Note but process
  UNLIKELY: 0.50   // Ignore
};
```

### Field Weights
```typescript
const weights = {
  vendorName: 0.3,
  invoiceNumber: 0.3,
  invoiceDate: 0.2,
  totalAmount: 0.2
};
```

## Security

- All operations are tenant-isolated
- File content never leaves the server
- Hashes are one-way and cannot be reversed
- API endpoints require authentication

## Performance

- File hashing: O(n) where n = file size
- Duplicate lookup: O(1) with indexed hashes
- Invoice matching: O(m) where m = potential matches
- Minimal overhead on file processing

## Future Enhancements

- [ ] Image perceptual hashing for scanned documents
- [ ] ML-based duplicate detection
- [ ] Bulk duplicate resolution tools
- [ ] Configurable auto-rejection policies
- [ ] Duplicate metrics dashboard