# Doppler Setup for Kibly

This guide sets up Doppler projects exactly matching switch-platform's configuration.

## 1. Create Doppler Projects

```bash
# Create backend project
doppler projects create kibly-be

# Create frontend project  
doppler projects create kibly-web
```

## 2. Setup Backend Project (kibly-be)

```bash
# Switch to backend project
doppler setup -p kibly-be -c dev

# Add backend environment variables
doppler secrets set DATABASE_URL="postgresql://username:password@localhost:5432/kibly"
doppler secrets set JWT_KEY="your-supabase-jwt-secret-from-dashboard"
doppler secrets set JWT_ISSUER="https://your-project-ref.supabase.co/auth/v1"
doppler secrets set CORS_ORIGIN="http://localhost:5173"
doppler secrets set CORS_CREDENTIALS="true"
doppler secrets set NODE_ENV="development"
doppler secrets set LOG_LEVEL="info"
doppler secrets set PORT="3000"
```

## 3. Setup Frontend Project (kibly-web)

```bash
# Switch to frontend project
doppler setup -p kibly-web -c dev

# Add frontend environment variables
doppler secrets set VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
doppler secrets set VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
doppler secrets set VITE_APP_NAME="Kibly"
doppler secrets set VITE_APP_URL="http://localhost:5173"
doppler secrets set VITE_API_BASE_URL="http://localhost:3000"
```

## 4. Verify Setup

```bash
# Check backend project
doppler secrets -p kibly-be -c dev

# Check frontend project
doppler secrets -p kibly-web -c dev
```

## 5. Development Commands

```bash
# Start both with correct doppler projects
bun run dev:all

# Or start individually
bun run dev:api    # Uses kibly-be project
bun run dev:web    # Uses kibly-web project
```

## 6. Create Production Configs

```bash
# Create production configs
doppler configs create prd -p kibly-be
doppler configs create prd -p kibly-web

# Set production variables (repeat step 2 & 3 with -c prd)
```

## Environment Variable Sources

### Where to get Supabase values:
1. **VITE_SUPABASE_URL**: Supabase Dashboard > Settings > API > Project URL
2. **VITE_SUPABASE_ANON_KEY**: Supabase Dashboard > Settings > API > Project API keys > anon public
3. **JWT_KEY**: Supabase Dashboard > Settings > API > JWT Settings > JWT Secret

### Database URL format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## Troubleshooting

If you get "Missing Supabase environment variables":
1. Ensure you're using `bun run dev:web` (not just `bun run dev`)
2. Check that kibly-web project has the VITE_* variables set
3. Verify with: `doppler secrets -p kibly-web -c dev`