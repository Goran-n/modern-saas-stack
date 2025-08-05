# Integration Testing Strategy for File Manager

## Current Situation

We have 23/23 passing validation tests but need proper integration testing for:
- Database operations (Neon DB)
- Storage operations (Supabase)
- End-to-end file processing
- LLM extraction accuracy
- Supplier matching logic

## Testing Approach Comparison

### Option 1: PGlite (In-Memory PostgreSQL) ⭐ RECOMMENDED
**Pros:**
- Runs full PostgreSQL in-memory (< 3MB)
- Fast test execution (no network latency)
- Isolated test environments
- Supports extensions (pgvector for embeddings)
- No external dependencies

**Cons:**
- Potential compatibility issues with Drizzle ORM (Zod validation errors reported)
- May not catch Neon-specific edge cases
- WASM overhead in Node.js

**Best for:** Unit tests, fast feedback loops, CI/CD pipelines

### Option 2: Neon Test Database
**Pros:**
- Exact production parity
- Supports database branching for isolated tests
- Native Drizzle ORM compatibility
- Can test Neon-specific features

**Cons:**
- Requires network connection
- Slower test execution
- Costs for test database usage
- Requires API key management

**Best for:** Critical integration tests, pre-deployment validation

### Option 3: Docker PostgreSQL
**Pros:**
- Full PostgreSQL compatibility
- Isolated test environments
- No external dependencies after setup
- Works with all ORMs

**Cons:**
- Requires Docker installation
- Slower startup time
- More complex CI/CD setup
- Resource intensive

**Best for:** Local development, comprehensive integration tests

### Option 4: Supabase Test Project
**Pros:**
- Tests both database AND storage
- Built-in RLS testing
- Exact production environment
- Real file upload testing

**Cons:**
- Requires internet connection
- Slower test execution
- Requires separate test project
- Cost considerations

**Best for:** End-to-end tests, storage integration

## Recommended Implementation Plan

### 1. Three-Tier Testing Strategy

```
┌─────────────────────────────────────────────────┐
│                 PRODUCTION                       │
│         Full E2E Tests (Monthly/Release)         │
│         Supabase Test Project + Neon DB          │
└─────────────────────────────────────────────────┘
                        ▲
┌─────────────────────────────────────────────────┐
│              INTEGRATION TESTS                   │
│          Docker PostgreSQL (Daily/PR)            │
│      Real DB operations, no external deps        │
└─────────────────────────────────────────────────┘
                        ▲
┌─────────────────────────────────────────────────┐
│                UNIT TESTS                        │
│        Mocked Operations (Every commit)          │
│     Fast validation, business logic tests        │
└─────────────────────────────────────────────────┘
```

### 2. Immediate Actions

1. **Fix Current Test Issues** (Priority: HIGH)
   - Replace File API with Buffer operations for Node.js compatibility
   - Use proper test database setup instead of mocking
   - Fix timezone issues with explicit UTC handling

2. **Set Up Docker PostgreSQL for Integration Tests**
   ```bash
   # docker-compose.test.yml
   services:
     postgres:
       image: postgres:16
       environment:
         POSTGRES_DB: figgy_test
         POSTGRES_USER: test
         POSTGRES_PASSWORD: test
       ports:
         - "5433:5432"
   ```

3. **Create Test Helpers**
   ```typescript
   // test/helpers/database.ts
   export async function setupTestDatabase() {
     const db = getDatabaseConnection({
       DATABASE_URL: 'postgresql://test:test@localhost:5433/figgy_test'
     });
     
     // Run migrations
     await migrate(db, { migrationsFolder: './drizzle' });
     
     // Clear data
     await db.delete(files);
     
     return db;
   }
   ```

### 3. Integration Test Structure

```typescript
// test/integration/file-upload.test.ts
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { setupTestStorage } from '../helpers/storage';

describe('File Upload Integration', () => {
  let db: Database;
  let storage: StorageClient;
  
  beforeAll(async () => {
    db = await setupTestDatabase();
    storage = await setupTestStorage();
  });
  
  afterAll(async () => {
    await cleanupTestDatabase(db);
  });
  
  it('should upload invoice atomically', async () => {
    // Real database operations
    const result = await uploadFile({
      file: testInvoiceBuffer,
      tenantId: 'test-tenant',
      // ...
    });
    
    // Verify in database
    const dbRecord = await db.select()
      .from(files)
      .where(eq(files.id, result.id));
      
    expect(dbRecord[0].processingStatus).toBe('pending');
  });
});
```

### 4. Storage Testing Strategy

For Supabase storage testing:

```typescript
// test/helpers/storage.ts
export async function setupTestStorage() {
  if (process.env.TEST_SUPABASE_URL) {
    // Use real test bucket
    return new SupabaseStorageClient({
      url: process.env.TEST_SUPABASE_URL,
      key: process.env.TEST_SUPABASE_KEY,
      bucket: 'test-invoices'
    });
  } else {
    // Use local mock
    return new MockStorageClient();
  }
}
```

### 5. Environment Configuration

```bash
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5433/figgy_test
SUPABASE_URL=https://test.supabase.co
SUPABASE_SERVICE_KEY=test-key
PORT=3001
BASE_URL=http://localhost:3001
```

### 6. CI/CD Pipeline

```yaml
# .github/workflows/test.yml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: figgy_test
      POSTGRES_PASSWORD: test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s

steps:
  - name: Run Integration Tests
    env:
      DATABASE_URL: postgresql://postgres:test@postgres:5432/figgy_test
    run: |
      bun run test:integration
```

## Addressing Current Test Failures

### 1. Zod/File API Issue
Replace File object usage with Buffer operations:

```typescript
// Instead of
const file = new File([buffer], 'test.pdf');

// Use
const fileData = {
  buffer: buffer,
  name: 'test.pdf',
  type: 'application/pdf',
  size: buffer.length
};
```

### 2. Mock Dependencies Properly
Create a test configuration module:

```typescript
// test/helpers/test-config.ts
export const testConfig = {
  db: null as Database | null,
  storage: null as StorageClient | null,
  
  async setup() {
    this.db = await setupTestDatabase();
    this.storage = await setupTestStorage();
  },
  
  async teardown() {
    await this.db?.close();
  }
};
```

### 3. Fix Timezone Issues
Use explicit UTC dates:

```typescript
// test/helpers/date-utils.ts
export function parseInvoiceDate(dateStr: string): Date {
  // Always parse as UTC
  return new Date(dateStr + 'T00:00:00Z');
}
```

## Zero-Error Requirements

Since this is accounting software, we need:

1. **Transaction Testing**: Every operation must be atomic
2. **Idempotency Testing**: Re-running operations should be safe
3. **Concurrency Testing**: Multiple uploads shouldn't corrupt data
4. **Recovery Testing**: Failed operations must be recoverable
5. **Audit Trail Testing**: Every action must be logged

## Next Steps

1. Set up Docker PostgreSQL locally
2. Fix the failing tests using the approaches above
3. Create integration test suite with real DB operations
4. Add concurrency and recovery tests
5. Set up monthly E2E tests with production-like environment