# Kibly Web - Nuxt UI Pro

This is the Nuxt 3 frontend for Kibly, built with Nuxt UI Pro components.

## Features

- 🚀 Nuxt 3 with server-side rendering
- 🎨 Nuxt UI Pro components
- 🔐 Supabase authentication
- 💾 Pinia state management
- 📝 TypeScript support
- 🎯 Auto-imports for components and composables
- 🌙 Dark mode support
- 📱 Responsive design

## Setup

1. Install dependencies:
```bash
bun install
```

2. Configure environment variables in Doppler:
- `NUXT_PUBLIC_API_URL` - Backend API URL
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `NUXT_UI_PRO_LICENSE` - Nuxt UI Pro license key (for production)

3. Run development server:
```bash
bun run dev
```

## Project Structure

```
apps/web/
├── assets/          # CSS and static assets
├── components/      # Vue components
├── composables/     # Composable functions
├── layouts/         # App layouts
├── middleware/      # Route middleware
├── pages/           # File-based routing
├── plugins/         # Nuxt plugins
├── server/          # Server routes and middleware
├── stores/          # Pinia stores
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## Key Components

### Layouts
- `default.vue` - Main app layout with sidebar navigation
- `auth.vue` - Authentication pages layout

### Pages
- `/` - Dashboard
- `/auth/login` - Login page
- `/auth/signup` - Sign up page
- `/integrations` - Integration management

### Stores
- `auth` - Authentication state
- `workspace` - Workspace/tenant management

## Development

```bash
# Run dev server
bun run dev

# Type check
bun run typecheck

# Lint
bun run lint

# Build for production
bun run build

# Preview production build
bun run preview
```

## Migration Progress

### Phase 1 (Complete) ✅
- Project setup with Nuxt UI Pro
- Authentication with Supabase
- Basic layouts and navigation
- State management with Pinia
- API client setup
- Example pages

### Phase 2 (Complete) ✅
- ✅ Migrated all core pages (accounts, contacts, conversations, settings)
- ✅ Implemented WhatsApp integration UI
- ✅ Added TanStack Query for data fetching
- ✅ Created all necessary stores
- ✅ Implemented file upload functionality
- ✅ Added comprehensive error handling
- ✅ Configured Doppler for environment variables

## Features Implemented

### Core Features
- 🔐 **Authentication**: Supabase integration with auth middleware
- 🏢 **Multi-workspace**: Support for multiple workspaces/tenants
- 📊 **Dashboard**: Overview with stats and quick actions
- 💰 **Accounts**: Bank and GL account management
- 👥 **Contacts**: Supplier, customer, and employee management
- 💬 **Conversations**: WhatsApp messaging integration
- ⚙️ **Settings**: General, communications, team management

### UI Components
- 📱 Responsive layouts with Nuxt UI Pro
- 🌙 Dark mode support
- 📊 Data tables with sorting and filtering
- 📝 Forms with validation
- 📤 File upload with drag & drop
- 🔔 Toast notifications
- ⌨️ Keyboard shortcuts

### Technical Features
- 🚀 Server-side rendering
- 📦 Auto-imports
- 🔄 TanStack Query for data fetching
- 💾 Pinia state management
- 🔒 Type-safe API client
- 🌐 Doppler environment management

## Running the Application

```bash
# Navigate to the web directory
cd apps/web

# Install dependencies
bun install

# Run with Doppler (development)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Or from root directory
bun dev:web  # Run web only
bun dev:all  # Run API, web, and monitor together
```

## Next Steps

1. **Backend Integration**: Connect to actual API endpoints
2. **Real-time Features**: Implement WebSocket/SSE for live updates
3. **Advanced Features**:
   - Bulk operations
   - Import/export functionality
   - Advanced filtering and search
   - Analytics and reporting
4. **Performance Optimization**:
   - Image optimization
   - Lazy loading
   - Caching strategies
5. **Production Setup**:
   - Configure Nuxt UI Pro license
   - Set up deployment pipeline
   - Configure monitoring