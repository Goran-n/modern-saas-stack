# Figgy CLI

Command-line interface for managing your Figgy instance.

## Installation

```bash
bun install
```

## Usage

### Development

```bash
bun run dev <command>
```

### Production

```bash
figgy <command>
```

## Commands

### resync

Resync and reprocess all data for a tenant. This is useful when:
- You've updated processing logic and need to reprocess existing files
- Search index is out of sync
- You want to trigger reprocessing of failed files

```bash
# Interactive mode - will prompt for tenant ID
figgy resync

# Specify tenant ID
figgy resync --tenant <tenant-id>

# Resync only files
figgy resync --tenant <tenant-id> --files

# Resync only suppliers
figgy resync --tenant <tenant-id> --suppliers

# Rebuild search index only (fast)
figgy resync --tenant <tenant-id> --index

# Update search index without triggering AI jobs
figgy resync --tenant <tenant-id> --search-only

# Skip AI processing, only update search
figgy resync --tenant <tenant-id> --skip-processing

# Dry run - see what would be resynced
figgy resync --tenant <tenant-id> --dry-run

# Custom batch size (default: 50)
figgy resync --tenant <tenant-id> --batch-size 100
```

#### Options

- `-t, --tenant <id>`: Tenant ID to resync
- `-f, --files`: Resync files only
- `-s, --suppliers`: Resync suppliers only  
- `-i, --index`: Rebuild search index only
- `--search-only`: Only rebuild search index without triggering AI processing
- `--skip-processing`: Skip triggering new AI jobs when resyncing files
- `--dry-run`: Show what would be resynced without actually doing it
- `--batch-size <size>`: Number of records to process at once (default: 50)

#### What it does

1. **Files resync**: Triggers reprocessing of all files for the tenant
   - Reruns categorization and extraction
   - Updates search index
   - Maintains processing status

2. **Suppliers resync**: Reindexes all suppliers in search
   - Updates search index with current supplier data
   - Skips deleted suppliers

3. **Search index rebuild**: Rebuilds the entire search index
   - Reindexes all files with their extraction data
   - Reindexes all active suppliers
   - Faster than full resync as it doesn't trigger jobs

## Environment Variables

The CLI uses the same environment variables as the main application. Make sure your `.env` file is configured properly.

## Development

```bash
# Run type checking
bun run typecheck

# Run a command in development
bun run dev resync --tenant test-tenant-id --dry-run
```
