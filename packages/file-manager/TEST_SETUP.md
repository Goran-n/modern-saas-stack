# File Manager Testing Setup

## Quick Start

```bash
# Run all passing validation tests (no DB required)
bun run test:validate

# Start test database
bun run test:db:start

# Run integration tests
bun run test:integration

# Run all tests
bun run test:all

# Stop test database
bun run test:db:stop
```

## Test Structure

```
test/
├── unit/                    # Fast unit tests (mocked dependencies)
│   ├── simple-format.test.ts     ✅ 12/12 passing
│   └── invoice-validation.test.ts ✅ 23/23 passing
├── integration/             # Real DB/storage tests
│   └── invoice-upload.test.ts    🆕 Atomic upload tests
├── fixtures/               # Test data
│   ├── invoices/          # Real PDF invoices
│   └── expected-results/  # Expected extraction data
└── helpers/               # Test utilities
    ├── test-database.ts   # DB setup/teardown
    ├── test-storage.ts    # Storage mocking
    └── test-operations.ts # Test-friendly operations
```

## Testing Strategy

### 1. Unit Tests (Fast, Mocked)
- Run without database
- Use mock storage
- Focus on business logic
- Run on every commit

### 2. Integration Tests (Real DB)
- Use Docker PostgreSQL
- Test atomic operations
- Verify error handling
- Run on PRs

### 3. E2E Tests (Production-like)
- Use Neon test database
- Real Supabase storage
- Full processing pipeline
- Run before releases

## Key Testing Principles

### Zero-Error Accounting
- Every operation must be atomic
- All failures must be recoverable
- Dead letter queue for permanent failures
- Full audit trail of all operations

### Test Data
Using real invoices from your accounting folder:
- Adobe (€24.59)
- Microsoft (€43.17)
- ChatGPT ($90.00)
- Xero ($117.80)
- Notion ($60.00)
- Figma ($92.25)

### Current Status
✅ **Working Tests**: 35/35 unit tests passing
🚧 **In Progress**: Integration tests with real database
❌ **Known Issues**: 
- Zod/File API incompatibility in Node.js
- Mocking complexity for full pipeline tests

## Common Commands

```bash
# Start fresh test database
bun run test:db:reset

# Run specific test file
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/figgy_test vitest run test/integration/invoice-upload.test.ts

# Debug failing tests
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/figgy_test vitest run --reporter=verbose

# Check test coverage
bun run test:coverage
```

## Troubleshooting

### Database Connection Failed
```bash
# Check if Docker is running
docker ps

# Check database logs
docker logs figgy-test-db

# Restart database
bun run test:db:reset
```

### Test Timeout
Increase timeout in test file:
```typescript
describe('Slow tests', { timeout: 10000 }, () => {
  // tests
});
```

### File API Issues
Use `createTestFile` helper instead of native File API:
```typescript
import { createTestFile } from '../helpers/test-storage';

const file = createTestFile(buffer, 'invoice.pdf');
```