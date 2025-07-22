# Slack File Upload Duplicate Prevention

## Problem

When users upload files to Slack, the platform sends multiple webhook events for the same action:
1. A `message` event containing the file information
2. One or more `file_shared` events for each file

This resulted in:
- Multiple file records being created for each uploaded file
- Multiple confirmation messages being sent to users
- Unnecessary storage and processing overhead

## Solution

### 1. Event Type Filtering

The primary solution is to filter out `file_shared` events entirely since `message` events already contain all necessary file information.

**Implementation**: Modified `/packages/communication/src/parsers/slack.ts` to skip `file_shared` events:

```typescript
} else if (event.type === "file_shared") {
  // Skip file_shared events to prevent duplicate processing
  // Files are already processed in message events
  logger.debug("Skipping file_shared event to prevent duplicates", {
    eventId: validated.event_id,
    eventType: event.type,
  });
  return { type: 'skipped', reason: 'file_shared_duplicate_prevention' };
}
```

### 2. Message-Level Deduplication

As a secondary safeguard, the system implements message-level deduplication:

**Location**: `/packages/communication/src/operations/query.ts` in the `storeMessage` function

**Features**:
- Checks for existing messages by `messageId` before inserting
- Uses PostgreSQL's `ON CONFLICT DO UPDATE` for atomic operations
- Prevents race conditions in high-concurrency scenarios

### 3. Content-Based File Deduplication

The system maintains SHA-256 content hashes for all uploaded files:
- Detects duplicate files even if uploaded multiple times
- Prevents redundant storage usage
- Links to existing file records when duplicates are detected

## Best Practices

### 1. Webhook Event Handling

- **Log all incoming events** with event type and ID for debugging
- **Filter events early** in the processing pipeline
- **Use event IDs** for deduplication, but be aware that different event types have different IDs

### 2. Deduplication Strategy

- **Primary**: Filter unwanted event types (e.g., `file_shared`)
- **Secondary**: Message-level deduplication using unique identifiers
- **Tertiary**: Content-based deduplication for files

### 3. Error Handling

- Return success responses for skipped events to prevent Slack retries
- Log skip reasons for monitoring and debugging
- Handle race conditions gracefully with database constraints

### 4. Monitoring

Track these metrics:
- Number of events by type
- Skip rates and reasons
- Duplicate detection rates
- Processing times per event type

## Testing

To verify the fix:
1. Upload multiple files to Slack
2. Check logs for skipped `file_shared` events
3. Verify only one database record per file
4. Confirm only one confirmation message is sent

## Race Condition Prevention for Invoice Processing

### Problem
When multiple files are uploaded simultaneously (e.g., via Slack), race conditions can occur:
1. Multiple webhook events trigger multiple `categorize-file` jobs
2. Jobs run concurrently and extract the same invoice data
3. Both jobs create duplicate invoice records before deduplication checks

### Solution: Multi-Layer Protection

#### 1. **Job-Level Concurrency Control**
Trigger.dev queue concurrency keys ensure only one job runs per tenant at a time:

```typescript
// File upload triggers categorization with concurrency control
await tasks.trigger("categorize-file", payload, {
  queue: {
    concurrencyKey: `tenant-${tenantId}`,
  },
});

// Invoice processing also uses tenant-based concurrency
await tasks.trigger("process-invoice-supplier", payload, {
  queue: {
    concurrencyKey: `tenant-${tenantId}`,
  },
});
```

#### 2. **Database-Level Constraints**
Unique constraint on invoice fingerprints per tenant prevents duplicate records:

```sql
CREATE UNIQUE INDEX "unique_invoice_fingerprint_per_tenant" 
ON "document_extractions" ("computed_tenant_id", "invoice_fingerprint") 
WHERE "invoice_fingerprint" IS NOT NULL;
```

#### 3. **Application-Level Checks**
The categorize-file job includes race condition detection:
- Checks for existing extractions before processing
- Uses database transactions for atomic operations
- Handles concurrent processing gracefully

### Benefits
- **Prevents duplicate invoices** even under high concurrency
- **Reduces AI processing costs** by avoiding redundant extractions
- **Ensures data consistency** across the system
- **Scales safely** with multiple concurrent users

## Future Improvements

1. **Event Signature Tracking**: Store a hash of critical event properties to detect truly duplicate events across all types
2. **Configurable Event Filtering**: Allow configuration of which event types to process
3. **Rate Limiting**: Implement rate limiting per user/workspace to prevent abuse
4. **Webhook Verification**: Add Slack signature verification for security
5. **Distributed Locking**: Implement Redis-based locking for cross-region deployments