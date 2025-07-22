# Figgy - Multi-tenant Accounting Integration Platform

A modern, multi-tenant SaaS platform for integrating with accounting providers, built with TypeScript, Vue.js, and tRPC.

## 🏗️ Architecture Overview

Figgy is built as a monorepo using Turborepo, featuring:
- **Backend**: Node.js API with tRPC, PostgreSQL, and Redis
- **Frontend**: Nuxt 3 with Nuxt UI Pro components and Pinia state management
- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Multi-tenancy**: Built-in workspace isolation and permissions
- **Type Safety**: End-to-end TypeScript with tRPC

## 📦 Project Structure

```
figgy/
├── apps/
│   ├── api/              # Backend tRPC API server
│   └── web/              # Nuxt 3 frontend application
├── packages/
│   ├── shared-config/    # Shared ESLint and Prettier configs
│   ├── shared-types/     # Common TypeScript types
│   ├── shared-utils/     # Shared utilities
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Bun >= 1.0.0
- PostgreSQL
- Redis (optional for development)
- Doppler CLI (for environment management)

### Environment Setup

1. **Install Doppler CLI**:
   ```bash
   # macOS
   brew install doppler

   # Or use the install script
   curl -Ls https://cli.doppler.com/install.sh | sh
   ```

2. **Login to Doppler**:
   ```bash
   doppler login
   ```

3. **Setup Doppler projects**:
   ```bash
   # In the root directory
   doppler setup

   # Select project: figgy-be
   # Select config: dev
   ```

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd figgy
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Database setup**:
   ```bash
   # Run migrations
   bun run db:migrate

   # Seed database (optional)
   bun run db:seed
   ```

4. **Start development servers**:
   ```bash
   # Start all services
   bun run dev:all

   # Or start individually
   bun run dev:api    # Backend API
   bun run dev:web    # Frontend
   ```

The API will be available at `http://localhost:3000` and the web app at `http://localhost:5173`.

## 🏛️ Backend Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript (Bun compatible)
- **Framework**: Hono (lightweight web server)
- **API**: tRPC for type-safe APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Queue**: BullMQ with Redis
- **Authentication**: JWT with Supabase integration
- **Logging**: @figgy/utils

### Clean Architecture

The backend follows Clean Architecture principles:

```
src/
├── core/                 # Domain layer (business logic)
│   ├── domain/          # Entities and value objects
│   ├── usecases/        # Application business rules
│   └── ports/           # Repository interfaces
├── infrastructure/       # External adapters
│   └── repositories/    # Database implementations
├── services/            # Application services
├── routers/             # tRPC routers (API endpoints)
├── middleware/          # Cross-cutting concerns
└── jobs/                # Background job processors
```

### Key Concepts

1. **Domain-Driven Design**: Business logic lives in domain entities
2. **Dependency Injection**: IoC container for managing dependencies
3. **Repository Pattern**: Abstract database operations
4. **Multi-tenancy**: Tenant isolation at all levels
5. **Background Jobs**: Async processing with BullMQ

## 🎨 Frontend Architecture

### Technology Stack
- **Framework**: Vue.js 3 (Composition API)
- **State Management**: Pinia
- **Routing**: Vue Router
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Type Safety**: TypeScript

### Application Structure

```
src/
├── components/          # Reusable UI components
├── composables/         # Vue composables
├── stores/              # Pinia state stores
├── views/               # Page components
├── router/              # Route definitions
└── lib/                 # API clients and utilities
```

### State Management

The app uses Pinia stores with a master orchestrator pattern:
- `app.ts` - Master store coordinating initialization
- `auth.ts` - Authentication state
- `workspace.ts` - Tenant/workspace management
- `integration.ts` - Integration management

## 🔧 Development

### Common Commands

```bash
# Development
bun run dev:all          # Start all services
bun run dev:api          # Start API only
bun run dev:web          # Start web only

# Database
bun run db:migrate       # Run migrations
bun run db:seed          # Seed database
bun run db:studio        # Open Drizzle Studio

# Testing
bun run test             # Run all tests
bun run test:unit        # Unit tests only
bun run typecheck        # TypeScript checking

# Code Quality
bun run lint             # Lint all packages
bun run format           # Format all code

# Build
bun run build            # Build all packages
```

### Environment Variables

Environment variables are managed through Doppler. Key variables:

**Backend** (`figgy-be`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_KEY` - JWT signing key
- `REDIS_URL` - Redis connection (optional)
- `XERO_CLIENT_ID/SECRET` - Xero OAuth credentials

**Frontend** (`figgy-web`):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `NUXT_PUBLIC_API_URL` - Backend API URL

## 🔐 Authentication & Authorization

1. **Authentication**: Handled by Supabase
2. **Authorization**: Role-based permissions per workspace
3. **Multi-tenancy**: Workspace isolation enforced at API level
4. **Permissions**: Granular permissions for resources and actions

### Roles
- `owner` - Full access to workspace
- `admin` - Administrative access
- `member` - Standard user access
- `viewer` - Read-only access

## 📚 API Documentation

The API uses tRPC, providing automatic type safety between frontend and backend.

### Main Routers
- `/health` - Health checks
- `/tenant` - Workspace management
- `/user` - User management
- `/integration` - Provider integrations
- `/account` - GL accounts
- `/supplier` - Contacts/suppliers
- `/transaction` - Financial transactions

## 🧪 Testing

```bash
# Run all tests
bun run test

# Unit tests
bun run test:unit

# Integration tests
bun run test:integration

# Type checking
bun run typecheck
```

## 📦 Deployment

### Build for production

```bash
# Build all packages
bun run build

# Build specific app
cd apps/api && bun run build
cd apps/web && bun run build
```

### Environment Configuration

Use Doppler for managing production secrets:
```bash
doppler setup --project figgy-be --config prd
doppler run -- bun run start
```

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Maintain Clean Architecture principles
3. Write tests for new features
4. Use conventional commits
5. Run linting and type checking before commits

## 📄 License

MIT