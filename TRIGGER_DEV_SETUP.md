# Trigger.dev Setup Guide

## Overview

This project uses Trigger.dev v3 for background job processing. The jobs are defined in the `packages/jobs` directory and are triggered from the tRPC API.

## Development Setup

### Prerequisites

1. **Environment Variables** (already configured in Doppler):
   - `TRIGGER_PROJECT_ID` - Your Trigger.dev project ID
   - `TRIGGER_API_KEY` - Your Trigger.dev API key
   - `TRIGGER_API_URL` - The Trigger.dev API URL (defaults to https://api.trigger.dev)

### Running Locally

To run Trigger.dev in development mode:

```bash
# Run only the jobs dev server
cd packages/jobs
bun run dev

# Or run all services including Trigger.dev
bun dev:all
```

The `dev:all` script runs:
- API server
- Web application
- Queue monitor
- Trigger.dev jobs server

### Testing Jobs

1. Start the development servers
2. Upload a file through the API
3. Check the Trigger.dev dashboard to see the job execution
4. Monitor logs in the terminal

## Deployment

### Manual Deployment

```bash
cd packages/jobs

# Deploy to production (default)
bun run deploy

# Deploy to staging
bun run deploy:staging

# Deploy to specific environment
bun run deploy:prod
```

### CI/CD Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy-trigger.yml`) that automatically deploys Trigger.dev tasks when pushing to the main branch.

#### Required GitHub Secrets

1. `TRIGGER_ACCESS_TOKEN` - Personal access token from Trigger.dev (NOT the API key)
   - Create at: https://trigger.dev/account/tokens
   - Required for CI/CD deployments

2. `TRIGGER_PROJECT_ID` - Your production project ID

#### Manual Workflow Dispatch

You can also trigger deployments manually:
1. Go to Actions tab in GitHub
2. Select "Deploy Trigger.dev Tasks"
3. Click "Run workflow"
4. Choose environment (prod/staging)

## Environment Management

### Development
- Uses the dev project configured in Doppler
- Jobs run locally on your machine
- No deployment needed

### Staging
- Create a separate Trigger.dev project for staging
- Add staging credentials to Doppler:
  - `TRIGGER_PROJECT_ID_STAGING`
  - `TRIGGER_ACCESS_TOKEN_STAGING`

### Production
- Create a separate Trigger.dev project for production
- Add production credentials to Doppler:
  - `TRIGGER_PROJECT_ID_PROD`
  - `TRIGGER_ACCESS_TOKEN_PROD`

## Adding New Jobs

1. Create a new file in `packages/jobs/src/tasks/`
2. Define your job using `schemaTask` or `task` from `@trigger.dev/sdk/v3`
3. Export the job from the file
4. The job will be automatically discovered by Trigger.dev

Example:
```typescript
import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const myJobSchema = z.object({
  data: z.string(),
});

export const myJob = schemaTask({
  id: "my-job",
  schema: myJobSchema,
  run: async ({ data }) => {
    // Job logic here
    return { success: true };
  },
});
```

## Triggering Jobs

Jobs can be triggered from the tRPC API using the `tasks` object:

```typescript
import { tasks } from "@trigger.dev/sdk/v3";

// Single job
await tasks.trigger("job-id", payload);

// Batch jobs
await tasks.batchTrigger("job-id", [
  { payload: payload1 },
  { payload: payload2 },
]);
```

## Monitoring

- Development: Check terminal logs and local Trigger.dev dashboard
- Production: Use the Trigger.dev dashboard at https://trigger.dev

## Troubleshooting

### Common Issues

1. **"Project not found" error**
   - Ensure `TRIGGER_PROJECT_ID` is set correctly
   - Check you're using the right environment

2. **Authentication errors**
   - Verify `TRIGGER_API_KEY` (for local dev) or `TRIGGER_ACCESS_TOKEN` (for CI/CD)
   - Ensure tokens haven't expired

3. **Jobs not running**
   - Check the jobs dev server is running
   - Verify the job ID matches exactly
   - Check Trigger.dev dashboard for error logs

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=trigger* bun run dev
```

## Resources

- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Trigger.dev Dashboard](https://trigger.dev)
- [API Reference](https://trigger.dev/docs/api-reference)