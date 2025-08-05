# @figgy/api

The main API server for Figgy, built with Hono and tRPC.

## Features

- 🚀 High-performance API server powered by Bun and Hono
- 🔐 Supabase authentication with JWT tokens
- 🏢 Multi-tenant support
- 📁 File upload and management
- 🌐 tRPC for end-to-end type safety
- ⚡ Real-time capabilities (coming soon)

## Getting Started

### Prerequisites

- Bun runtime
- PostgreSQL database
- Supabase project
- Redis (for caching and queues)

### Environment Variables

Environment variables are managed through Doppler. Key variables include:

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 5001)
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service key
- `JWT_SECRET` - JWT signing secret
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `BASE_URL` - Base URL for webhooks and callbacks

### Development

```bash
# Install dependencies
bun install

# Run development server with Doppler
doppler run -- bun run dev

# The API will be available at http://localhost:5001
```

### Production

```bash
# Build the application
bun run build

# Start production server with Doppler
doppler run -- bun run start
```

## API Endpoints

### Health Check
- `GET /health` - Returns server status

### tRPC Endpoints
- `POST /trpc/*` - All tRPC procedures

Available procedures:
- `files.upload` - Upload a file
- `files.list` - List files
- `files.getSignedUrl` - Get download URL
- `files.delete` - Delete a file

## Architecture

The API server uses:
- **Hono** - Web framework
- **tRPC** - Type-safe API layer
- **Supabase** - Authentication and storage
- **Drizzle ORM** - Database queries
- **Zod** - Schema validation

## Testing

```bash
# Run type checking
bun run typecheck

# Run tests (coming soon)
bun test
```

## Deployment

The API can be deployed to any platform that supports Bun or Node.js:

- Docker
- Railway
- Fly.io
- AWS ECS/Fargate
- Google Cloud Run

## Monitoring

The API includes:
- Structured logging with correlation IDs
- Health check endpoint
- Error tracking (integrate with Sentry)
- Performance monitoring (coming soon)