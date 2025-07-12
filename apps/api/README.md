# @kibly/api

The main API server for Kibly, built with Hono and tRPC.

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

Create a `.env` file based on `.env.example`:

```bash
# Server
NODE_ENV=development
PORT=5001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kibly

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Auth
JWT_SECRET=your-jwt-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# The API will be available at http://localhost:5001
```

### Production

```bash
# Build the application
bun run build

# Start production server
bun run start
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