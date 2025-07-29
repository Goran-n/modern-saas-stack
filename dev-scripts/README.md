# Development Scripts

This directory contains development-only scripts that should not be deployed to production.

## Test Scripts
Located in `test/` directory:
- `enrich-suppliers-simple.ts` - Test script for supplier enrichment
- `test-thumbnail-access.ts` - Test thumbnail access functionality
- `test-thumbnail-job.ts` - Test thumbnail job processing
- `test-thumbnail-job-fixed.ts` - Fixed version of thumbnail job test

## Utility Scripts
- `cleanup-dev.ts` - Cleans up development processes on ports
- `fix-tsconfig-build.ts` - Fixes TypeScript build configuration issues

## Running Scripts
All scripts should be run using bun:
```bash
bun dev-scripts/cleanup-dev.ts
bun dev-scripts/test/test-thumbnail-access.ts
```