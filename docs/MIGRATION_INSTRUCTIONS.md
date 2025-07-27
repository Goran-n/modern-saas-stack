# Migration Instructions for Supplier Enrichment

The supplier enrichment feature requires database schema changes. Please run the following migration:

## Database Migration

Run the SQL migration file that was created:

```bash
psql $DATABASE_URL < drizzle/0005_add_enrichment_fields.sql
```

Or if using a database migration tool, apply the migration at:
`drizzle/0005_add_enrichment_fields.sql`

This migration adds:
- `enrichment_status` enum type with values: pending, enriched, failed, insufficient_data
- `enrichment_data` JSONB column for storing industry, services, etc.
- `last_enrichment_at` timestamp
- `enrichment_attempts` counter
- Index on `enrichment_status`

## Environment Variables

Add the following to your `.env` file:

```bash
# For domain discovery
SERPER_API_KEY=your_serper_api_key

# For website content extraction
FIRECRAWL_API_KEY=your_firecrawl_api_key

# For AI analysis (if not already set)
OPENAI_API_KEY=your_openai_api_key
```

## Testing the CLI

After migration and environment setup:

```bash
# Check enrichment status
doppler run -- bun run figgy suppliers enrich

# Test dry run
doppler run -- bun run figgy suppliers enrich --all --dry-run

# Enrich suppliers
doppler run -- bun run figgy suppliers enrich --all --limit 5
```