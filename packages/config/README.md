# @kibly/config

Centralized environment variable configuration and validation for Kibly applications.

## Features

- 🔒 **Type-safe** environment variables with Zod validation
- 🌍 **Environment-specific** configurations (development, production, test)
- 🚀 **Bootstrap validation** - fail fast with clear error messages
- 📦 **Service-specific** configurations for different packages
- 🔧 **Flexible** - supports custom configurations for testing
- 📝 **Self-documenting** - comprehensive schemas with descriptions

## Quick Start

```typescript
import { bootstrap } from '@kibly/config';

// Bootstrap configuration at application startup
const config = bootstrap();

// Configuration is now validated and available throughout your app
console.log('Database URL:', config.DATABASE_URL);
console.log('Log Level:', config.LOG_LEVEL);
```

## Service-Specific Configuration

```typescript
import { bootstrapForService } from '@kibly/config';

// For file manager service
const fileManagerConfig = bootstrapForService('file-manager');
// Contains: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, etc.

// For web application
const webConfig = bootstrapForService('web-app');
// Contains: WEB_PORT, API_URL, SUPABASE_URL, etc.
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `SUPABASE_URL` | Supabase project URL | `https://project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-super-secure-secret-key` |

### Optional Variables with Defaults

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |
| `PORT` | `5000` | Default application port |
| `HOST` | `localhost` | Host to bind to |
| `WEB_PORT` | `4000` | Web application port |
| `API_URL` | `http://localhost:5001` | API service URL |
| `QUEUE_MONITOR_PORT` | `3001` | Queue monitor port |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_TLS` | `false` | Enable Redis TLS |

## Environment-Specific Behavior

### Development
- Relaxed validation with helpful defaults
- Pretty-printed logs with colors
- Development JWT secret provided as fallback
- Redis and other services optional

### Production
- Strict validation - all critical variables required
- Structured JSON logging
- Shorter JWT expiration times
- TLS preferred for external services

### Test
- Minimal logging (error level only)
- Mock/test values for most variables
- Separate database and Redis instances

## Advanced Usage

### Manual Configuration

```typescript
import { getConfig } from '@kibly/config';

// Get config instance (must bootstrap first)
const config = getConfig();

// Validate manually
const validatedConfig = config.validate();

// Get service-specific config
const fileManagerConfig = config.getForFileManager();
```

### Custom Environment Variables (Testing)

```typescript
import { bootstrap } from '@kibly/config';

const testConfig = bootstrap({
  customEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
    JWT_SECRET: 'test-secret-32-chars-minimum-length'
  }
});
```

### Production Validation

```typescript
import { validateProductionConfig } from '@kibly/config';

// Validate production config in CI/CD
if (!validateProductionConfig()) {
  console.error('Production configuration is invalid!');
  process.exit(1);
}
```

### Configuration Summary

```typescript
import { printConfigSummary } from '@kibly/config';

// Print configuration overview (no sensitive values)
printConfigSummary();
```

## Integration with Logger

The config package automatically configures the `@kibly/utils` logger based on validated configuration:

```typescript
import { bootstrap } from '@kibly/config';
import { createLogger } from '@kibly/utils';

// Bootstrap first - this configures the logger
bootstrap();

// Logger is now configured with correct log level and format
const logger = createLogger('my-service');
logger.info('Application started');
```

## Error Handling

Configuration validation errors are detailed and helpful:

```
❌ Configuration bootstrap failed

Configuration validation failed:
1. DATABASE_URL: Required
2. SUPABASE_URL: Required  
3. JWT_SECRET: String must contain at least 32 character(s)
```

## Best Practices

1. **Bootstrap Early**: Call `bootstrap()` at the very start of your application
2. **Environment Files**: Use `.env.example` as a template for your `.env` file
3. **Production Secrets**: Use Doppler or similar for production secrets
4. **Service-Specific**: Use `bootstrapForService()` in packages that don't need full config
5. **Validation**: Let validation fail fast - don't try to work around missing config

## Package Dependencies

- `zod` - Schema validation
- `@kibly/utils` - Logging integration

## See Also

- [Environment Variables Guide](../../.env.example)
- [@kibly/utils Logger](../utils/README.md)
- [Bootstrap Examples](./src/bootstrap.ts)