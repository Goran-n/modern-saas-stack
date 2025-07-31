# My App - Skeleton Project

A modern, full-stack skeleton application built with TypeScript, Vue.js, Nuxt 3, tRPC, and PostgreSQL.

## 🏗️ Architecture Overview

This skeleton project is built as a monorepo using Turborepo, featuring:
- **Backend**: Bun + Hono + tRPC + PostgreSQL + Drizzle ORM
- **Frontend**: Nuxt 3 + Vue 3 + Pinia + TailwindCSS
- **Type Safety**: End-to-end TypeScript with tRPC
- **Code Quality**: Biome for linting and formatting

## 📦 Project Structure

```
my-app/
├── apps/
│   ├── api/              # Backend tRPC API server
│   └── web/              # Nuxt 3 frontend application
├── packages/
│   ├── config/           # Shared configuration management
│   ├── shared-db/        # Database schemas and connection
│   ├── trpc/             # tRPC routers and procedures
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared UI components library
│   └── utils/            # Shared utilities
├── drizzle/              # Database migrations
└── [config files]       # Various configuration files
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Bun >= 1.0.0
- PostgreSQL

### Installation

1. **Clone/copy the skeleton**:
   ```bash
   cp -r skeleton-project my-new-app
   cd my-new-app
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other config
   ```

4. **Database setup**:
   ```bash
   # Run migrations
   bun run db:generate
   bun run db:migrate
   ```

5. **Start development servers**:
   ```bash
   # Start both API and web
   bun run dev
   
   # Or start individually
   bun run dev:api    # Backend API (port 3000)
   bun run dev:web    # Frontend (port 8010)
   ```

## 🛠️ Development Commands

```bash
# Development
bun run dev              # Start both API and web
bun run build            # Build all packages
bun run typecheck        # TypeScript checking

# Database
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio

# Code Quality
bun run lint             # Lint all packages
bun run format           # Format all code
```

## 📁 Key Files and Directories

### Root Configuration
- `package.json` - Monorepo and workspace configuration
- `turbo.json` - Turborepo build pipeline
- `tsconfig.json` - TypeScript configuration
- `biome.json` - Code formatting and linting
- `.cursorrules` - AI coding assistant rules

### Backend (`apps/api/`)
- `src/index.ts` - Server entry point
- `src/server.ts` - Hono server setup with tRPC

### Frontend (`apps/web/`)
- `nuxt.config.ts` - Nuxt configuration
- `pages/index.vue` - Home page example
- `stores/auth.ts` - Authentication store

### Packages
- `packages/config/` - Environment configuration management
- `packages/shared-db/` - Database schemas with Drizzle ORM
- `packages/trpc/` - tRPC routers and context
- `packages/types/` - Shared TypeScript types and Zod schemas
- `packages/ui/` - Vue component library
- `packages/utils/` - Utility functions

## 🔧 Customisation

### 1. Update Project Name
Replace `@my-app/` namespace in all `package.json` files:
```bash
find . -name "package.json" -exec sed -i 's/@my-app/@your-app/g' {} +
```

### 2. Update Import Aliases
Update the path aliases in `tsconfig.json` and throughout the codebase.

### 3. Add Database Tables
Add new schemas in `packages/shared-db/src/schemas/` and export them from `index.ts`.

### 4. Add tRPC Routes
Add new routers in `packages/trpc/src/routers/` and include them in the main router.

### 5. Add UI Components
Create new components in `packages/ui/src/components/` following the existing patterns.

## 🏛️ Architecture Principles

This skeleton follows these principles from the original codebase:

- **Direct over Abstract** - Simple functions over complex abstractions
- **Type Safety First** - Strict TypeScript configuration
- **Ship Fast** - Pragmatic approach focused on delivery
- **Monorepo Benefits** - Shared code and consistent tooling

## 📚 Tech Stack

- **Runtime**: Bun
- **Backend**: Hono (web server) + tRPC (API layer)
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: Nuxt 3 + Vue 3 (Composition API)
- **State**: Pinia stores
- **Styling**: TailwindCSS v4
- **Auth**: Supabase (configured but not implemented)
- **Build**: Turborepo
- **Code Quality**: Biome (ESLint + Prettier replacement)

## 🤝 Contributing

1. Follow the `.cursorrules` guidelines
2. Use TypeScript strictly
3. Write direct, simple functions
4. Add types to the `packages/types/` package
5. Update documentation as needed

## 📄 License

MIT# modern-saas-stack
