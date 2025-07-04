# Dependency Update Summary

## Updates Applied (2025-07-01)

### API Package (`apps/api`)
- ✅ `@trpc/server`: ^11.0.3 → ^11.4.3
- ✅ `@types/node`: ^22.0.0 → ^24.0.10 (major update)
- ✅ `@typescript-eslint/eslint-plugin`: ^8.34.1 → ^8.35.1
- ✅ `@typescript-eslint/parser`: ^8.34.1 → ^8.35.1
- ✅ `bullmq`: ^5.17.0 → ^5.56.0
- ✅ `eslint`: ^9.28.0 → ^9.30.1
- ✅ `hono`: ^4.8.2 → ^4.8.3
- ✅ `ioredis`: ^5.4.1 → ^5.6.1
- ✅ `prettier`: ^3.5.3 → ^3.6.2

### Queue Monitor Package (`packages/queue-monitor`)
- ✅ `@types/express`: ^5.0.0 → ^5.0.3
- ✅ `@types/node`: ^22.0.0 → ^24.0.10 (major update)
- ✅ `@typescript-eslint/eslint-plugin`: ^8.34.1 → ^8.35.1
- ✅ `@typescript-eslint/parser`: ^8.34.1 → ^8.35.1
- ✅ `bullmq`: ^5.1.0 → ^5.56.0
- ✅ `eslint`: ^9.28.0 → ^9.30.1
- ✅ `ioredis`: ^5.4.1 → ^5.6.1

### Shared Config Package (`packages/shared-config`)
- ✅ `@typescript-eslint/eslint-plugin`: ^8.34.1 → ^8.35.1
- ✅ `@typescript-eslint/parser`: ^8.34.1 → ^8.35.1
- ✅ `eslint`: ^9.28.0 → ^9.30.1
- ✅ `prettier`: ^3.5.3 → ^3.6.2

## Major Version Updates NOT Applied
These require careful testing and potential code changes:

### Queue Monitor Package
- ❌ `@bull-board/api`: ^5.10.2 → ^6.10.1 (breaking changes)
- ❌ `@bull-board/express`: ^5.10.2 → ^6.10.1 (breaking changes)
- ❌ `express`: ^4.21.1 → ^5.1.0 (major breaking changes)

### Web Package
- ❌ No updates required (already on latest compatible versions)

## Key Dependencies Already on Latest
- ✅ `drizzle-orm`: 0.44.2 (latest)
- ✅ `drizzle-kit`: 0.31.4 (latest)
- ✅ `xero-node`: 13.0.0 (latest)
- ✅ `@vepler/logger`: 3.0.0 (latest)
- ✅ `reflect-metadata`: 0.2.2 (latest)

## Notes
- All TypeScript-related packages are now on their latest versions
- Node types upgraded to v24 for better compatibility
- BullMQ and related packages are synchronized across all workspaces
- Express v5 is available but not applied due to breaking changes
- Bull Board v6 is available but requires migration from v5

## Recommendations
1. The current dependency versions are stable and up-to-date
2. Consider upgrading Bull Board to v6 in a separate PR with proper testing
3. Express v5 upgrade should be planned carefully as it has significant breaking changes
4. All security patches and minor updates have been applied