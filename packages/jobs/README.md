# Jobs Package

This package contains all Trigger.dev v3 background jobs for the Figgy platform.

## Supplier Enrichment Jobs

### Overview

The supplier enrichment system consists of three main jobs that work together:

1. **Domain Discovery** (`domain-discovery`) - Searches for company websites using Serper API
2. **Logo Fetch** (`fetch-logo`) - Retrieves company logos using Logo.dev API
3. **Website Analysis** (`website-analysis`) - Analyzes company websites using Firecrawl and LLMs

### Error Handling

All jobs implement proper error handling for Trigger.dev v3:

- **Success**: Job completes successfully when at least one item is processed
- **Failure**: Job throws an error when all items fail, marking it as failed in Trigger.dev
- **Retry Logic**: Built-in retry mechanisms for transient failures:
  - API timeouts: 2 retries with exponential backoff
  - Rate limits: Progressive delay increases
  - Authentication errors: Clear error messages without retries

### API Error Messages

Common error scenarios and their handling:

1. **Authentication Errors**
   - Serper API: "Serper API error: Forbidden" → Check SERPER_API_KEY
   - Firecrawl API: "Firecrawl API authentication failed" → Check FIRECRAWL_API_KEY
   - Logo.dev: Rate limit errors are handled with backoff

2. **Timeout Errors**
   - Firecrawl: Automatic retry with exponential backoff (5s, 10s delays)
   - Custom timeout configuration: 30 seconds per page

3. **JSON Parsing Errors**
   - LLM responses: Robust parsing that handles:
     - Direct JSON responses
     - JSON in markdown code blocks
     - JSON embedded in text

### Running Enrichment

```bash
# Enrich all suppliers without domains (limit 10)
doppler run -- bun run scripts/enrich-suppliers.ts --all --limit 10

# Enrich specific supplier
doppler run -- bun run scripts/enrich-suppliers.ts --supplier <id>

# Dry run to see what would be enriched
doppler run -- bun run scripts/enrich-suppliers.ts --all --dry-run
```

### Required Environment Variables

```env
# Serper API for domain discovery
SERPER_API_KEY=your-serper-api-key

# Firecrawl API for website content extraction
FIRECRAWL_API_KEY=your-firecrawl-api-key

# Logo.dev API for logo fetching (optional)
LOGO_DEV_TOKEN=your-logo-dev-token

# Trigger.dev configuration
TRIGGER_PROJECT_ID=your-project-id
TRIGGER_API_KEY=your-api-key
```

### Monitoring

Jobs log detailed metrics for monitoring:

```javascript
{
  event: "domain_discovery_completed",
  analyzed: 5,
  failed: 1,
  skipped: 2,
  total: 8,
  timestamp: "2025-07-27T15:19:51.600Z",
  metrics: {
    api: "serper",
    task: "domain-discovery",
    requests_made: 6,
    successful_discoveries: 5
  }
}
```

### Database Schema

Jobs update the `global_suppliers` table with:
- `primaryDomain` - Discovered website domain
- `logoUrl` - Fetched company logo URL
- `logoFetchStatus` - Status of logo fetch (success/not_found/failed)
- `logoFetchedAt` - Timestamp of last logo fetch attempt
- `enrichmentStatus` - Overall enrichment status (pending/in_progress/completed/failed)
- `enrichmentData` - JSON data from website analysis
- `enrichmentAttempts` - Number of enrichment attempts
- `lastEnrichmentAt` - Timestamp of last enrichment

### Development

To run jobs locally:

```bash
# Start Trigger.dev development server
doppler run -- bun run dev

# Jobs will execute in the development environment
# Check logs for detailed execution information
```

### Troubleshooting

1. **"Script not found" error**
   - Use the enrichment script: `bun run scripts/enrich-suppliers.ts`
   - Or trigger jobs directly from your application code

2. **Jobs marked as "Success" when they fail**
   - Fixed: Jobs now throw errors when all items fail
   - Check job logs for detailed error information

3. **Empty error objects in logs**
   - Fixed: All errors now properly serialize with messages
   - Look for `error` and `stack` fields in logs

4. **API authentication failures**
   - Verify environment variables are set correctly
   - Use `doppler run` to ensure secrets are loaded
   - Check API key validity with provider dashboards