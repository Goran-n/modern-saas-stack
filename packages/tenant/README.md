# Tenant Package Testing Guide

## Overview

This package uses a hybrid testing approach:
- **Local Development**: Docker PostgreSQL for fast iteration
- **CI/CD**: Neon database branches for production-like testing

## Local Testing Setup

### Prerequisites
- Docker and Docker Compose installed
- Bun runtime

### Running Tests Locally

1. **Start the test database**:
   ```bash
   npm run test:local
   ```
   This will:
   - Start a PostgreSQL container optimized for testing
   - Run tests with the test database
   - Use in-memory storage (tmpfs) for speed

2. **Run tests without Docker setup**:
   ```bash
   npm test
   ```
   (Requires TEST_DATABASE_URL to be set)

3. **Watch mode**:
   ```bash
   npm run test:watch
   ```

4. **Stop test database**:
   ```bash
   npm run test:local:down
   ```

## CI/CD Testing with Neon

In CI/CD environments, tests can use Neon database branches:

1. Set environment variables:
   ```bash
   export NEON_DATABASE_URL="postgresql://..."
   export NEON_BRANCH_NAME="test-branch-name"
   ```

2. Tests will automatically detect and use the Neon branch

## Test Database Configuration

The test PostgreSQL is optimized for speed:
- `fsync=off` - Skips disk sync for writes
- `full_page_writes=off` - Reduces WAL size
- `synchronous_commit=off` - Async commits
- Uses tmpfs (RAM) for storage

⚠️ **Warning**: These settings are for testing only. Never use in production!

## Writing Tests

Tests should:
1. Use `createTestTenant()` to create isolated test data
2. Call `cleanupTestData()` in `afterEach` hooks
3. Import services from their respective packages (`@kibly/supplier`, etc.)

Example:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../db';
import { SupplierIngestionService } from '@kibly/supplier';
import { createTestTenant, cleanupTestData } from '../test-utils';

describe('My Test', () => {
  let tenantId: string;

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should work', async () => {
    // Your test here
  });
});
```

## Troubleshooting

### "Configuration not validated" error
Make sure either:
- Docker test database is running (`npm run test:local`)
- `TEST_DATABASE_URL` environment variable is set
- For CI/CD: `NEON_DATABASE_URL` is set

### Cannot connect to database
Check that:
- Docker is running
- Port 5433 is not in use
- PostgreSQL container is healthy: `docker ps`

### Tests are slow
- Ensure Docker is using enough resources
- Check that tmpfs mount is working
- Consider running fewer tests in parallel