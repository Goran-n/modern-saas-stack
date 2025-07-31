# Modern SaaS Stack

A modern multi-tenant SaaS platform for document processing and business intelligence, built with TypeScript, Vue.js, and tRPC. This application demonstrates enterprise-grade patterns for building scalable, secure, and maintainable web applications.

## Purpose and Domain

Modern SaaS Stack is designed as a comprehensive document processing and business intelligence platform that serves multiple tenants through a unified interface. The platform handles document ingestion from various sources (email attachments, direct uploads, communication channels), processes them using AI-powered extraction techniques, and provides intelligent search and analysis capabilities.

The system is built around the concept of multi-tenant workspaces where organizations can securely manage their documents, configure integrations with external services, and collaborate with team members through role-based access controls.

## Technical Architecture

### Monorepo Structure

The application follows a monorepo architecture using Turborepo, providing shared tooling, consistent build processes, and efficient dependency management across multiple applications and packages.

```
modern-saas-stack/
├── apps/
│   ├── api/                    # Backend API server
│   ├── web/                    # Frontend web application
│   ├── browser-extension/      # Chrome/Firefox extension
│   └── figgy-website/         # Marketing website
├── packages/
│   ├── communication/          # Multi-channel messaging
│   ├── config/                # Environment configuration
│   ├── shared-db/             # Database schemas and connections
│   ├── trpc/                  # API layer and routers
│   ├── types/                 # Shared TypeScript definitions
│   ├── ui/                    # Component library
│   ├── utils/                 # Shared utilities
│   ├── tenant/                # Multi-tenancy logic
│   ├── supplier/              # Business entity management
│   ├── email-ingestion/       # Email processing pipeline
│   └── jobs/                  # Background job processing
└── drizzle/                   # Database migrations
```

### Core Technology Stack

#### Runtime and Server Infrastructure

**Bun Runtime**
- **Why:** Superior performance over Node.js with native TypeScript support and faster package installation
- **Where:** Primary runtime for both development and production
- **Benefits:** Built-in bundler, test runner, and package manager; significantly faster than npm/yarn

**Hono Web Framework**
- **Why:** Lightweight alternative to Express with better TypeScript support and edge runtime compatibility
- **Where:** HTTP server handling, middleware, and routing in the API layer
- **Benefits:** Faster than Express, smaller bundle size, excellent TypeScript integration, works in multiple runtimes

#### API Architecture

**tRPC (Type-safe RPC)**
- **Why:** End-to-end type safety eliminates API contract mismatches and reduces runtime errors
- **Where:** Primary API layer between frontend and backend, replacing traditional REST endpoints
- **Benefits:** Automatic type inference, excellent developer experience, eliminates need for API documentation, client-side autocompletion

**When REST is Used:**
- **Webhooks:** External services (Slack, WhatsApp, email providers) require REST endpoints
- **File proxying:** Direct file serving with proper headers and streaming
- **Health checks:** Simple HTTP endpoints for monitoring and load balancers
- **Third-party integrations:** OAuth callbacks and external API interactions

#### Database and Storage

**PostgreSQL with Drizzle ORM**
- **Why PostgreSQL:** Mature, reliable, excellent JSON support, strong consistency, advanced features like row-level security
- **Why Drizzle:** Type-safe database queries, SQL-like syntax, better performance than Prisma, migration system
- **Where:** Primary data storage for all application data
- **Benefits:** Schema-first approach, compile-time query validation, excellent TypeScript integration

**Supabase Storage**
- **Why:** Managed file storage with built-in CDN, image transformations, and security policies
- **Where:** Document storage, thumbnails, user uploads, processed files
- **Benefits:** Automatic image optimization, signed URLs for security, seamless integration with Supabase Auth
- **Alternative Consideration:** Could use AWS S3, but Supabase provides simpler setup and better integration

#### Authentication and Authorization

**Supabase Auth**
- **Why:** Production-ready authentication with social providers, email verification, and JWT handling
- **Where:** User registration, login, session management, password reset
- **Benefits:** Handles complex auth flows, social logins, email templates, security best practices
- **Integration:** JWT tokens validated in tRPC context with custom tenant-scoped authorization

**Custom Authorization Layer**
- **Why:** Multi-tenant requirements need custom permission logic beyond basic auth
- **Where:** tRPC middleware, database row-level security, API endpoint protection
- **Implementation:** Role-based access control with tenant isolation

#### Frontend Architecture

**Nuxt 3 + Vue.js 3**
- **Why Nuxt:** Full-stack Vue framework with SSR, file-based routing, and excellent developer experience
- **Why Vue 3:** Composition API provides better TypeScript support and reusability than Options API
- **Where:** Entire frontend application, admin panels, user interfaces
- **Benefits:** Server-side rendering, automatic code splitting, built-in optimization, extensive ecosystem

**Pinia State Management**
- **Why:** Official Vue state management with better TypeScript support than Vuex
- **Where:** Global application state, user authentication state, tenant context
- **Benefits:** Type-safe stores, devtools integration, composition API compatible

**TailwindCSS**
- **Why:** Utility-first CSS framework enables rapid development and consistent design
- **Where:** All component styling, responsive design, design system implementation
- **Benefits:** Smaller bundle sizes, design consistency, rapid prototyping, excellent customization

#### Background Processing

**Trigger.dev**
- **Why:** Modern alternative to traditional job queues with better observability and error handling
- **Where:** Document processing, email ingestion, AI operations, file transformations
- **Benefits:** Built-in retry logic, monitoring dashboard, serverless-friendly, excellent TypeScript support
- **Use Cases:** PDF processing, image thumbnails, email attachment extraction, supplier enrichment

#### Development and Build Tools

**Turborepo**
- **Why:** Optimized monorepo management with intelligent caching and parallel execution
- **Where:** Build orchestration, dependency management, development workflows
- **Benefits:** Faster builds through caching, better developer experience, cleaner dependency graph

**TypeScript Strict Mode**
- **Why:** Catches errors at compile time, improves code quality, enables better refactoring
- **Where:** Entire codebase with strict configuration
- **Configuration:** All strict checks enabled including `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`

**Biome (ESLint + Prettier Replacement)**
- **Why:** Single tool for linting and formatting, significantly faster than ESLint + Prettier combination
- **Where:** Code quality enforcement across all packages
- **Benefits:** 10x faster than ESLint, consistent formatting, TypeScript-first design

#### External Service Integrations

**Communication Channels:**
- **Slack API:** Multi-workspace bot integration for document queries and file sharing
- **WhatsApp Business (Twilio):** Document processing through chat interface
- **Email (Gmail/Outlook):** Automated attachment processing and invoice extraction

**AI and Processing:**
- **Portkey.ai:** LLM gateway for document extraction and business intelligence
- **Firecrawl:** Website content extraction for supplier enrichment
- **PDF.co:** PDF to image conversion for thumbnail generation

#### Why This Stack Over Alternatives

**Instead of Next.js:** Nuxt 3 provides better Vue.js integration and more opinionated structure
**Instead of Express:** Hono offers better performance and TypeScript experience
**Instead of Prisma:** Drizzle provides better performance and more SQL-like queries
**Instead of REST APIs:** tRPC eliminates API contract issues and provides better developer experience
**Instead of Firebase:** Supabase offers more control and better PostgreSQL integration
**Instead of traditional job queues:** Trigger.dev provides better observability and modern developer experience

This stack prioritizes developer experience, type safety, and maintainability while providing the performance and scalability needed for a modern SaaS application.

## Business Logic and Domain Models

### Multi-Tenancy Architecture

The application implements a comprehensive multi-tenancy system where each tenant represents an independent workspace. Tenants are isolated at multiple levels:

**Data Isolation:** All database operations include tenant-scoped queries, ensuring complete data separation between organizations.

**Authentication Boundary:** Users authenticate once but access resources within specific tenant contexts, enforced through middleware and authorization checks.

**Resource Scoping:** Files, integrations, team members, and all business entities are scoped to specific tenants with cascade deletion policies.

### Document Processing Pipeline

The document processing system handles multiple ingestion sources and applies consistent processing workflows:

**Ingestion Sources:**
- Email attachments through Gmail/Outlook integration
- Direct file uploads through web interface
- WhatsApp media through Twilio webhook integration
- Slack file shares through bot integration

**Processing Workflow:**
1. File validation and metadata extraction
2. Content analysis and classification
3. AI-powered document extraction
4. Business entity recognition and linking
5. Search index population
6. Thumbnail generation for visual assets

**Storage Strategy:**
Files are stored in Supabase Storage with hierarchical path organization. Access is controlled through signed URLs with tenant-scoped permissions. Thumbnails and processed versions are generated asynchronously and cached for performance.

### Communication Channel Integration

The platform supports multiple communication channels through a unified messaging interface:

**Slack Integration:**
- Multi-workspace OAuth flow with proper scoping
- Natural language query processing
- File sharing and collaborative document review
- Workspace-specific bot configuration

**WhatsApp Business API:**
- Twilio integration for message handling
- Media processing and document extraction
- Automated response generation
- Rate limiting and quota management

**Email Processing:**
- IMAP and OAuth-based email access
- Attachment extraction and processing
- Folder filtering and sender-based rules
- Webhook integration for real-time processing

### Supplier and Business Entity Management

The system includes sophisticated business entity recognition and management:

**Supplier Enrichment:**
- Automated domain discovery from invoice data
- Website content analysis for business intelligence
- Logo fetching and branding consistency
- Company profile completion through external APIs

**Invoice Processing:**
- AI-powered data extraction from PDF and image formats
- Line item recognition and categorization
- Duplicate detection through content hashing
- Financial data validation and consistency checks

## Development Patterns and Best Practices

### Direct Function Approach

The codebase follows a pragmatic approach that favors direct functions over abstract patterns:

```typescript
// Preferred: Direct, explicit functions
export async function createInvoice(input: CreateInvoiceInput) {
  const validated = createInvoiceSchema.parse(input)
  const [invoice] = await db.insert(invoices).values(validated).returning()
  return invoice
}

// Avoided: Over-engineered abstractions
class InvoiceService {
  constructor(private repo: InvoiceRepository) {}
  async create(cmd: CreateInvoiceCommand): Promise<Result<Invoice, Error>> {}
}
```

### Type-First Development

All data structures are defined through Zod schemas that serve as the single source of truth for both runtime validation and TypeScript type generation:

```typescript
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  tenantId: z.string().uuid(),
})

export type User = z.infer<typeof userSchema>
```

### Database Query Patterns

Database operations use Drizzle ORM with direct queries rather than repository abstractions:

```typescript
export async function getUserInvoices(userId: string, tenantId: string) {
  return db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.userId, userId),
      eq(invoices.tenantId, tenantId)
    ))
    .orderBy(desc(invoices.createdAt))
}
```

### Error Handling Strategy

Error handling is explicit and contextual rather than using complex error hierarchies:

```typescript
export async function processDocument(fileId: string) {
  const file = await getFileById(fileId)
  if (!file) {
    throw new Error(`File ${fileId} not found`)
  }
  
  try {
    return await extractDocumentData(file)
  } catch (error) {
    logger.error('Document processing failed', { fileId, error })
    throw error
  }
}
```

### Authentication and Authorization

The security model implements layered authentication with tenant-scoped authorization:

**Authentication Flow:**
1. User authentication through Supabase Auth
2. JWT token validation in tRPC context
3. User identity extraction and verification
4. Tenant context establishment through headers

**Authorization Patterns:**
- Middleware-based protection for API routes
- Role-based access control within tenants
- Resource-level permissions for sensitive operations
- Audit logging for all authenticated actions

### State Management

Frontend state management uses Pinia with a clear separation between local component state and global application state:

**Global State:** User authentication, tenant context, and shared application settings
**Local State:** Component-specific data, form state, and UI interactions
**Server State:** Managed through tRPC with automatic caching and synchronization

## Configuration and Environment Management

The application uses a tiered configuration system that supports multiple deployment environments:

**Configuration Layers:**
1. Base configuration with sensible defaults
2. Environment-specific overrides
3. Runtime configuration through environment variables
4. Tenant-specific settings stored in database

**Security Considerations:**
- All secrets managed through environment variables
- Production configurations use separate key management
- Development environments use safe default values
- Configuration validation through Zod schemas

## Development Workflow

The development process emphasizes rapid iteration while maintaining code quality:

**Code Quality Gates:**
- TypeScript strict mode enforcement
- Biome formatting and linting
- Integration testing for critical paths
- Manual testing for user-facing features

**Build Process:**
- Turborepo for efficient monorepo builds
- Parallel task execution with intelligent caching
- Environment-specific build optimization
- Automated dependency analysis

**Testing Strategy:**
- Integration tests for business-critical workflows
- Type safety as primary quality assurance
- Manual testing for user experience validation
- Performance monitoring for production systems

This architecture provides a solid foundation for building scalable SaaS applications while maintaining development velocity and code maintainability. The patterns demonstrated here can be applied to similar multi-tenant applications requiring document processing, AI integration, and multi-channel communication.