# @figgy/trpc

Shared tRPC routers, procedures, and types for the Figgy API.

## Features

- 🚀 tRPC v10 with end-to-end type safety
- 🔐 Supabase authentication with JWT tokens
- 🏢 Multi-tenant support with middleware
- 📁 File upload router with size and type validation
- 🌐 Hono server integration
- ⚡ Bun runtime support
- 🔧 Centralised configuration via @figgy/config

## Installation

```bash
bun add @figgy/trpc
```

## Usage

### Server Setup

```typescript
import { serve } from "@hono/node-server";
import { bootstrap } from "@figgy/config";
import { createHonoApp } from "@figgy/trpc";

// Bootstrap configuration
const config = bootstrap();

// Create Hono app with tRPC
const app = createHonoApp();

// Start server
serve({
  fetch: app.fetch,
  port: config.PORT,
  hostname: config.HOST,
});
```

### Client Setup

```typescript
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@figgy/trpc";

const trpc = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: "http://localhost:5001/trpc",
      headers() {
        return {
          authorization: `Bearer ${getAuthToken()}`,
          "x-tenant-id": getTenantId(),
        };
      },
    }),
  ],
});
```

### File Upload Example

```typescript
// Upload a file
const result = await trpc.files.upload.mutate({
  fileName: "document.pdf",
  mimeType: "application/pdf",
  size: 1024 * 1024, // 1MB
  base64Data: "base64EncodedFileContent...",
});

// Get signed URL for download
const { url } = await trpc.files.getSignedUrl.query({
  fileId: result.id,
  expiresIn: 3600, // 1 hour
});

// List files
const { files, hasMore } = await trpc.files.list.query({
  limit: 20,
  offset: 0,
});

// Delete a file
await trpc.files.delete.mutate({
  fileId: "file-id",
});
```

## Authentication

The package uses Supabase for authentication. Include the JWT token in the Authorization header:

```typescript
headers: {
  "Authorization": "Bearer <jwt-token>",
  "X-Tenant-Id": "<tenant-id>" // Required for tenant-specific operations
}
```

## Middleware

### Available Procedures

- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires authenticated user
- `tenantProcedure` - Requires authenticated user with tenant access

### Creating Custom Routers

```typescript
import { createTRPCRouter, tenantProcedure } from "@figgy/trpc";
import { z } from "zod";

export const customRouter = createTRPCRouter({
  myEndpoint: tenantProcedure
    .input(z.object({
      data: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Access context
      const { user, tenantId, tenant, db } = ctx;
      
      // Your logic here
      return { success: true };
    }),
});
```

## Configuration

The package uses @figgy/config for centralised configuration. Required environment variables:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT verification
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5001)
- `HOST` - Server hostname (default: 0.0.0.0)

## File Upload Configuration

### Limits
- Maximum file size: 10MB
- Allowed MIME types:
  - Images: jpeg, png, gif, webp
  - Documents: pdf, plain text, csv, json
  - Office: xlsx, docx

### Storage
Files are stored in Supabase Storage with the following structure:
```
{tenantId}/{userId}/{timestamp}_{sanitisedFileName}
```

## Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build package
bun run build

# Type check
bun run typecheck
```

## Architecture

The package follows a modular architecture:

```
src/
├── trpc/           # Core tRPC setup
│   ├── index.ts    # tRPC initialisation
│   ├── context.ts  # Request context
│   └── procedures.ts # Reusable procedures
├── middleware/     # Authentication middleware
│   └── auth.ts     # Auth and tenant validation
├── routers/        # API routers
│   ├── files.ts    # File operations
│   └── index.ts    # Root router
├── server.ts       # Hono server setup
└── index.ts        # Package exports
```

## Error Handling

The package provides structured error handling:

- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `BAD_REQUEST` - Invalid input or request
- `NOT_FOUND` - Resource not found
- `INTERNAL_SERVER_ERROR` - Server-side errors

All errors include appropriate HTTP status codes and messages.