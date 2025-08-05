# File Manager Test Suite

This comprehensive test suite ensures the file upload and invoice processing system operates flawlessly with zero errors.

## Test Structure

```
test/
├── fixtures/
│   ├── invoices/          # Real invoice PDFs from production
│   └── expected-results/  # Expected extraction results
├── unit/
│   ├── invoice-format.test.ts    # PDF validation & format tests
│   └── vendor-matching.test.ts   # Supplier matching logic
├── integration/
│   ├── extraction-accuracy.test.ts # LLM extraction accuracy
│   └── edge-cases.test.ts         # Error handling & recovery
├── helpers/
│   └── test-utils.ts      # Shared test utilities
└── run-all-tests.ts       # Comprehensive test runner
```

## Running Tests

### Run all tests with comprehensive reporting:
```bash
bun run test:all
```

### Run specific test categories:
```bash
bun run test:format      # Invoice format validation
bun run test:vendor      # Vendor matching tests
bun run test:extraction  # Extraction accuracy tests
bun run test:edge        # Edge case handling
```

### Watch mode for development:
```bash
bun run test:watch
```

### Generate coverage report:
```bash
bun run test:coverage
```

## Test Categories

### 1. Invoice Format Tests ✅
- PDF header validation
- File size limits (10KB - 1MB)
- Multi-page invoice support
- MIME type validation
- Corrupted file detection

### 2. Vendor Matching Tests ✅
- Exact name matching
- Domain-based matching
- VAT number validation
- Fuzzy matching for typos
- Company suffix normalization
- New vendor creation

### 3. Extraction Accuracy Tests ✅
- Invoice number extraction
- Amount parsing (total, tax, net)
- Date format parsing (multiple formats)
- Line item extraction
- Billing period detection
- Customer information extraction
- Confidence scoring

### 4. Edge Case Tests ✅
- Zero-byte file handling
- Corrupted PDF recovery
- Concurrent upload handling
- Dead letter queue management
- Orphaned file cleanup
- Auto-recovery for stuck files
- Special character handling
- Network failure resilience

## Test Data

The test suite uses real invoices from:
- Adobe (EUR, Irish VAT)
- Microsoft (EUR, Multi-page)
- OpenAI/ChatGPT (USD, Reverse charge)
- Xero (USD, Discounts)
- Notion (USD, Recurring charges)
- Figma (USD, Multiple line items)

## Key Features Tested

### Atomic Upload Pattern
1. Create DB record with `pending_upload` status
2. Upload to storage
3. Update to `pending` on success or `failed` on error

### Dead Letter Queue
- Files failing 3 times → `dead_letter` status
- Manual reprocessing available
- Error metadata preserved

### Auto-Recovery
- Files stuck in `processing` > 5 minutes
- Automatic reset to `pending`
- Max 3 recovery attempts

### Orphaned File Cleanup
- Files in `pending_upload` > 30 minutes
- Check storage existence
- Delete orphaned records

## Success Criteria

✅ **ZERO TOLERANCE** for invoice processing errors
✅ All amounts extracted with 100% accuracy
✅ All vendors matched correctly
✅ All edge cases handled gracefully
✅ No data loss under any circumstance

## Environment Variables

```bash
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/figgy_test
```

## Continuous Improvement

After each production issue:
1. Add failing test case
2. Fix the issue
3. Verify test passes
4. Add to regression suite