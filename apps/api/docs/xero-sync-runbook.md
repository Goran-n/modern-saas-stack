# Xero Sync Runbook

This document provides a comprehensive guide for running Xero synchronisation directly from the command line.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Available Sync Scripts](#available-sync-scripts)
- [Command Reference](#command-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The Kibly API provides two main scripts for syncing data from Xero:

1. **sync-direct.ts** - Syncs transactions only, runs synchronously without job queue
2. **sync-xero-all.ts** - Comprehensive sync for all entity types (accounts, contacts, invoices, etc.)

All sync operations require:
- Valid Xero integration in the database
- Active integration status
- Valid OAuth2 tokens (will auto-refresh if expired)

## Prerequisites

### Environment Setup

1. **Doppler CLI** must be installed and configured:
   ```bash
   # Install doppler (if not already installed)
   curl -Ls https://cli.doppler.com/install.sh | sh
   
   # Login to doppler
   doppler login
   
   # Setup project (run from project root)
   doppler setup
   ```

2. **Required Environment Variables** (managed by Doppler):
   - `XERO_CLIENT_ID`
   - `XERO_CLIENT_SECRET`
   - `XERO_REDIRECT_URI`
   - Database connection variables

3. **Database Requirements**:
   - Active Xero integration record
   - Valid tenant ID
   - Stored OAuth2 tokens

## Available Sync Scripts

### 1. sync-direct.ts

Synchronises transactions only. Runs immediately in the current process without using the job queue.

**Location**: `/apps/api/src/scripts/sync-direct.ts`

**Purpose**: Quick transaction sync for testing or immediate updates

### 2. sync-xero-all.ts

Comprehensive sync for all Xero entity types. Supports selective syncing and date filtering.

**Location**: `/apps/api/src/scripts/sync-xero-all.ts`

**Supported Entity Types**:
- `accounts` - Chart of Accounts
- `contacts` - Suppliers and Customers
- `invoices` - Bills and Invoices
- `transactions` - Bank Transactions
- `journals` - Manual Journals
- `statements` - Bank Statements

## Command Reference

### sync-direct.ts

```bash
doppler run -- npx tsx src/scripts/sync-direct.ts run [options]
```

**Required Options**:
- `-i, --integration-id <id>` - Integration UUID from database
- `-t, --tenant-id <id>` - Tenant UUID from database

**Optional Options**:
- `-u, --user-id <id>` - User ID (for audit trail)
- `--verbose` - Enable verbose logging

### sync-xero-all.ts

```bash
doppler run -- npx tsx src/scripts/sync-xero-all.ts sync [options]
```

**Required Options**:
- `-i, --integration-id <id>` - Integration UUID from database
- `-t, --tenant-id <id>` - Tenant UUID from database

**Optional Options**:
- `--types <types...>` - Specific entity types to sync (space-separated)
- `--from-date <date>` - Sync data modified after this date (ISO format)
- `--verbose` - Enable verbose logging

## Examples

### 1. Sync All Transactions (Direct)

```bash
doppler run -- npx tsx src/scripts/sync-direct.ts run \
  -i 548c018e-d49a-4474-974d-f5bd40a273a7 \
  -t 02c24a6e-7e7a-4c1e-812d-0febd140efa2
```

### 2. Sync All Entity Types

```bash
doppler run -- npx tsx src/scripts/sync-xero-all.ts sync \
  -i 548c018e-d49a-4474-974d-f5bd40a273a7 \
  -t 02c24a6e-7e7a-4c1e-812d-0febd140efa2
```

### 3. Sync Specific Entity Types

```bash
# Sync only accounts and contacts
doppler run -- npx tsx src/scripts/sync-xero-all.ts sync \
  -i 548c018e-d49a-4474-974d-f5bd40a273a7 \
  -t 02c24a6e-7e7a-4c1e-812d-0febd140efa2 \
  --types accounts contacts
```

### 4. Sync with Date Filter

```bash
# Sync all data modified after 1st January 2024
doppler run -- npx tsx src/scripts/sync-xero-all.ts sync \
  -i 548c018e-d49a-4474-974d-f5bd40a273a7 \
  -t 02c24a6e-7e7a-4c1e-812d-0febd140efa2 \
  --from-date 2024-01-01
```

### 5. Sync with Verbose Logging

```bash
doppler run -- npx tsx src/scripts/sync-xero-all.ts sync \
  -i 548c018e-d49a-4474-974d-f5bd40a273a7 \
  -t 02c24a6e-7e7a-4c1e-812d-0febd140efa2 \
  --verbose
```

## Expected Output

### Successful Sync

```
🔄 Starting comprehensive Xero sync...
Integration: 548c018e-d49a-4474-974d-f5bd40a273a7
Tenant: 02c24a6e-7e7a-4c1e-812d-0febd140efa2
✓ Found Xero integration
Using stored tenant ID: 070440f1-ce4b-44bd-bc2d-df824ddaab8c

Syncing: accounts, contacts, invoices, transactions, journals, statements

📊 Syncing Chart of Accounts...
✓ Chart of Accounts sync completed (1.2s) - Created: 45, Updated: 12, Errors: 0

📊 Syncing Contacts...
✓ Contacts sync completed (3.5s) - Created: 123, Updated: 45, Errors: 0

[...]

✅ Sync completed successfully in 15.3s
```

### Failed Sync

```
🔄 Starting comprehensive Xero sync...
Integration: 548c018e-d49a-4474-974d-f5bd40a273a7
Tenant: 02c24a6e-7e7a-4c1e-812d-0febd140efa2
✓ Found Xero integration
⚠️  Access token expired, refreshing...
✗ Failed to refresh token: [error details]
```

## Troubleshooting

### Common Issues

#### 1. Integration Not Found

**Error**: `Xero integration not found`

**Solution**: 
- Verify integration ID and tenant ID are correct
- Check integration exists in database:
  ```sql
  SELECT id, tenant_id, status FROM integrations 
  WHERE provider = 'xero' AND id = '[integration-id]';
  ```

#### 2. Integration Not Active

**Error**: `Integration is not active (status: inactive)`

**Solution**:
- Update integration status in database
- Check if integration was deactivated due to errors

#### 3. Token Refresh Failed

**Error**: `Failed to refresh token`

**Solution**:
- User may need to re-authenticate through the web interface
- Check if refresh token is still valid
- Verify Xero app credentials are correct

#### 4. xero-node ApiError Bug

**Error**: `TypeError: Cannot read properties of undefined (reading 'status')`

**Solution**:
- This is a known bug in xero-node library when network errors occur
- Usually indicates authentication or network connectivity issues
- Check if tokens are valid and Xero API is accessible

#### 5. Tenant ID Mismatch

**Error**: `Tenant not found` or API errors

**Solution**:
- Verify the Xero tenant ID matches the organisation
- Check if user has access to the specified tenant in Xero

### Debug Commands

1. **Test Database Connection**:
   ```bash
   doppler run -- npx tsx -e "
   import { connectDatabase } from './src/database/connection';
   connectDatabase().then(() => console.log('✓ Database connected')).catch(console.error);
   "
   ```

2. **Check Integration Status**:
   ```bash
   doppler run -- npx tsx -e "
   import { connectDatabase, getDatabase } from './src/database/connection';
   import { integrations } from './src/database/schema';
   import { eq } from 'drizzle-orm';
   
   (async () => {
     await connectDatabase();
     const db = getDatabase();
     const [integration] = await db.select().from(integrations)
       .where(eq(integrations.id, '548c018e-d49a-4474-974d-f5bd40a273a7'));
     console.log('Integration:', integration);
   })();
   "
   ```

## Best Practices

### 1. Sync Order

Always sync in this order for best results:
1. **Accounts** - Required for other entities
2. **Contacts** - Required for invoices
3. **Invoices** - After accounts and contacts
4. **Transactions** - Can be synced independently
5. **Journals** - After accounts
6. **Statements** - After accounts

### 2. Initial Sync

For first-time sync:
```bash
# Full sync without date filter
doppler run -- npx tsx src/scripts/sync-xero-all.ts sync \
  -i [integration-id] \
  -t [tenant-id]
```

### 3. Incremental Sync

For regular updates:
```bash
# Sync only recent changes
doppler run -- npx tsx src/scripts/sync-xero-all.ts sync \
  -i [integration-id] \
  -t [tenant-id] \
  --from-date $(date -I -d '7 days ago')
```

### 4. Error Recovery

If sync fails partway:
1. Check error logs for specific entity that failed
2. Fix any data issues
3. Re-run sync for failed entity types only:
   ```bash
   doppler run -- npx tsx src/scripts/sync-xero-all.ts sync \
     -i [integration-id] \
     -t [tenant-id] \
     --types [failed-types]
   ```

### 5. Performance Considerations

- Large datasets may take several minutes
- Bank statements sync can be slow for accounts with many transactions
- Use `--types` to sync only what's needed
- Consider running during off-peak hours for large syncs

### 6. Monitoring

- Check `import_batches` table for sync history
- Monitor error logs for failed records
- Set up alerts for failed syncs in production

## Production Deployment

In production, these scripts should typically be:
1. Triggered by scheduled jobs (cron, etc.)
2. Run through the job queue system
3. Monitored for failures
4. Have proper error alerting

For production use, prefer the queue-based sync over direct sync for better reliability and scalability.

## Additional Resources

- [Xero API Documentation](https://developer.xero.com/documentation/)
- [xero-node SDK Documentation](https://github.com/XeroAPI/xero-node)
- Internal API documentation at `/docs/api`