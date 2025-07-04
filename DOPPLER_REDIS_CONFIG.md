# Doppler Redis Configuration for Upstash

## Environment Variables to Set in Doppler

Based on your Upstash Redis connection string:
`redis://default:AYQIAAIjcDE0NjJlZmNkMTc4ZmQ0YjZkODdlZTAxMTBjYjE4NTY3OXAxMA@finer-cub-33800.upstash.io:6379`

### Option 1: Use Full URL (Recommended for Upstash)
```bash
REDIS_URL=redis://default:AYQIAAIjcDE0NjJlZmNkMTc4ZmQ0YjZkODdlZTAxMTBjYjE4NTY3OXAxMA@finer-cub-33800.upstash.io:6379
REDIS_TLS=true
```

### Option 2: Individual Components (Alternative)
```bash
REDIS_HOST=finer-cub-33800.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AYQIAAIjcDE0NjJlZmNkMTc4ZmQ0YjZkODdlZTAxMTBjYjE4NTY3OXAxMA
REDIS_DB=0
REDIS_TLS=true
```

## How to Set in Doppler

1. Go to your Doppler project dashboard
2. Navigate to your environment (dev/staging/production)
3. Add these environment variables:

### For kibly-api project:
```bash
# Set using Doppler CLI
doppler secrets set REDIS_URL="redis://default:AYQIAAIjcDE0NjJlZmNkMTc4ZmQ0YjZkODdlZTAxMTBjYjE4NTY3OXAxMA@finer-cub-33800.upstash.io:6379" -p kibly-api -c dev

doppler secrets set REDIS_TLS="true" -p kibly-api -c dev
```

### Or using Doppler Web Interface:
1. Log into Doppler dashboard
2. Select `kibly-api` project
3. Select `dev` config
4. Click "Add Secret"
5. Add each variable:
   - Key: `REDIS_URL`, Value: `redis://default:AYQIAAIjcDE0NjJlZmNkMTc4ZmQ0YjZkODdlZTAxMTBjYjE4NTY3OXAxMA@finer-cub-33800.upstash.io:6379`
   - Key: `REDIS_TLS`, Value: `true`

## Test the Configuration

After setting the variables, test with:
```bash
# Check if variables are set
doppler secrets get REDIS_URL -p kibly-api -c dev
doppler secrets get REDIS_TLS -p kibly-api -c dev

# Test the API startup
bun run dev:api
```

## Expected Output
You should see:
```
📊 Connecting to Redis...
Connected to Redis
Redis is ready
✅ Redis connected successfully
⚙️  Starting job processors...
✅ Job processors started
```

## Troubleshooting

If you still get connection errors:

1. **Verify Upstash Redis is active** in your Upstash dashboard
2. **Check IP restrictions** - Upstash might have IP allowlists
3. **Try connecting directly** with redis-cli:
   ```bash
   redis-cli --tls -u "redis://default:AYQIAAIjcDE0NjJlZmNkMTc4ZmQ0YjZkODdlZTAxMTBjYjE4NTY3OXAxMA@finer-cub-33800.upstash.io:6379" ping
   ```

## Security Note
⚠️ Never commit Redis credentials to git. Always use Doppler or environment variables.