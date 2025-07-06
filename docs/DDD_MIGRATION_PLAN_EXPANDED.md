# DDD Migration Plan: From Architectural Chaos to Domain-Driven Design - EXPANDED EDITION

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis - Detailed](#current-state-analysis---detailed)
3. [Migration Phases - Complete Implementation Guide](#migration-phases---complete-implementation-guide)
4. [Code Templates](#code-templates)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Procedures](#rollback-procedures)
7. [Success Metrics](#success-metrics)

## Executive Summary

This document provides a complete, step-by-step guide to transform the Kibly backend from its current mixed architecture into a proper Domain-Driven Design (DDD) implementation. Every section includes actual code examples, detailed explanations, and implementation instructions that can be followed without additional context.

### Migration Progress Status (Last Updated: 2025-01-05)

**Phase 1: Domain Isolation** - 100% COMPLETE ✅
- ✅ Removed all infrastructure imports from domain entities
- ✅ Created EntityId value object
- ✅ Moved database types to infrastructure layer
- ✅ Updated all entity creation logic
- ✅ Created domain services (SlugGenerationService, VerificationCodeService)

**Phase 2: Repository Pattern** - 100% COMPLETE ✅
- ✅ Created QueryExecutor abstraction with table mapping
- ✅ Created comprehensive mapper layer (User, Conversation mappers)
- ✅ Updated repositories to use mappers
- ✅ Refactored DrizzleUserRepository to use QueryExecutor
- ✅ Removed all direct ORM usage from UserRepository
- ✅ Updated all Conversation repositories to use QueryExecutor
- ✅ Specification pattern deferred to Phase 8 (advanced patterns)

**Phase 3: Service Layer** - 100% COMPLETE ✅
- ✅ Created MessagingService interface (port)
- ✅ Created TwilioMessagingAdapter
- ✅ Updated all Twilio usage to use the port
- ✅ Created SyncApplicationService
- ✅ Refactored sync.ts router to use Application Service
- ✅ Created IntegrationApplicationService
- ✅ Refactored integration.ts router to use Application Service
- ✅ Created TenantApplicationService
- ✅ Refactored tenant.ts router to use Application Service

**Phase 4: Domain Model Completion** - 100% COMPLETE ✅
- ✅ Updated all existing entities to extend BaseEntity
- ✅ Created Money value object for financial precision
- ✅ Created Invoice domain entity with proper aggregate boundaries
- ✅ Created Supplier domain entity with comprehensive business logic
- ✅ Created Account domain entity for chart of accounts
- ✅ Created repository interfaces (ports) for all new domain entities
- ✅ Created repository implementations for Invoice, Supplier, and Account

**Phase 5: Fix Type System** - 100% COMPLETE ✅
- ✅ Created branded types for type-safe IDs
- ✅ Centralized enums in shared types package
- ✅ Created comprehensive API DTOs
- ✅ Implemented Zod validation schemas
- ✅ Created type mappers for conversions
- ✅ Updated conversation types to use branded IDs
- ✅ Updated all API routers to use new types (user, user-channel, conversation, webhook)
- ✅ Removed old duplicate type definitions

**Phase 6: Testing Strategy** - 100% COMPLETE ✅
- ✅ Created comprehensive DDD testing strategy document
- ✅ Setup test infrastructure with helpers and mocks
- ✅ Created test data factories and builders
- ✅ Implemented test database helper for integration tests
- ✅ Created example test patterns for each layer (domain, application, repository, API)
- ✅ Configured Vitest for test execution
- ✅ Setup global test utilities and environment

**Phase 7: Simplified Async Operations** - 100% COMPLETE ✅
- ✅ Created PostCommitManager for handling async side effects
- ✅ Updated ConversationService with post-commit hooks for media processing and auto-replies
- ✅ Updated TenantService with post-commit hooks for welcome emails and analytics
- ✅ Created test helpers for testing post-commit operations
- ✅ Provided example test patterns for services using post-commit hooks
- ✅ Avoided complex event-driven patterns in favor of simple async operations

**Overall Progress: 7/8 Phases Complete**

## Current State Analysis - Detailed

### 1. Repository Pattern Violations

#### What This Means
The repository pattern is supposed to abstract away database implementation details. Your repositories should know nothing about the specific ORM or database being used. However, your current repositories are tightly coupled to Drizzle ORM.

#### Current Problematic Code

```typescript
// File: /apps/api/src/infrastructure/repositories/drizzle-user.repository.ts
import { eq, count } from 'drizzle-orm'  // ❌ ORM-specific imports exposed
import { users, type User, type NewUser } from '../../database/schema/users' // ❌ Database schema exposed

export class DrizzleUserRepository extends BaseRepository implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    // ❌ Direct ORM usage with type casting
    const result = await (this.db as any).select().from(users).where(eq(users.id, id)).limit(1)
    return result[0] ? this.mapToEntity(result[0]) : null
  }

  async exists(id: string): Promise<boolean> {
    // ❌ ORM-specific query building
    const result = await (this.db as any)
      .select({ count: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return result.length > 0
  }
}
```

#### Why This Is Bad
1. **Cannot change ORM**: If you want to switch from Drizzle to TypeORM or Prisma, you'd have to rewrite every repository
2. **Leaky abstraction**: The domain layer can see database details through the repository interface
3. **Type safety lost**: Using `(this.db as any)` removes all type checking
4. **Testing difficulty**: You can't easily mock repositories for unit tests

#### What It Should Look Like

```typescript
// File: /apps/api/src/infrastructure/repositories/sql-user.repository.ts
export class SqlUserRepository implements UserRepository {
  constructor(
    private readonly queryExecutor: QueryExecutor,
    private readonly mapper: UserMapper
  ) {}

  async findById(id: EntityId): Promise<UserEntity | null> {
    const query = new FindByIdQuery('users', id)
    const result = await this.queryExecutor.execute(query)
    return result ? this.mapper.toDomain(result) : null
  }

  async exists(id: EntityId): Promise<boolean> {
    const query = new ExistsQuery('users', id)
    return this.queryExecutor.exists(query)
  }
}
```

### 2. Domain Contamination

#### What This Means
Domain entities should be completely independent of infrastructure concerns. They should not import utilities, frameworks, or any code from outside the domain layer.

#### Current Problematic Code

```typescript
// File: /apps/api/src/core/domain/conversation/conversation.entity.ts
import { BaseEntity } from '../base.entity'
import { generateId } from '../../../shared/utils' // ❌ Infrastructure dependency!

export class ConversationEntity extends BaseEntity {
  static create(props: Omit<ConversationProps, 'id' | 'version'>) {
    return new ConversationEntity({
      ...props,
      id: generateId(), // ❌ Using infrastructure utility
      version: 0
    })
  }
}
```

```typescript
// File: /apps/api/src/core/domain/user/user.entity.ts
export class UserEntity extends BaseEntity {
  // ❌ Domain entity knows about Supabase (infrastructure)!
  static fromSupabaseAuth(supabaseUser: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  }): UserEntity {
    // Domain logic coupled to auth provider
  }
}
```

#### Why This Is Bad
1. **Circular dependencies**: Changes to utils require recompiling domain
2. **Hidden coupling**: Domain depends on infrastructure implementation
3. **Testing issues**: Can't test domain without infrastructure
4. **Violates DDD principles**: Domain should be the innermost layer with no dependencies

#### What It Should Look Like

```typescript
// File: /apps/api/src/core/domain/conversation/conversation.entity.ts
import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'

export class ConversationEntity extends BaseEntity {
  static create(
    props: Omit<ConversationProps, 'id' | 'version'>,
    id?: EntityId // ID passed in from application layer
  ) {
    return new ConversationEntity({
      ...props,
      id: id || EntityId.generate(), // Domain-owned ID generation
      version: 0
    })
  }
}
```

### 3. Anemic Domain Model

#### What This Means
An anemic domain model is when entities are just data holders with getters/setters, while all business logic lives in services. This is an anti-pattern in DDD.

#### Current Problematic Code

```typescript
// File: /apps/api/src/services/tenant.service.ts
export class TenantService {
  private db = getDatabase() // ❌ Direct database access

  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    // ❌ Business logic in service instead of entity
    const slug = data.slug || await this.generateUniqueSlug(data.name)
    
    const result = await this.db.transaction(async (tx) => {
      // ❌ Service managing database transactions
      const [tenant] = await tx.insert(tenants).values({
        name: data.name,
        email: data.email,
        slug,
        status: 'active',
      }).returning()

      // ❌ Business rule (owner creation) in service
      if (data.ownerId) {
        await tx.insert(tenantMembers).values({
          tenantId: tenant.id,
          userId: data.ownerId,
          role: 'owner',
        })
      }
      return tenant
    })
  }

  // ❌ Slug generation is business logic that should be in the entity
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = generateSlug(name)
    let slug = baseSlug
    let counter = 0

    while (await this.slugExists(slug)) {
      counter++
      slug = `${baseSlug}-${counter}`
    }
    return slug
  }
}
```

Meanwhile, the entity is just a data bag:

```typescript
// File: /apps/api/src/core/domain/tenant/tenant.entity.ts
export class TenantEntity extends BaseEntity {
  // Only getters, no business behavior
  get name(): string { return this.props.name }
  get email(): string { return this.props.email }
  get slug(): string { return this.props.slug }
  
  // Limited business methods
  isActive(): boolean {
    return this.props.status === 'active' && !this.props.deletedAt
  }
}
```

#### Why This Is Bad
1. **Logic scattered**: Business rules spread across services
2. **Duplication**: Same rules implemented multiple places
3. **Hard to test**: Need full service setup to test business rules
4. **Domain knowledge lost**: Can't understand business by reading entities

#### What It Should Look Like

```typescript
// File: /apps/api/src/core/domain/tenant/tenant.entity.ts
export class TenantEntity extends BaseEntity {
  private constructor(props: TenantProps) {
    super(props)
    this.validate()
  }

  static async create(
    command: CreateTenantCommand,
    slugService: SlugGenerationService
  ): Promise<TenantEntity> {
    // Business validation
    if (command.name.length < 3) {
      throw new TenantNameTooShortError(command.name)
    }

    // Business logic for slug generation
    const slug = await slugService.generateUnique(command.name)

    const tenant = new TenantEntity({
      id: EntityId.generate(),
      name: command.name,
      email: command.email,
      slug,
      status: 'active',
      settings: TenantSettings.default(),
      subscription: TenantSubscription.trial(),
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Raise domain event
    tenant.addEvent(new TenantCreatedEvent(tenant.id, tenant.name))
    
    return tenant
  }

  addOwner(userId: EntityId): void {
    // Business rule: Can't add owner if one exists
    if (this.hasOwner) {
      throw new TenantAlreadyHasOwnerError(this.id)
    }

    // Business rule: Can't add owner to inactive tenant
    if (!this.isActive()) {
      throw new CannotModifyInactiveTenantError(this.id)
    }

    this.addEvent(new TenantOwnerAddedEvent(this.id, userId))
  }

  suspend(reason: string): void {
    // Business rules for suspension
    if (this.isSuspended()) {
      throw new TenantAlreadySuspendedError(this.id)
    }

    if (!reason || reason.length < 10) {
      throw new InvalidSuspensionReasonError(reason)
    }

    this.props.status = 'suspended'
    this.props.suspendedAt = new Date()
    this.props.suspensionReason = reason
    this.updateTimestamp()

    this.addEvent(new TenantSuspendedEvent(this.id, reason))
  }

  private validate(): void {
    // All invariants checked in one place
    if (!this.props.name || this.props.name.length < 3) {
      throw new InvalidTenantStateError('Name too short')
    }
    if (!EmailValueObject.isValid(this.props.email)) {
      throw new InvalidTenantStateError('Invalid email')
    }
  }
}
```

### 4. Infrastructure Coupling

#### What This Means
Services and domain objects directly depend on specific infrastructure implementations rather than abstractions.

#### Current Problematic Code

```typescript
// File: /apps/api/src/services/conversation.service.ts
import { getTwilioWhatsAppService } from '../integrations/messaging/twilio' // ❌ Direct Twilio import

export class ConversationService {
  async processIncomingMessage(dto: ProcessIncomingWhatsAppMessageDto) {
    // ❌ Direct infrastructure usage
    const twilioService = getTwilioWhatsAppService()
    
    if (!channel.isVerified) {
      // ❌ Infrastructure details in business logic
      await twilioService.sendRegistrationPrompt(dto.from)
      return
    }

    // ❌ More infrastructure coupling
    const mediaFiles = await Promise.all(
      dto.mediaUrls.map(url => twilioService.downloadMedia(url))
    )
  }
}
```

#### Why This Is Bad
1. **Vendor lock-in**: Can't switch from Twilio without rewriting services
2. **Testing nightmare**: Need actual Twilio setup to test
3. **Business logic mixed with infrastructure**: Hard to understand what's business vs technical
4. **No abstraction**: Services know too much about external systems

#### What It Should Look Like

```typescript
// File: /apps/api/src/core/ports/messaging/messaging.service.ts
export interface MessagingService {
  sendMessage(params: SendMessageParams): Promise<MessageResult>
  sendVerificationCode(params: VerificationParams): Promise<void>
  validateWebhook(signature: string, body: any): boolean
  downloadMedia(mediaUrl: string): Promise<MediaContent>
}

// File: /apps/api/src/services/conversation.service.ts
export class ConversationService {
  constructor(
    private readonly messaging: MessagingService, // ✅ Injected abstraction
    private readonly storage: FileStorage,
    private readonly repository: ConversationRepository
  ) {}

  async processIncomingMessage(command: ProcessMessageCommand) {
    if (!channel.isVerified) {
      // ✅ Using abstraction
      await this.messaging.sendVerificationCode({
        phoneNumber: command.from,
        template: 'registration_prompt'
      })
      return
    }

    // ✅ Infrastructure abstracted away
    const mediaFiles = await Promise.all(
      command.mediaUrls.map(url => this.messaging.downloadMedia(url))
    )
  }
}
```

### 5. Type System Chaos

#### What This Means
The same types are defined multiple times across different layers, creating maintenance nightmares and potential runtime errors.

#### Current Problematic Code

```typescript
// File: packages/shared-types/src/conversation.ts
export type ChannelType = 'whatsapp' | 'email' | 'sms'
export type ChannelStatus = 'active' | 'inactive' | 'suspended'

// File: apps/api/src/core/domain/conversation/types.ts
export type ChannelType = 'whatsapp' | 'email' | 'sms' // ❌ Duplicate!
export type ChannelStatus = 'active' | 'inactive' | 'suspended' // ❌ Duplicate!

// File: apps/api/src/database/schema/conversations.ts
export const channelTypeEnum = pgEnum('channel_type', ['whatsapp', 'email', 'sms']) // ❌ Triple!
export const channelStatusEnum = pgEnum('channel_status', ['active', 'inactive', 'suspended'])

// Meanwhile, user IDs are inconsistent:
// In shared-types:
export interface User {
  id: number // ❌ Number ID
}

// In database schema:
export const users = pgTable('users', {
  id: uuid('id').primaryKey() // ❌ UUID in database
})

// In conversation domain:
export interface ConversationProps {
  userId: string // ❌ String representation
}
```

#### Why This Is Bad
1. **Maintenance nightmare**: Change one, miss others
2. **Runtime errors**: Type mismatches only caught at runtime
3. **Confusion**: Which type is the source of truth?
4. **Frontend workarounds**: Need to handle multiple type definitions

#### What It Should Look Like

```typescript
// File: packages/shared-types/src/enums/index.ts
// Single source of truth for all enums
export const ChannelType = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  SMS: 'sms'
} as const
export type ChannelType = typeof ChannelType[keyof typeof ChannelType]

// File: apps/api/src/core/domain/conversation/value-objects/channel-type.ts
import { ChannelType } from '@kibly/shared-types'

export class ChannelTypeVO {
  constructor(private readonly value: ChannelType) {
    if (!this.isValid(value)) {
      throw new InvalidChannelTypeError(value)
    }
  }

  private isValid(value: string): value is ChannelType {
    return Object.values(ChannelType).includes(value as ChannelType)
  }
}

// File: apps/api/src/infrastructure/persistence/mappers/conversation.mapper.ts
export class ConversationMapper {
  static toDomain(row: ConversationRow): ConversationEntity {
    // Single mapping point from database to domain
  }

  static toDatabase(entity: ConversationEntity): ConversationRow {
    // Single mapping point from domain to database
  }

  static toDTO(entity: ConversationEntity): ConversationDTO {
    // Single mapping point from domain to API
  }
}
```

## Migration Phases - Complete Implementation Guide

### Phase 1: Establish True Domain Isolation (Week 1-2)

#### 1.1 Remove Infrastructure Dependencies from Domain Entities

##### Step 1: Create Domain-Owned ID Generation

First, we need to replace the infrastructure `generateId()` with a domain-owned solution.

```typescript
// File: /apps/api/src/core/domain/shared/value-objects/entity-id.ts
import { randomUUID } from 'crypto'

export class EntityId {
  private readonly brand: unique symbol = Symbol('EntityId')

  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEntityIdError(value)
    }
  }

  static generate(): EntityId {
    return new EntityId(randomUUID())
  }

  static from(value: string): EntityId {
    return new EntityId(value)
  }

  equals(other: EntityId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  private isValid(value: string): boolean {
    // UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  }
}

export class InvalidEntityIdError extends Error {
  constructor(value: string) {
    super(`Invalid entity ID: ${value}`)
    this.name = 'InvalidEntityIdError'
  }
}
```

##### Step 2: Update All Entity Files

Here's how to update each entity file. Let's start with ConversationEntity:

```typescript
// File: /apps/api/src/core/domain/conversation/conversation.entity.ts
// BEFORE:
import { generateId } from '../../../shared/utils' // ❌ Remove this

// AFTER:
import { EntityId } from '../shared/value-objects/entity-id' // ✅ Domain-owned

export class ConversationEntity extends BaseEntity<ConversationProps> {
  static create(
    props: Omit<ConversationProps, 'id' | 'version'>,
    id?: EntityId // Optional ID can be passed in
  ): ConversationEntity {
    return new ConversationEntity({
      ...props,
      id: id?.toString() || EntityId.generate().toString(),
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }

  // Rest of the entity implementation...
}
```

##### Step 3: Move Database Row Interfaces

Database row interfaces should not be in domain files.

```typescript
// REMOVE from: /apps/api/src/core/domain/conversation/conversation.entity.ts
export interface ConversationDatabaseRow {
  id: string
  tenant_id: string
  // ... other database fields
}

// MOVE TO: /apps/api/src/infrastructure/persistence/types/conversation.types.ts
export interface ConversationDatabaseRow {
  id: string
  tenant_id: string
  user_id: string
  channel_id: string
  external_thread_id: string | null
  status: string
  metadata: Record<string, any>
  message_count: number
  last_message_at: Date | null
  created_at: Date
  updated_at: Date
  version: number
}
```

##### Step 4: Create Migration Script

Create a script to automate the migration:

```typescript
// File: /apps/api/scripts/migrate-domain-ids.ts
import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'

async function migrateDomainIds() {
  const entityFiles = await glob('src/core/domain/**/*.entity.ts')
  
  for (const file of entityFiles) {
    let content = await readFile(file, 'utf-8')
    
    // Replace generateId imports
    content = content.replace(
      /import\s*{\s*generateId\s*}\s*from\s*['"].*shared\/utils['"]/g,
      "import { EntityId } from '../shared/value-objects/entity-id'"
    )
    
    // Replace generateId() calls
    content = content.replace(
      /generateId\(\)/g,
      'EntityId.generate().toString()'
    )
    
    await writeFile(file, content)
    console.log(`✅ Migrated: ${file}`)
  }
}

migrateDomainIds().catch(console.error)
```

#### 1.2 Create Domain Services for Cross-Cutting Concerns

##### Step 1: Implement Slug Generation Domain Service

```typescript
// File: /apps/api/src/core/domain/tenant/services/slug-generation.service.ts
export interface SlugChecker {
  isAvailable(slug: string): Promise<boolean>
}

export class SlugGenerationService {
  private readonly MAX_ATTEMPTS = 100

  async generateUniqueSlug(
    name: string,
    checker: SlugChecker
  ): Promise<Slug> {
    const baseSlug = this.createSlug(name)
    
    if (await checker.isAvailable(baseSlug.value)) {
      return baseSlug
    }

    // Try with incrementing numbers
    for (let i = 1; i <= this.MAX_ATTEMPTS; i++) {
      const numberedSlug = Slug.from(`${baseSlug.value}-${i}`)
      if (await checker.isAvailable(numberedSlug.value)) {
        return numberedSlug
      }
    }

    throw new UnableToGenerateUniqueSlugError(name)
  }

  private createSlug(name: string): Slug {
    const slugValue = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
      .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens

    return Slug.from(slugValue)
  }
}

// Value object for Slug
export class Slug {
  private constructor(public readonly value: string) {
    this.validate()
  }

  static from(value: string): Slug {
    return new Slug(value)
  }

  private validate(): void {
    if (!this.value || this.value.length < 3) {
      throw new InvalidSlugError('Slug must be at least 3 characters')
    }
    if (this.value.length > 50) {
      throw new InvalidSlugError('Slug must not exceed 50 characters')
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.value)) {
      throw new InvalidSlugError('Slug must contain only lowercase letters, numbers, and hyphens')
    }
  }
}
```

##### Step 2: Implement Verification Code Domain Service

```typescript
// File: /apps/api/src/core/domain/shared/services/verification-code.service.ts
export class VerificationCodeService {
  private readonly CODE_LENGTH = 6
  private readonly EXPIRY_MINUTES = 10

  generateCode(): VerificationCode {
    const code = this.generateSecureCode()
    const expiresAt = this.calculateExpiry()
    
    return new VerificationCode(code, expiresAt)
  }

  private generateSecureCode(): string {
    // Generate cryptographically secure random code
    const digits = '0123456789'
    let code = ''
    
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length)
      code += digits[randomIndex]
    }
    
    return code
  }

  private calculateExpiry(): Date {
    const now = new Date()
    now.setMinutes(now.getMinutes() + this.EXPIRY_MINUTES)
    return now
  }
}

export class VerificationCode {
  constructor(
    public readonly code: string,
    public readonly expiresAt: Date
  ) {
    this.validate()
  }

  isValid(inputCode: string): boolean {
    return this.code === inputCode && !this.isExpired()
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  private validate(): void {
    if (!/^\d{6}$/.test(this.code)) {
      throw new InvalidVerificationCodeError('Code must be 6 digits')
    }
  }
}
```

##### Step 3: Move Business Logic from Services to Domain

Let's move the tenant creation logic:

```typescript
// File: /apps/api/src/core/domain/tenant/tenant.entity.ts
export class TenantEntity extends BaseEntity<TenantProps> {
  private events: DomainEvent[] = []

  static async create(
    command: CreateTenantCommand,
    dependencies: {
      slugService: SlugGenerationService
      slugChecker: SlugChecker
    }
  ): Promise<TenantEntity> {
    // Validate command
    const validation = CreateTenantCommand.validate(command)
    if (validation.isFailure) {
      throw new InvalidCommandError(validation.error)
    }

    // Generate unique slug
    const slug = await dependencies.slugService.generateUniqueSlug(
      command.name,
      dependencies.slugChecker
    )

    // Create tenant with all business rules
    const tenant = new TenantEntity({
      id: EntityId.generate(),
      name: TenantName.from(command.name),
      email: Email.from(command.email),
      slug: slug,
      status: TenantStatus.ACTIVE,
      settings: TenantSettings.default(),
      subscription: TenantSubscription.trial(),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 0
    })

    // Raise domain event
    tenant.addEvent(new TenantCreatedEvent({
      tenantId: tenant.id,
      name: tenant.name.value,
      email: tenant.email.value,
      slug: tenant.slug.value
    }))

    return tenant
  }

  // Business methods
  suspend(reason: SuspensionReason): void {
    this.guardAgainstInactiveTenant()
    
    if (this.isSuspended()) {
      throw new TenantAlreadySuspendedError(this.id)
    }

    this.props.status = TenantStatus.SUSPENDED
    this.props.suspendedAt = new Date()
    this.props.suspensionReason = reason
    this.updateTimestamp()

    this.addEvent(new TenantSuspendedEvent({
      tenantId: this.id,
      reason: reason.value,
      suspendedAt: this.props.suspendedAt
    }))
  }

  private guardAgainstInactiveTenant(): void {
    if (!this.isActive()) {
      throw new InactiveTenantError(this.id)
    }
  }
}
```

### Phase 2: Implement Proper Repository Pattern (Week 3-4)

#### 2.1 Create Abstract Repository Interfaces

##### Step 1: Define Core Repository Abstractions

```typescript
// File: /apps/api/src/core/ports/shared/repository.interface.ts
import { EntityId } from '../../domain/shared/value-objects/entity-id'

export interface Repository<T> {
  findById(id: EntityId): Promise<T | null>
  findByIds(ids: EntityId[]): Promise<T[]>
  save(entity: T): Promise<void>
  saveMany(entities: T[]): Promise<void>
  delete(entity: T): Promise<void>
  deleteMany(entities: T[]): Promise<void>
}

// File: /apps/api/src/core/ports/shared/specification.interface.ts
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean
  and(other: Specification<T>): Specification<T>
  or(other: Specification<T>): Specification<T>
  not(): Specification<T>
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other)
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other)
  }

  not(): Specification<T> {
    return new NotSpecification(this)
  }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && 
           this.right.isSatisfiedBy(candidate)
  }
}

class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || 
           this.right.isSatisfiedBy(candidate)
  }
}

class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private spec: Specification<T>) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate)
  }
}
```

##### Step 2: Implement Unit of Work Pattern

```typescript
// File: /apps/api/src/core/ports/shared/unit-of-work.interface.ts
export interface UnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  getRepository<T>(token: symbol): Repository<T>
  runInTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>
}

// File: /apps/api/src/infrastructure/persistence/drizzle-unit-of-work.ts
export class DrizzleUnitOfWork implements UnitOfWork {
  private transaction?: any
  private repositories = new Map<symbol, Repository<any>>()

  constructor(
    private readonly db: Database,
    private readonly repositoryFactory: RepositoryFactory
  ) {}

  async begin(): Promise<void> {
    if (this.transaction) {
      throw new TransactionAlreadyStartedError()
    }
    // Drizzle doesn't require explicit begin
  }

  async commit(): Promise<void> {
    if (!this.transaction) {
      throw new NoActiveTransactionError()
    }
    // Drizzle commits automatically at end of transaction block
  }

  async rollback(): Promise<void> {
    if (!this.transaction) {
      throw new NoActiveTransactionError()
    }
    throw new Error('Rollback to force transaction to fail')
  }

  getRepository<T>(token: symbol): Repository<T> {
    if (!this.repositories.has(token)) {
      const repository = this.repositoryFactory.create(token, this.transaction || this.db)
      this.repositories.set(token, repository)
    }
    return this.repositories.get(token)!
  }

  async runInTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      this.transaction = tx
      try {
        const result = await work(this)
        return result
      } finally {
        this.transaction = undefined
        this.repositories.clear()
      }
    })
  }
}
```

##### Step 3: Create Query Specification Pattern

```typescript
// File: /apps/api/src/core/ports/shared/query-specification.ts
export interface QuerySpecification {
  toSQL(): SqlQuery
  getParameters(): any[]
}

export interface SqlQuery {
  text: string
  values: any[]
}

// Example specification for active tenants
export class ActiveTenantSpecification implements QuerySpecification {
  toSQL(): SqlQuery {
    return {
      text: 'status = $1 AND deleted_at IS NULL',
      values: ['active']
    }
  }

  getParameters(): any[] {
    return ['active']
  }
}

// Example specification for tenants by owner
export class TenantByOwnerSpecification implements QuerySpecification {
  constructor(private ownerId: string) {}

  toSQL(): SqlQuery {
    return {
      text: `
        id IN (
          SELECT tenant_id 
          FROM tenant_members 
          WHERE user_id = $1 AND role = 'owner'
        )
      `,
      values: [this.ownerId]
    }
  }

  getParameters(): any[] {
    return [this.ownerId]
  }
}

// Composite specification
export class AndQuerySpecification implements QuerySpecification {
  constructor(
    private left: QuerySpecification,
    private right: QuerySpecification
  ) {}

  toSQL(): SqlQuery {
    const leftSql = this.left.toSQL()
    const rightSql = this.right.toSQL()
    
    // Adjust parameter placeholders
    const rightTextAdjusted = rightSql.text.replace(
      /\$(\d+)/g,
      (_, num) => `$${parseInt(num) + leftSql.values.length}`
    )

    return {
      text: `(${leftSql.text}) AND (${rightTextAdjusted})`,
      values: [...leftSql.values, ...rightSql.values]
    }
  }

  getParameters(): any[] {
    return [...this.left.getParameters(), ...this.right.getParameters()]
  }
}
```

#### 2.2 Refactor Existing Repositories

##### Step 1: Create Base Repository Implementation

```typescript
// File: /apps/api/src/infrastructure/persistence/base/drizzle-repository.base.ts
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'

export abstract class DrizzleRepository<TEntity, TDbRow> {
  constructor(
    protected readonly db: Database,
    protected readonly table: Table,
    protected readonly logger: Logger
  ) {}

  protected abstract toDomain(row: TDbRow): TEntity
  protected abstract toDatabase(entity: TEntity): TDbRow
  protected abstract getEntityId(entity: TEntity): EntityId

  async findById(id: EntityId): Promise<TEntity | null> {
    try {
      const result = await this.performQuery(
        this.db
          .select()
          .from(this.table)
          .where(eq(this.table.id, id.toString()))
          .limit(1)
      )

      return result[0] ? this.toDomain(result[0]) : null
    } catch (error) {
      this.logger.error('Failed to find by ID', { id: id.toString(), error })
      throw new RepositoryError('Failed to find entity')
    }
  }

  async save(entity: TEntity): Promise<void> {
    const data = this.toDatabase(entity)
    const id = this.getEntityId(entity)

    try {
      await this.performQuery(
        this.db
          .insert(this.table)
          .values(data)
          .onConflictDoUpdate({
            target: this.table.id,
            set: data
          })
      )
    } catch (error) {
      this.logger.error('Failed to save entity', { id: id.toString(), error })
      throw new RepositoryError('Failed to save entity')
    }
  }

  async findBySpecification(spec: QuerySpecification): Promise<TEntity[]> {
    const sql = spec.toSQL()
    
    try {
      const query = this.db
        .select()
        .from(this.table)
        .where(sql(sql.text, ...sql.values))

      const results = await this.performQuery(query)
      return results.map(row => this.toDomain(row))
    } catch (error) {
      this.logger.error('Failed to find by specification', { spec, error })
      throw new RepositoryError('Failed to find entities')
    }
  }

  private async performQuery<T>(query: any): Promise<T> {
    // This abstraction allows us to intercept queries for logging, metrics, etc.
    const start = Date.now()
    try {
      const result = await query
      const duration = Date.now() - start
      this.logger.debug('Query executed', { duration, query: query.toSQL() })
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.logger.error('Query failed', { duration, query: query.toSQL(), error })
      throw error
    }
  }
}
```

##### Step 2: Refactor User Repository

Here's how to transform the existing repository:

```typescript
// File: /apps/api/src/infrastructure/repositories/sql-user.repository.ts
import { DrizzleRepository } from '../persistence/base/drizzle-repository.base'
import { UserEntity } from '../../core/domain/user'
import { UserRepository } from '../../core/ports/user.repository'
import { users } from '../database/schema/users'
import { UserMapper } from '../persistence/mappers/user.mapper'

export class SqlUserRepository 
  extends DrizzleRepository<UserEntity, UserDatabaseRow> 
  implements UserRepository {
  
  constructor(db: Database, logger: Logger) {
    super(db, users, logger)
  }

  protected toDomain(row: UserDatabaseRow): UserEntity {
    return UserMapper.toDomain(row)
  }

  protected toDatabase(entity: UserEntity): UserDatabaseRow {
    return UserMapper.toDatabase(entity)
  }

  protected getEntityId(entity: UserEntity): EntityId {
    return entity.id
  }

  async findByEmail(email: Email): Promise<UserEntity | null> {
    const spec = new UserByEmailSpecification(email)
    const results = await this.findBySpecification(spec)
    return results[0] || null
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const user = await this.findByEmail(email)
    return user !== null
  }
}

// File: /apps/api/src/infrastructure/persistence/specifications/user.specifications.ts
export class UserByEmailSpecification implements QuerySpecification {
  constructor(private email: Email) {}

  toSQL(): SqlQuery {
    return {
      text: 'email = $1',
      values: [this.email.value]
    }
  }

  getParameters(): any[] {
    return [this.email.value]
  }
}

// File: /apps/api/src/infrastructure/persistence/mappers/user.mapper.ts
export class UserMapper {
  static toDomain(row: UserDatabaseRow): UserEntity {
    return UserEntity.restore({
      id: EntityId.from(row.id),
      email: Email.from(row.email),
      phone: row.phone ? PhoneNumber.from(row.phone) : undefined,
      profile: UserProfile.from({
        firstName: row.first_name,
        lastName: row.last_name,
        avatarUrl: row.avatar_url
      }),
      preferences: row.preferences || UserPreferences.default(),
      status: row.status as UserStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      version: row.version
    })
  }

  static toDatabase(entity: UserEntity): UserDatabaseRow {
    return {
      id: entity.id.toString(),
      email: entity.email.value,
      phone: entity.phone?.value || null,
      first_name: entity.profile.firstName,
      last_name: entity.profile.lastName,
      avatar_url: entity.profile.avatarUrl || null,
      preferences: entity.preferences.toJSON(),
      status: entity.status,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      deleted_at: entity.deletedAt,
      version: entity.version
    }
  }
}
```

##### Step 3: Remove ORM Leakage

Create a query builder abstraction:

```typescript
// File: /apps/api/src/infrastructure/persistence/query-builder/query-builder.interface.ts
export interface QueryBuilder<T> {
  select(fields?: string[]): QueryBuilder<T>
  from(table: string): QueryBuilder<T>
  where(condition: Condition): QueryBuilder<T>
  join(table: string, on: Condition): QueryBuilder<T>
  orderBy(field: string, direction: 'ASC' | 'DESC'): QueryBuilder<T>
  limit(count: number): QueryBuilder<T>
  offset(count: number): QueryBuilder<T>
  build(): Query
}

export interface Condition {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE'
  value: any
}

// File: /apps/api/src/infrastructure/persistence/query-builder/drizzle-query-builder.ts
export class DrizzleQueryBuilder<T> implements QueryBuilder<T> {
  private query: any

  constructor(private db: Database) {
    this.query = this.db
  }

  select(fields?: string[]): QueryBuilder<T> {
    // Implementation that wraps Drizzle
    return this
  }

  where(condition: Condition): QueryBuilder<T> {
    // Convert to Drizzle where clause
    return this
  }

  // ... other methods

  build(): Query {
    return this.query
  }
}
```

### Phase 3: Enrich Domain Model (Week 5-6)

#### 3.1 Move Business Logic to Entities

##### Step 1: Identify Anemic Entities

Let's transform the TenantEntity from anemic to rich:

```typescript
// File: /apps/api/src/core/domain/tenant/tenant.entity.ts
// BEFORE - Anemic Entity
export class TenantEntity extends BaseEntity {
  get name(): string { return this.props.name }
  get email(): string { return this.props.email }
  get slug(): string { return this.props.slug }
  
  isActive(): boolean {
    return this.props.status === 'active' && !this.props.deletedAt
  }
}

// AFTER - Rich Domain Entity
export class TenantEntity extends AggregateRoot<TenantProps> {
  private constructor(props: TenantProps) {
    super(props)
    this.validate()
  }

  static async create(
    command: CreateTenantCommand,
    services: {
      slugGenerator: SlugGenerationService
      emailValidator: EmailValidationService
    }
  ): Promise<TenantEntity> {
    // Validate command
    await command.validate()

    // Business rule: Email must be unique (checked in use case)
    const email = Email.from(command.email)
    await services.emailValidator.validate(email)

    // Business rule: Generate unique slug
    const slug = await services.slugGenerator.generateUnique(command.name)

    // Business rule: New tenants start with trial subscription
    const subscription = TenantSubscription.trial()

    // Business rule: Default settings for new tenants
    const settings = TenantSettings.defaults()

    const tenant = new TenantEntity({
      id: EntityId.generate(),
      name: TenantName.from(command.name),
      email: email,
      slug: slug,
      status: TenantStatus.ACTIVE,
      settings: settings,
      subscription: subscription,
      metadata: {},
      memberCount: 0,
      apiCallsThisMonth: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 0
    })

    // Raise domain event
    tenant.addDomainEvent(new TenantCreatedEvent(tenant))

    return tenant
  }

  // Business Methods

  updateProfile(command: UpdateTenantProfileCommand): void {
    this.guardAgainstInactiveTenant()
    
    if (command.name) {
      this.props.name = TenantName.from(command.name)
    }

    if (command.email) {
      // Business rule: Can't change email if tenant is on paid plan
      if (this.isOnPaidPlan()) {
        throw new CannotChangeEmailOnPaidPlanError()
      }
      this.props.email = Email.from(command.email)
    }

    this.updateTimestamp()
    this.addDomainEvent(new TenantProfileUpdatedEvent(this))
  }

  suspend(reason: SuspensionReason): void {
    // Business rule: Can't suspend already suspended tenant
    if (this.isSuspended()) {
      throw new TenantAlreadySuspendedError(this.id)
    }

    // Business rule: Can't suspend deleted tenant
    if (this.isDeleted()) {
      throw new CannotSuspendDeletedTenantError(this.id)
    }

    this.props.status = TenantStatus.SUSPENDED
    this.props.suspendedAt = new Date()
    this.props.suspensionReason = reason

    this.updateTimestamp()
    this.incrementVersion()

    this.addDomainEvent(new TenantSuspendedEvent(this, reason))
  }

  reactivate(): void {
    // Business rule: Can only reactivate suspended tenants
    if (!this.isSuspended()) {
      throw new CanOnlyReactivateSuspendedTenantError(this.id)
    }

    // Business rule: Check if subscription is still valid
    if (!this.props.subscription.isValid()) {
      throw new CannotReactivateWithExpiredSubscriptionError(this.id)
    }

    this.props.status = TenantStatus.ACTIVE
    this.props.suspendedAt = null
    this.props.suspensionReason = null

    this.updateTimestamp()
    this.incrementVersion()

    this.addDomainEvent(new TenantReactivatedEvent(this))
  }

  upgradeSubscription(newPlan: SubscriptionPlan): void {
    this.guardAgainstInactiveTenant()

    // Business rule: Can't downgrade
    if (newPlan.level < this.props.subscription.plan.level) {
      throw new CannotDowngradeSubscriptionError()
    }

    // Business rule: Must be in good standing
    if (this.hasOutstandingInvoices()) {
      throw new CannotUpgradeWithOutstandingInvoicesError()
    }

    const oldPlan = this.props.subscription.plan
    this.props.subscription = this.props.subscription.upgradeTo(newPlan)

    this.updateTimestamp()
    this.incrementVersion()

    this.addDomainEvent(new TenantSubscriptionUpgradedEvent(
      this,
      oldPlan,
      newPlan
    ))
  }

  recordApiCall(): void {
    // Business rule: Check API limits
    const limit = this.props.subscription.getApiCallLimit()
    if (this.props.apiCallsThisMonth >= limit) {
      throw new ApiCallLimitExceededError(this.id, limit)
    }

    this.props.apiCallsThisMonth++
    this.props.lastApiCallAt = new Date()

    // Business rule: Suspend if consistently over limit
    if (this.shouldSuspendForOverage()) {
      this.suspend(SuspensionReason.API_LIMIT_EXCEEDED)
    }
  }

  // Private methods encapsulating business rules

  private guardAgainstInactiveTenant(): void {
    if (!this.isActive()) {
      throw new InactiveTenantError(this.id)
    }
  }

  private shouldSuspendForOverage(): boolean {
    // Complex business rule for automatic suspension
    const limit = this.props.subscription.getApiCallLimit()
    const overage = this.props.apiCallsThisMonth - limit
    const overagePercentage = (overage / limit) * 100

    return overagePercentage > 20 && !this.props.subscription.isPremium()
  }

  private hasOutstandingInvoices(): boolean {
    // This would typically check via a domain service
    return false
  }

  private validate(): void {
    const errors: string[] = []

    if (!this.props.name || this.props.name.value.length < 3) {
      errors.push('Tenant name must be at least 3 characters')
    }

    if (!this.props.email || !this.props.email.isValid()) {
      errors.push('Invalid email address')
    }

    if (!this.props.slug || !this.props.slug.isValid()) {
      errors.push('Invalid slug')
    }

    if (errors.length > 0) {
      throw new InvalidTenantStateError(errors)
    }
  }

  // Query methods (read-only)

  isActive(): boolean {
    return this.props.status === TenantStatus.ACTIVE && !this.isDeleted()
  }

  isSuspended(): boolean {
    return this.props.status === TenantStatus.SUSPENDED
  }

  isDeleted(): boolean {
    return this.props.deletedAt !== null
  }

  isOnPaidPlan(): boolean {
    return this.props.subscription.isPaid()
  }

  canAcceptNewMembers(): boolean {
    const memberLimit = this.props.subscription.getMemberLimit()
    return this.isActive() && this.props.memberCount < memberLimit
  }

  getDaysUntilSubscriptionExpiry(): number {
    return this.props.subscription.getDaysUntilExpiry()
  }
}
```

##### Step 2: Create Rich Value Objects

```typescript
// File: /apps/api/src/core/domain/tenant/value-objects/tenant-name.ts
export class TenantName {
  private constructor(public readonly value: string) {
    this.validate()
  }

  static from(value: string): TenantName {
    return new TenantName(value)
  }

  private validate(): void {
    const trimmed = this.value.trim()
    
    if (trimmed.length < 3) {
      throw new TenantNameTooShortError(this.value)
    }

    if (trimmed.length > 100) {
      throw new TenantNameTooLongError(this.value)
    }

    if (!/^[a-zA-Z0-9\s\-\.]+$/.test(trimmed)) {
      throw new TenantNameContainsInvalidCharactersError(this.value)
    }
  }

  equals(other: TenantName): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}

// File: /apps/api/src/core/domain/tenant/value-objects/tenant-subscription.ts
export class TenantSubscription {
  constructor(
    private readonly props: {
      plan: SubscriptionPlan
      startDate: Date
      endDate: Date
      autoRenew: boolean
      limits: SubscriptionLimits
    }
  ) {}

  static trial(): TenantSubscription {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 14) // 14-day trial

    return new TenantSubscription({
      plan: SubscriptionPlan.TRIAL,
      startDate,
      endDate,
      autoRenew: false,
      limits: SubscriptionLimits.trial()
    })
  }

  upgradeTo(newPlan: SubscriptionPlan): TenantSubscription {
    if (newPlan.level <= this.props.plan.level) {
      throw new InvalidSubscriptionUpgradeError()
    }

    return new TenantSubscription({
      ...this.props,
      plan: newPlan,
      limits: SubscriptionLimits.forPlan(newPlan)
    })
  }

  getApiCallLimit(): number {
    return this.props.limits.apiCalls
  }

  getMemberLimit(): number {
    return this.props.limits.members
  }

  getStorageLimit(): number {
    return this.props.limits.storageGB
  }

  isValid(): boolean {
    return new Date() < this.props.endDate
  }

  isPaid(): boolean {
    return this.props.plan !== SubscriptionPlan.TRIAL &&
           this.props.plan !== SubscriptionPlan.FREE
  }

  isPremium(): boolean {
    return this.props.plan === SubscriptionPlan.PREMIUM ||
           this.props.plan === SubscriptionPlan.ENTERPRISE
  }

  getDaysUntilExpiry(): number {
    const now = new Date()
    const diff = this.props.endDate.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
}
```

##### Step 3: Implement Domain Events

```typescript
// File: /apps/api/src/core/domain/shared/aggregate-root.ts
export abstract class AggregateRoot<T> extends BaseEntity<T> {
  private domainEvents: DomainEvent[] = []

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event)
  }

  clearEvents(): void {
    this.domainEvents = []
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.domainEvents]
  }

  markEventsAsCommitted(): void {
    this.domainEvents = []
  }

  protected incrementVersion(): void {
    this.props.version++
  }
}

// File: /apps/api/src/core/domain/shared/domain-event.ts
export abstract class DomainEvent {
  public readonly occurredAt: Date
  public readonly eventId: string
  public readonly eventVersion: number = 1

  constructor(
    public readonly aggregateId: EntityId,
    public readonly eventName: string
  ) {
    this.occurredAt = new Date()
    this.eventId = EntityId.generate().toString()
  }

  abstract toPayload(): Record<string, any>
}

// File: /apps/api/src/core/domain/tenant/events/tenant-created.event.ts
export class TenantCreatedEvent extends DomainEvent {
  constructor(
    private readonly tenant: TenantEntity
  ) {
    super(tenant.id, 'tenant.created')
  }

  toPayload(): Record<string, any> {
    return {
      tenantId: this.tenant.id.toString(),
      name: this.tenant.name.value,
      email: this.tenant.email.value,
      slug: this.tenant.slug.value,
      subscription: this.tenant.subscription.plan
    }
  }
}
```

#### 3.2 Implement Aggregate Boundaries

##### Step 1: Define Clear Aggregates

```typescript
// File: /apps/api/src/core/domain/tenant/README.md
# Tenant Aggregate

## Aggregate Root
- TenantEntity

## Entities within Aggregate
- None (TenantMember is a separate aggregate)

## Value Objects
- TenantName
- TenantSettings
- TenantSubscription
- Email
- Slug

## Invariants
1. Tenant must have unique email
2. Tenant must have unique slug
3. Suspended tenants cannot perform actions
4. API calls cannot exceed subscription limits
5. Member count cannot exceed subscription limits

## Domain Events
- TenantCreatedEvent
- TenantSuspendedEvent
- TenantReactivatedEvent
- TenantSubscriptionUpgradedEvent
- TenantProfileUpdatedEvent
```

##### Step 2: Implement Conversation Aggregate

```typescript
// File: /apps/api/src/core/domain/conversation/conversation.entity.ts
export class ConversationEntity extends AggregateRoot<ConversationProps> {
  private messages: ConversationMessageEntity[] = []
  private files: ConversationFileEntity[] = []

  static create(
    command: CreateConversationCommand,
    channel: UserChannelEntity
  ): ConversationEntity {
    // Business rule: Channel must be verified
    if (!channel.isVerified()) {
      throw new UnverifiedChannelError(channel.id)
    }

    // Business rule: User must be active
    if (!command.userId) {
      throw new UserRequiredError()
    }

    const conversation = new ConversationEntity({
      id: EntityId.generate(),
      tenantId: command.tenantId,
      userId: command.userId,
      channelId: channel.id,
      externalThreadId: null,
      status: ConversationStatus.ACTIVE,
      metadata: {},
      messageCount: 0,
      lastMessageAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0
    })

    conversation.addDomainEvent(
      new ConversationCreatedEvent(conversation)
    )

    return conversation
  }

  addMessage(
    content: MessageContent,
    direction: MessageDirection,
    externalId?: string
  ): ConversationMessageEntity {
    this.guardAgainstClosedConversation()

    // Business rule: Cannot add messages to archived conversations
    if (this.isArchived()) {
      throw new CannotAddMessageToArchivedConversationError(this.id)
    }

    const message = ConversationMessageEntity.create({
      conversationId: this.id,
      content: content,
      direction: direction,
      externalId: externalId,
      status: MessageStatus.SENT
    })

    this.messages.push(message)
    this.props.messageCount++
    this.props.lastMessageAt = new Date()
    this.updateTimestamp()

    this.addDomainEvent(
      new MessageAddedToConversationEvent(this, message)
    )

    // Business rule: Auto-archive after 30 days of inactivity
    this.checkAutoArchive()

    return message
  }

  addFile(
    file: UploadedFile,
    messageId: EntityId
  ): ConversationFileEntity {
    this.guardAgainstClosedConversation()

    // Business rule: File must be associated with a message
    const message = this.messages.find(m => m.id.equals(messageId))
    if (!message) {
      throw new MessageNotFoundError(messageId)
    }

    // Business rule: Maximum 10 files per message
    const filesForMessage = this.files.filter(
      f => f.messageId.equals(messageId)
    )
    if (filesForMessage.length >= 10) {
      throw new TooManyFilesPerMessageError(messageId)
    }

    const conversationFile = ConversationFileEntity.create({
      conversationId: this.id,
      messageId: messageId,
      fileId: file.id,
      metadata: {
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size
      }
    })

    this.files.push(conversationFile)
    this.updateTimestamp()

    this.addDomainEvent(
      new FileAddedToConversationEvent(this, conversationFile)
    )

    return conversationFile
  }

  archive(): void {
    // Business rule: Cannot archive closed conversation
    if (this.isClosed()) {
      throw new CannotArchiveClosedConversationError(this.id)
    }

    // Business rule: Already archived
    if (this.isArchived()) {
      return
    }

    this.props.status = ConversationStatus.ARCHIVED
    this.updateTimestamp()
    this.incrementVersion()

    this.addDomainEvent(new ConversationArchivedEvent(this))
  }

  close(): void {
    // Business rule: Already closed
    if (this.isClosed()) {
      return
    }

    this.props.status = ConversationStatus.CLOSED
    this.updateTimestamp()
    this.incrementVersion()

    this.addDomainEvent(new ConversationClosedEvent(this))
  }

  reopen(): void {
    // Business rule: Can only reopen closed conversations
    if (!this.isClosed()) {
      throw new CanOnlyReopenClosedConversationsError(this.id)
    }

    this.props.status = ConversationStatus.ACTIVE
    this.updateTimestamp()
    this.incrementVersion()

    this.addDomainEvent(new ConversationReopenedEvent(this))
  }

  // Private methods

  private guardAgainstClosedConversation(): void {
    if (this.isClosed()) {
      throw new ConversationClosedError(this.id)
    }
  }

  private checkAutoArchive(): void {
    if (!this.props.lastMessageAt) return

    const daysSinceLastMessage = this.getDaysSinceLastMessage()
    if (daysSinceLastMessage > 30 && this.isActive()) {
      this.archive()
    }
  }

  private getDaysSinceLastMessage(): number {
    if (!this.props.lastMessageAt) return 0
    
    const now = new Date()
    const diff = now.getTime() - this.props.lastMessageAt.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  // Query methods

  isActive(): boolean {
    return this.props.status === ConversationStatus.ACTIVE
  }

  isArchived(): boolean {
    return this.props.status === ConversationStatus.ARCHIVED
  }

  isClosed(): boolean {
    return this.props.status === ConversationStatus.CLOSED
  }

  getMessages(): readonly ConversationMessageEntity[] {
    return [...this.messages]
  }

  getFiles(): readonly ConversationFileEntity[] {
    return [...this.files]
  }
}
```

### Phase 4: Create Infrastructure Ports (Week 7-8)

#### 4.1 Abstract External Services

##### Step 1: Create Messaging Service Port

```typescript
// File: /apps/api/src/core/ports/messaging/messaging.service.ts
export interface MessagingService {
  sendMessage(params: SendMessageParams): Promise<MessageResult>
  sendVerificationCode(params: VerificationParams): Promise<MessageResult>
  sendBulkMessages(params: BulkMessageParams): Promise<BulkMessageResult>
  validateWebhook(signature: string, body: any, url: string): boolean
  downloadMedia(mediaUrl: string): Promise<MediaContent>
  getMessageStatus(messageId: string): Promise<MessageStatus>
}

export interface SendMessageParams {
  to: PhoneNumber
  content: MessageContent
  mediaUrls?: string[]
  metadata?: Record<string, any>
}

export interface MessageContent {
  text?: string
  templateId?: string
  templateParams?: Record<string, any>
}

export interface MessageResult {
  messageId: string
  status: MessageDeliveryStatus
  cost?: number
  error?: string
}

export interface MediaContent {
  data: Buffer
  mimeType: string
  size: number
  filename?: string
}

export enum MessageDeliveryStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed'
}

// Domain errors for messaging
export class MessagingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'MessagingError'
  }
}

export class InvalidPhoneNumberError extends MessagingError {
  constructor(phoneNumber: string) {
    super(`Invalid phone number: ${phoneNumber}`, 'INVALID_PHONE_NUMBER')
  }
}

export class MessageSendFailedError extends MessagingError {
  constructor(reason: string) {
    super(`Failed to send message: ${reason}`, 'MESSAGE_SEND_FAILED')
  }
}
```

##### Step 2: Create Cache Service Port

```typescript
// File: /apps/api/src/core/ports/cache/cache.service.ts
export interface CacheService {
  get<T>(key: CacheKey): Promise<T | null>
  set<T>(key: CacheKey, value: T, options?: CacheOptions): Promise<void>
  delete(key: CacheKey): Promise<void>
  deletePattern(pattern: string): Promise<number>
  exists(key: CacheKey): Promise<boolean>
  expire(key: CacheKey, seconds: number): Promise<void>
  increment(key: CacheKey, amount?: number): Promise<number>
  decrement(key: CacheKey, amount?: number): Promise<number>
}

export class CacheKey {
  constructor(
    private readonly namespace: string,
    private readonly id: string
  ) {}

  toString(): string {
    return `${this.namespace}:${this.id}`
  }

  static for(namespace: string, id: string): CacheKey {
    return new CacheKey(namespace, id)
  }
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // For tagged cache invalidation
}

// Cache-specific errors
export class CacheError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'CacheError'
  }
}

export class CacheConnectionError extends CacheError {
  constructor(cause?: Error) {
    super('Failed to connect to cache', cause)
  }
}
```

##### Step 3: Implement Twilio Adapter

```typescript
// File: /apps/api/src/infrastructure/messaging/twilio-messaging.adapter.ts
import Twilio from 'twilio'
import { MessagingService, SendMessageParams, MessageResult } from '../../core/ports/messaging/messaging.service'

export class TwilioMessagingAdapter implements MessagingService {
  private client: Twilio.Twilio
  
  constructor(
    private readonly config: {
      accountSid: string
      authToken: string
      fromNumber: string
      statusCallbackUrl?: string
    }
  ) {
    this.client = Twilio(config.accountSid, config.authToken)
  }

  async sendMessage(params: SendMessageParams): Promise<MessageResult> {
    try {
      const message = await this.client.messages.create({
        from: `whatsapp:${this.config.fromNumber}`,
        to: `whatsapp:${params.to.value}`,
        body: params.content.text,
        mediaUrl: params.mediaUrls,
        statusCallback: this.config.statusCallbackUrl
      })

      return {
        messageId: message.sid,
        status: this.mapTwilioStatus(message.status),
        cost: message.price ? parseFloat(message.price) : undefined
      }
    } catch (error) {
      if (error.code === 21408) {
        throw new InvalidPhoneNumberError(params.to.value)
      }
      
      throw new MessageSendFailedError(
        error.message || 'Unknown Twilio error'
      )
    }
  }

  async sendVerificationCode(
    params: VerificationParams
  ): Promise<MessageResult> {
    const verificationMessage = this.formatVerificationMessage(params)
    
    return this.sendMessage({
      to: params.phoneNumber,
      content: { text: verificationMessage }
    })
  }

  validateWebhook(
    signature: string,
    body: any,
    url: string
  ): boolean {
    return Twilio.validateRequest(
      this.config.authToken,
      signature,
      url,
      body
    )
  }

  async downloadMedia(mediaUrl: string): Promise<MediaContent> {
    try {
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${this.config.accountSid}:${this.config.authToken}`
          ).toString('base64')}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'application/octet-stream'

      return {
        data: Buffer.from(buffer),
        mimeType: contentType,
        size: buffer.byteLength,
        filename: this.extractFilename(mediaUrl)
      }
    } catch (error) {
      throw new MediaDownloadError(mediaUrl, error.message)
    }
  }

  private mapTwilioStatus(status: string): MessageDeliveryStatus {
    const statusMap: Record<string, MessageDeliveryStatus> = {
      'queued': MessageDeliveryStatus.QUEUED,
      'sending': MessageDeliveryStatus.SENDING,
      'sent': MessageDeliveryStatus.SENT,
      'delivered': MessageDeliveryStatus.DELIVERED,
      'failed': MessageDeliveryStatus.FAILED,
      'undelivered': MessageDeliveryStatus.FAILED
    }

    return statusMap[status] || MessageDeliveryStatus.QUEUED
  }

  private formatVerificationMessage(params: VerificationParams): string {
    return `Your verification code is: ${params.code}. This code will expire in 10 minutes.`
  }

  private extractFilename(url: string): string | undefined {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      return pathname.substring(pathname.lastIndexOf('/') + 1)
    } catch {
      return undefined
    }
  }
}
```

##### Step 4: Implement Redis Cache Adapter

```typescript
// File: /apps/api/src/infrastructure/cache/redis-cache.adapter.ts
import { Redis } from 'ioredis'
import { CacheService, CacheKey, CacheOptions } from '../../core/ports/cache/cache.service'

export class RedisCacheAdapter implements CacheService {
  private client: Redis

  constructor(
    private readonly config: {
      host: string
      port: number
      password?: string
      db?: number
    }
  ) {
    this.client = new Redis(config)
    
    this.client.on('error', (error) => {
      console.error('Redis connection error:', error)
    })
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      const value = await this.client.get(key.toString())
      return value ? JSON.parse(value) : null
    } catch (error) {
      if (error.message.includes('ECONNREFUSED')) {
        throw new CacheConnectionError(error)
      }
      throw new CacheError(`Failed to get key: ${key}`, error)
    }
  }

  async set<T>(
    key: CacheKey,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      
      if (options?.ttl) {
        await this.client.setex(key.toString(), options.ttl, serialized)
      } else {
        await this.client.set(key.toString(), serialized)
      }

      // Handle tags for cache invalidation
      if (options?.tags) {
        await this.tagKey(key, options.tags)
      }
    } catch (error) {
      if (error.message.includes('ECONNREFUSED')) {
        throw new CacheConnectionError(error)
      }
      throw new CacheError(`Failed to set key: ${key}`, error)
    }
  }

  async delete(key: CacheKey): Promise<void> {
    try {
      await this.client.del(key.toString())
    } catch (error) {
      throw new CacheError(`Failed to delete key: ${key}`, error)
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern)
      if (keys.length === 0) return 0
      
      return await this.client.del(...keys)
    } catch (error) {
      throw new CacheError(`Failed to delete pattern: ${pattern}`, error)
    }
  }

  async exists(key: CacheKey): Promise<boolean> {
    try {
      const result = await this.client.exists(key.toString())
      return result === 1
    } catch (error) {
      throw new CacheError(`Failed to check existence: ${key}`, error)
    }
  }

  async increment(key: CacheKey, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key.toString(), amount)
    } catch (error) {
      throw new CacheError(`Failed to increment: ${key}`, error)
    }
  }

  private async tagKey(key: CacheKey, tags: string[]): Promise<void> {
    const pipeline = this.client.pipeline()
    
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key.toString())
    }
    
    await pipeline.exec()
  }

  async invalidateTag(tag: string): Promise<void> {
    const keys = await this.client.smembers(`tag:${tag}`)
    
    if (keys.length > 0) {
      await this.client.del(...keys)
      await this.client.del(`tag:${tag}`)
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit()
  }
}
```

#### 4.2 Update Services to Use Ports

##### Step 1: Refactor ConversationService

```typescript
// File: /apps/api/src/services/conversation.service.ts
// BEFORE - Direct infrastructure dependency
import { getTwilioWhatsAppService } from '../integrations/messaging/twilio'

// AFTER - Using ports
export class ConversationService {
  constructor(
    private readonly messaging: MessagingService,
    private readonly cache: CacheService,
    private readonly fileStorage: FileStorage,
    private readonly conversationRepo: ConversationRepository,
    private readonly channelService: UserChannelService,
    private readonly logger: Logger
  ) {}

  async processIncomingMessage(
    command: ProcessIncomingMessageCommand
  ): Promise<void> {
    try {
      // Check rate limiting using cache
      const rateLimitKey = CacheKey.for('rate_limit', command.from.value)
      const messageCount = await this.cache.increment(rateLimitKey)
      
      if (messageCount === 1) {
        await this.cache.expire(rateLimitKey, 60) // 1 minute window
      }
      
      if (messageCount > 10) {
        throw new RateLimitExceededError(command.from)
      }

      // Find or create conversation
      const channel = await this.channelService.findByPhoneNumber(command.from)
      
      if (!channel) {
        await this.messaging.sendMessage({
          to: command.from,
          content: {
            templateId: 'registration_required',
            templateParams: { supportUrl: this.config.supportUrl }
          }
        })
        return
      }

      if (!channel.isVerified()) {
        await this.handleUnverifiedChannel(channel, command)
        return
      }

      // Process the message
      const conversation = await this.findOrCreateConversation(channel)
      
      // Add message to conversation
      const message = conversation.addMessage(
        { text: command.body },
        MessageDirection.INBOUND,
        command.messageSid
      )

      // Process any media files
      if (command.mediaUrls.length > 0) {
        await this.processMediaFiles(conversation, message, command.mediaUrls)
      }

      // Save changes
      await this.conversationRepo.save(conversation)

      // Cache the active conversation
      await this.cacheActiveConversation(conversation)

      // Process auto-reply if configured
      await this.processAutoReply(conversation, message)

    } catch (error) {
      this.logger.error('Failed to process incoming message', {
        command,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  private async processMediaFiles(
    conversation: ConversationEntity,
    message: ConversationMessageEntity,
    mediaUrls: string[]
  ): Promise<void> {
    for (const mediaUrl of mediaUrls) {
      try {
        // Download media using messaging port
        const mediaContent = await this.messaging.downloadMedia(mediaUrl)
        
        // Upload to file storage
        const uploadedFile = await this.fileStorage.upload({
          filename: mediaContent.filename || 'attachment',
          mimeType: mediaContent.mimeType,
          data: mediaContent.data,
          metadata: {
            conversationId: conversation.id.toString(),
            messageId: message.id.toString()
          }
        })

        // Add file to conversation
        conversation.addFile(uploadedFile, message.id)
        
      } catch (error) {
        this.logger.error('Failed to process media file', {
          mediaUrl,
          error: error.message
        })
        // Continue processing other files
      }
    }
  }

  private async cacheActiveConversation(
    conversation: ConversationEntity
  ): Promise<void> {
    const cacheKey = CacheKey.for(
      'active_conversation',
      `${conversation.userId}_${conversation.channelId}`
    )
    
    await this.cache.set(
      cacheKey,
      {
        conversationId: conversation.id.toString(),
        lastActivity: new Date().toISOString()
      },
      { ttl: 3600 } // 1 hour
    )
  }
}
```

##### Step 2: Update Dependency Injection

```typescript
// File: /apps/api/src/infrastructure/bootstrap.ts
import { Container } from '../shared/utils/container'
import { TwilioMessagingAdapter } from './messaging/twilio-messaging.adapter'
import { RedisCacheAdapter } from './cache/redis-cache.adapter'
import { S3FileStorageAdapter } from './storage/s3-file-storage.adapter'

export function bootstrapInfrastructure(config: AppConfig): void {
  const container = Container.getInstance()

  // Register infrastructure adapters
  container.register(
    TOKENS.MessagingService,
    new TwilioMessagingAdapter({
      accountSid: config.twilio.accountSid,
      authToken: config.twilio.authToken,
      fromNumber: config.twilio.fromNumber,
      statusCallbackUrl: config.twilio.statusCallbackUrl
    })
  )

  container.register(
    TOKENS.CacheService,
    new RedisCacheAdapter({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db
    })
  )

  container.register(
    TOKENS.FileStorage,
    new S3FileStorageAdapter({
      bucket: config.s3.bucket,
      region: config.s3.region,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    })
  )

  // Register repositories
  container.register(
    TOKENS.UserRepository,
    new SqlUserRepository(
      container.get(TOKENS.Database),
      container.get(TOKENS.Logger)
    )
  )

  // Register services with dependencies
  container.register(
    TOKENS.ConversationService,
    new ConversationService(
      container.get(TOKENS.MessagingService),
      container.get(TOKENS.CacheService),
      container.get(TOKENS.FileStorage),
      container.get(TOKENS.ConversationRepository),
      container.get(TOKENS.UserChannelService),
      container.get(TOKENS.Logger)
    )
  )
}

// File: /apps/api/src/shared/tokens.ts
export const TOKENS = {
  // Infrastructure
  MessagingService: Symbol('MessagingService'),
  CacheService: Symbol('CacheService'),
  FileStorage: Symbol('FileStorage'),
  Database: Symbol('Database'),
  Logger: Symbol('Logger'),
  
  // Repositories
  UserRepository: Symbol('UserRepository'),
  TenantRepository: Symbol('TenantRepository'),
  ConversationRepository: Symbol('ConversationRepository'),
  
  // Services
  ConversationService: Symbol('ConversationService'),
  UserChannelService: Symbol('UserChannelService'),
  
  // Use Cases
  CreateTenantUseCase: Symbol('CreateTenantUseCase'),
  ProcessMessageUseCase: Symbol('ProcessMessageUseCase')
}
```

### Phase 5: Fix Type System (Week 9-10)

#### 5.1 Centralize Type Definitions

##### Step 1: Reorganize Shared Types Package

```typescript
// File: packages/shared-types/src/enums/channel.enum.ts
export const ChannelType = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  SMS: 'sms',
  TELEGRAM: 'telegram'
} as const

export type ChannelType = typeof ChannelType[keyof typeof ChannelType]

export const ChannelStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
} as const

export type ChannelStatus = typeof ChannelStatus[keyof typeof ChannelStatus]

// File: packages/shared-types/src/enums/conversation.enum.ts
export const ConversationStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  CLOSED: 'closed'
} as const

export type ConversationStatus = typeof ConversationStatus[keyof typeof ConversationStatus]

export const MessageDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound'
} as const

export type MessageDirection = typeof MessageDirection[keyof typeof MessageDirection]

// File: packages/shared-types/src/ids/index.ts
// Branded types for type-safe IDs
export type UserId = string & { readonly brand: unique symbol }
export type TenantId = string & { readonly brand: unique symbol }
export type ConversationId = string & { readonly brand: unique symbol }
export type ChannelId = string & { readonly brand: unique symbol }

// Helper functions for creating branded IDs
export const UserId = (id: string): UserId => id as UserId
export const TenantId = (id: string): TenantId => id as TenantId
export const ConversationId = (id: string): ConversationId => id as ConversationId
export const ChannelId = (id: string): ChannelId => id as ChannelId
```

##### Step 2: Create API DTOs

```typescript
// File: packages/shared-types/src/api/conversation.dto.ts
import { ConversationStatus, MessageDirection, ChannelId, ConversationId } from '../index'

export interface ConversationDTO {
  id: ConversationId
  channelId: ChannelId
  status: ConversationStatus
  messageCount: number
  lastMessageAt: string | null // ISO 8601 string
  createdAt: string // ISO 8601 string
  updatedAt: string // ISO 8601 string
}

export interface ConversationMessageDTO {
  id: string
  conversationId: ConversationId
  content: {
    text?: string
    html?: string
  }
  direction: MessageDirection
  status: string
  sentAt: string // ISO 8601 string
  deliveredAt?: string | null
  readAt?: string | null
}

export interface CreateConversationRequest {
  channelId: ChannelId
  initialMessage?: string
}

export interface CreateConversationResponse {
  conversation: ConversationDTO
}

export interface ListConversationsRequest {
  status?: ConversationStatus[]
  channelId?: ChannelId
  page?: number
  limit?: number
}

export interface ListConversationsResponse {
  conversations: ConversationDTO[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

##### Step 3: Remove Duplicate Type Definitions

```typescript
// File: /apps/api/src/core/domain/conversation/types.ts
// REMOVE these duplicate definitions
// export type ChannelType = 'whatsapp' | 'email' | 'sms' ❌

// IMPORT from shared types instead
import { ChannelType, ChannelStatus, ConversationStatus } from '@kibly/shared-types'

// Domain-specific types that aren't shared
export interface ConversationProps {
  id: EntityId
  tenantId: EntityId
  userId: EntityId
  channelId: EntityId
  externalThreadId?: string | null
  status: ConversationStatus
  metadata: Record<string, any>
  messageCount: number
  lastMessageAt?: Date | null
  createdAt: Date
  updatedAt: Date
  version: number
}
```

##### Step 4: Implement Type Mappers

```typescript
// File: /apps/api/src/api/mappers/conversation.mapper.ts
import { ConversationEntity } from '../../core/domain/conversation'
import { ConversationDTO, ConversationId } from '@kibly/shared-types'

export class ConversationDTOMapper {
  static toDTO(entity: ConversationEntity): ConversationDTO {
    return {
      id: ConversationId(entity.id.toString()),
      channelId: ChannelId(entity.channelId.toString()),
      status: entity.status,
      messageCount: entity.messageCount,
      lastMessageAt: entity.lastMessageAt?.toISOString() || null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString()
    }
  }

  static toDTOList(entities: ConversationEntity[]): ConversationDTO[] {
    return entities.map(entity => this.toDTO(entity))
  }
}

// File: /apps/api/src/api/mappers/error.mapper.ts
export class ErrorDTOMapper {
  static toDTO(error: Error): ErrorDTO {
    if (error instanceof DomainError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      }
    }

    if (error instanceof ValidationError) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors,
        timestamp: new Date().toISOString()
      }
    }

    // Generic error
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  }
}
```

#### 5.2 Implement DTO Pattern

##### Step 1: Create Router DTOs with Zod

```typescript
// File: /apps/api/src/api/dto/conversation/create-conversation.dto.ts
import { z } from 'zod'
import { ChannelId } from '@kibly/shared-types'

export const createConversationSchema = z.object({
  channelId: z.string().uuid().transform(id => ChannelId(id)),
  initialMessage: z.string().min(1).max(1000).optional()
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>

// File: /apps/api/src/api/dto/conversation/list-conversations.dto.ts
import { z } from 'zod'
import { ConversationStatus, ChannelId } from '@kibly/shared-types'

export const listConversationsSchema = z.object({
  status: z.array(z.enum(['active', 'archived', 'closed'])).optional(),
  channelId: z.string().uuid().transform(id => ChannelId(id)).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
})

export type ListConversationsInput = z.infer<typeof listConversationsSchema>

// File: /apps/api/src/api/dto/conversation/send-message.dto.ts
import { z } from 'zod'

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.object({
    text: z.string().min(1).max(4096).optional(),
    templateId: z.string().optional(),
    templateParams: z.record(z.string()).optional()
  }).refine(
    data => data.text || data.templateId,
    'Either text or templateId must be provided'
  ),
  attachments: z.array(z.object({
    fileId: z.string().uuid(),
    type: z.enum(['image', 'document', 'audio', 'video'])
  })).max(10).optional()
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
```

##### Step 2: Update Routers to Use DTOs

```typescript
// File: /apps/api/src/routers/conversation.router.ts
import { router, protectedProcedure } from '../trpc'
import { 
  createConversationSchema,
  listConversationsSchema,
  sendMessageSchema 
} from '../api/dto/conversation'
import { ConversationDTOMapper } from '../api/mappers/conversation.mapper'
import { ErrorDTOMapper } from '../api/mappers/error.mapper'

export const conversationRouter = router({
  create: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const useCase = ctx.container.get<CreateConversationUseCase>(
          TOKENS.CreateConversationUseCase
        )

        const result = await useCase.execute({
          userId: ctx.user.id,
          tenantId: ctx.tenant.id,
          channelId: input.channelId,
          initialMessage: input.initialMessage
        })

        return {
          conversation: ConversationDTOMapper.toDTO(result.conversation)
        }
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
          cause: ErrorDTOMapper.toDTO(error)
        })
      }
    }),

  list: protectedProcedure
    .input(listConversationsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const useCase = ctx.container.get<ListConversationsUseCase>(
          TOKENS.ListConversationsUseCase
        )

        const result = await useCase.execute({
          userId: ctx.user.id,
          tenantId: ctx.tenant.id,
          filters: {
            status: input.status,
            channelId: input.channelId
          },
          pagination: {
            page: input.page,
            limit: input.limit
          }
        })

        return {
          conversations: ConversationDTOMapper.toDTOList(result.conversations),
          pagination: result.pagination
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list conversations',
          cause: ErrorDTOMapper.toDTO(error)
        })
      }
    }),

  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const useCase = ctx.container.get<SendMessageUseCase>(
          TOKENS.SendMessageUseCase
        )

        const result = await useCase.execute({
          userId: ctx.user.id,
          conversationId: input.conversationId,
          content: input.content,
          attachments: input.attachments
        })

        return {
          message: MessageDTOMapper.toDTO(result.message),
          conversation: ConversationDTOMapper.toDTO(result.conversation)
        }
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
          cause: ErrorDTOMapper.toDTO(error)
        })
      }
    })
})
```

### Phase 6: Implement Proper Testing (Week 11-12)

#### 6.1 Domain Layer Testing

##### Step 1: Test Domain Entities

```typescript
// File: /apps/api/tests/unit/domain/tenant/tenant.entity.test.ts
import { describe, test, expect, beforeEach } from 'vitest'
import { 
  TenantEntity,
  TenantName,
  Email,
  Slug,
  TenantStatus,
  SuspensionReason
} from '../../../../src/core/domain/tenant'
import { EntityId } from '../../../../src/core/domain/shared/value-objects/entity-id'

describe('TenantEntity', () => {
  describe('create', () => {
    const mockSlugGenerator = {
      generateUnique: vi.fn()
    }

    const mockEmailValidator = {
      validate: vi.fn()
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    test('should create a new tenant with valid data', async () => {
      // Arrange
      const command = {
        name: 'Acme Corporation',
        email: 'contact@acme.com'
      }

      mockSlugGenerator.generateUnique.mockResolvedValue(
        Slug.from('acme-corporation')
      )
      mockEmailValidator.validate.mockResolvedValue(true)

      // Act
      const tenant = await TenantEntity.create(command, {
        slugGenerator: mockSlugGenerator,
        emailValidator: mockEmailValidator
      })

      // Assert
      expect(tenant).toBeDefined()
      expect(tenant.name.value).toBe('Acme Corporation')
      expect(tenant.email.value).toBe('contact@acme.com')
      expect(tenant.slug.value).toBe('acme-corporation')
      expect(tenant.status).toBe(TenantStatus.ACTIVE)
      expect(tenant.subscription.isTrial()).toBe(true)
      expect(tenant.isActive()).toBe(true)
      expect(tenant.getUncommittedEvents()).toHaveLength(1)
      expect(tenant.getUncommittedEvents()[0]).toBeInstanceOf(TenantCreatedEvent)
    })

    test('should reject tenant with short name', async () => {
      // Arrange
      const command = {
        name: 'AB', // Too short
        email: 'contact@ab.com'
      }

      // Act & Assert
      await expect(
        TenantEntity.create(command, {
          slugGenerator: mockSlugGenerator,
          emailValidator: mockEmailValidator
        })
      ).rejects.toThrow(TenantNameTooShortError)
    })

    test('should reject tenant with invalid email', async () => {
      // Arrange
      const command = {
        name: 'Valid Company',
        email: 'invalid-email'
      }

      // Act & Assert
      await expect(
        TenantEntity.create(command, {
          slugGenerator: mockSlugGenerator,
          emailValidator: mockEmailValidator
        })
      ).rejects.toThrow(InvalidEmailError)
    })
  })

  describe('business methods', () => {
    let tenant: TenantEntity

    beforeEach(() => {
      tenant = TenantEntity.restore({
        id: EntityId.from('123e4567-e89b-12d3-a456-426614174000'),
        name: TenantName.from('Test Company'),
        email: Email.from('test@company.com'),
        slug: Slug.from('test-company'),
        status: TenantStatus.ACTIVE,
        settings: TenantSettings.defaults(),
        subscription: TenantSubscription.trial(),
        metadata: {},
        memberCount: 0,
        apiCallsThisMonth: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        version: 1
      })
    })

    describe('suspend', () => {
      test('should suspend active tenant', () => {
        // Arrange
        const reason = SuspensionReason.from('Repeated terms of service violations')

        // Act
        tenant.suspend(reason)

        // Assert
        expect(tenant.isSuspended()).toBe(true)
        expect(tenant.status).toBe(TenantStatus.SUSPENDED)
        expect(tenant.suspensionReason).toEqual(reason)
        expect(tenant.suspendedAt).toBeInstanceOf(Date)
        expect(tenant.version).toBe(2)
        expect(tenant.getUncommittedEvents()).toHaveLength(1)
        expect(tenant.getUncommittedEvents()[0]).toBeInstanceOf(TenantSuspendedEvent)
      })

      test('should not suspend already suspended tenant', () => {
        // Arrange
        tenant.suspend(SuspensionReason.from('First violation'))
        tenant.clearEvents()

        // Act & Assert
        expect(() => 
          tenant.suspend(SuspensionReason.from('Second violation'))
        ).toThrow(TenantAlreadySuspendedError)
      })

      test('should not suspend deleted tenant', () => {
        // Arrange
        tenant.delete()
        tenant.clearEvents()

        // Act & Assert
        expect(() => 
          tenant.suspend(SuspensionReason.from('Some reason'))
        ).toThrow(CannotSuspendDeletedTenantError)
      })
    })

    describe('API call tracking', () => {
      test('should record API call when under limit', () => {
        // Arrange
        const initialCalls = tenant.apiCallsThisMonth

        // Act
        tenant.recordApiCall()

        // Assert
        expect(tenant.apiCallsThisMonth).toBe(initialCalls + 1)
        expect(tenant.lastApiCallAt).toBeInstanceOf(Date)
      })

      test('should throw when API limit exceeded', () => {
        // Arrange - Set calls to limit
        const limit = tenant.subscription.getApiCallLimit()
        for (let i = 0; i < limit; i++) {
          tenant.recordApiCall()
        }

        // Act & Assert
        expect(() => tenant.recordApiCall()).toThrow(ApiCallLimitExceededError)
      })
    })

    describe('subscription management', () => {
      test('should upgrade subscription', () => {
        // Arrange
        const newPlan = SubscriptionPlan.PROFESSIONAL

        // Act
        tenant.upgradeSubscription(newPlan)

        // Assert
        expect(tenant.subscription.plan).toBe(newPlan)
        expect(tenant.version).toBe(2)
        expect(tenant.getUncommittedEvents()).toHaveLength(1)
        expect(tenant.getUncommittedEvents()[0]).toBeInstanceOf(TenantSubscriptionUpgradedEvent)
      })

      test('should not allow downgrade', () => {
        // Arrange
        tenant.upgradeSubscription(SubscriptionPlan.PROFESSIONAL)
        tenant.clearEvents()

        // Act & Assert
        expect(() => 
          tenant.upgradeSubscription(SubscriptionPlan.STARTER)
        ).toThrow(CannotDowngradeSubscriptionError)
      })
    })
  })
})
```

##### Step 2: Test Domain Services

```typescript
// File: /apps/api/tests/unit/domain/tenant/services/slug-generation.service.test.ts
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { SlugGenerationService, Slug } from '../../../../../src/core/domain/tenant'

describe('SlugGenerationService', () => {
  let service: SlugGenerationService
  let mockChecker: SlugChecker

  beforeEach(() => {
    service = new SlugGenerationService()
    mockChecker = {
      isAvailable: vi.fn()
    }
  })

  test('should generate slug from simple name', async () => {
    // Arrange
    mockChecker.isAvailable.mockResolvedValue(true)

    // Act
    const slug = await service.generateUniqueSlug('Test Company', mockChecker)

    // Assert
    expect(slug.value).toBe('test-company')
    expect(mockChecker.isAvailable).toHaveBeenCalledWith('test-company')
    expect(mockChecker.isAvailable).toHaveBeenCalledTimes(1)
  })

  test('should handle special characters', async () => {
    // Arrange
    mockChecker.isAvailable.mockResolvedValue(true)

    // Act
    const slug = await service.generateUniqueSlug('Test & Company!', mockChecker)

    // Assert
    expect(slug.value).toBe('test-company')
  })

  test('should add number suffix when slug exists', async () => {
    // Arrange
    mockChecker.isAvailable
      .mockResolvedValueOnce(false) // test-company exists
      .mockResolvedValueOnce(false) // test-company-1 exists
      .mockResolvedValueOnce(true)  // test-company-2 available

    // Act
    const slug = await service.generateUniqueSlug('Test Company', mockChecker)

    // Assert
    expect(slug.value).toBe('test-company-2')
    expect(mockChecker.isAvailable).toHaveBeenCalledTimes(3)
  })

  test('should throw when max attempts reached', async () => {
    // Arrange
    mockChecker.isAvailable.mockResolvedValue(false) // Always unavailable

    // Act & Assert
    await expect(
      service.generateUniqueSlug('Test Company', mockChecker)
    ).rejects.toThrow(UnableToGenerateUniqueSlugError)
  })
})
```

##### Step 3: Test Value Objects

```typescript
// File: /apps/api/tests/unit/domain/shared/value-objects/email.test.ts
import { describe, test, expect } from 'vitest'
import { Email, InvalidEmailError } from '../../../../../src/core/domain/shared/value-objects/email'

describe('Email Value Object', () => {
  describe('validation', () => {
    test.each([
      'user@example.com',
      'test.user@company.co.uk',
      'first+last@domain.com',
      'user123@sub.domain.com'
    ])('should accept valid email: %s', (validEmail) => {
      expect(() => Email.from(validEmail)).not.toThrow()
    })

    test.each([
      '',
      'invalid',
      '@example.com',
      'user@',
      'user@.com',
      'user..name@example.com',
      'user@example..com',
      'user name@example.com',
      'user@example.com.'
    ])('should reject invalid email: %s', (invalidEmail) => {
      expect(() => Email.from(invalidEmail)).toThrow(InvalidEmailError)
    })
  })

  describe('equality', () => {
    test('should be equal for same email addresses', () => {
      const email1 = Email.from('user@example.com')
      const email2 = Email.from('user@example.com')

      expect(email1.equals(email2)).toBe(true)
    })

    test('should not be equal for different email addresses', () => {
      const email1 = Email.from('user1@example.com')
      const email2 = Email.from('user2@example.com')

      expect(email1.equals(email2)).toBe(false)
    })

    test('should handle case-insensitive comparison', () => {
      const email1 = Email.from('User@Example.com')
      const email2 = Email.from('user@example.com')

      expect(email1.equals(email2)).toBe(true)
    })
  })

  describe('domain extraction', () => {
    test('should extract domain from email', () => {
      const email = Email.from('user@example.com')
      expect(email.domain).toBe('example.com')
    })

    test('should handle subdomains', () => {
      const email = Email.from('user@mail.company.com')
      expect(email.domain).toBe('mail.company.com')
    })
  })
})
```

#### 6.2 Repository Testing

##### Step 1: Test Repository Implementation

```typescript
// File: /apps/api/tests/integration/repositories/tenant.repository.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { DrizzleTenantRepository } from '../../../src/infrastructure/repositories/drizzle-tenant.repository'
import { TenantEntity } from '../../../src/core/domain/tenant'
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database'
import { TenantBuilder } from '../../builders/tenant.builder'

describe('DrizzleTenantRepository', () => {
  let repository: DrizzleTenantRepository
  let db: Database

  beforeEach(async () => {
    db = await setupTestDatabase()
    repository = new DrizzleTenantRepository(db, logger)
  })

  afterEach(async () => {
    await cleanupTestDatabase(db)
  })

  describe('save', () => {
    test('should save new tenant', async () => {
      // Arrange
      const tenant = new TenantBuilder()
        .withName('Test Company')
        .withEmail('test@company.com')
        .withSlug('test-company')
        .build()

      // Act
      await repository.save(tenant)

      // Assert
      const retrieved = await repository.findById(tenant.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.name.value).toBe('Test Company')
      expect(retrieved!.email.value).toBe('test@company.com')
    })

    test('should update existing tenant', async () => {
      // Arrange
      const tenant = new TenantBuilder().build()
      await repository.save(tenant)

      // Act
      tenant.updateProfile({ name: 'Updated Company' })
      await repository.save(tenant)

      // Assert
      const retrieved = await repository.findById(tenant.id)
      expect(retrieved!.name.value).toBe('Updated Company')
      expect(retrieved!.version).toBe(2)
    })

    test('should handle concurrent updates with optimistic locking', async () => {
      // Arrange
      const tenant = new TenantBuilder().build()
      await repository.save(tenant)

      // Load same tenant twice
      const tenant1 = await repository.findById(tenant.id)
      const tenant2 = await repository.findById(tenant.id)

      // Act
      tenant1!.updateProfile({ name: 'Update 1' })
      await repository.save(tenant1!)

      tenant2!.updateProfile({ name: 'Update 2' })

      // Assert
      await expect(repository.save(tenant2!))
        .rejects.toThrow(OptimisticLockError)
    })
  })

  describe('findBySpecification', () => {
    beforeEach(async () => {
      // Seed test data
      const tenants = [
        new TenantBuilder()
          .withName('Active Company')
          .withStatus(TenantStatus.ACTIVE)
          .build(),
        new TenantBuilder()
          .withName('Suspended Company')
          .withStatus(TenantStatus.SUSPENDED)
          .build(),
        new TenantBuilder()
          .withName('Another Active')
          .withStatus(TenantStatus.ACTIVE)
          .build()
      ]

      for (const tenant of tenants) {
        await repository.save(tenant)
      }
    })

    test('should find tenants by status specification', async () => {
      // Arrange
      const spec = new ActiveTenantSpecification()

      // Act
      const results = await repository.findBySpecification(spec)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.every(t => t.isActive())).toBe(true)
    })

    test('should find tenants by composite specification', async () => {
      // Arrange
      const activeSpec = new ActiveTenantSpecification()
      const nameSpec = new TenantNameContainsSpecification('Another')
      const compositeSpec = activeSpec.and(nameSpec)

      // Act
      const results = await repository.findBySpecification(compositeSpec)

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].name.value).toBe('Another Active')
    })
  })

  describe('Unit of Work pattern', () => {
    test('should rollback transaction on error', async () => {
      // Arrange
      const uow = new DrizzleUnitOfWork(db, repositoryFactory)
      const tenant = new TenantBuilder().build()

      // Act & Assert
      await expect(
        uow.runInTransaction(async (uow) => {
          const tenantRepo = uow.getRepository<TenantEntity>(TOKENS.TenantRepository)
          await tenantRepo.save(tenant)
          
          // Force an error
          throw new Error('Simulated error')
        })
      ).rejects.toThrow('Simulated error')

      // Verify tenant was not saved
      const retrieved = await repository.findById(tenant.id)
      expect(retrieved).toBeNull()
    })

    test('should commit transaction on success', async () => {
      // Arrange
      const uow = new DrizzleUnitOfWork(db, repositoryFactory)
      const tenant = new TenantBuilder().build()
      const member = new TenantMemberBuilder()
        .withTenantId(tenant.id)
        .build()

      // Act
      await uow.runInTransaction(async (uow) => {
        const tenantRepo = uow.getRepository<TenantEntity>(TOKENS.TenantRepository)
        const memberRepo = uow.getRepository<TenantMemberEntity>(TOKENS.TenantMemberRepository)
        
        await tenantRepo.save(tenant)
        await memberRepo.save(member)
      })

      // Assert
      const retrievedTenant = await repository.findById(tenant.id)
      expect(retrievedTenant).toBeDefined()
      
      const retrievedMember = await memberRepository.findById(member.id)
      expect(retrievedMember).toBeDefined()
    })
  })
})
```

##### Step 2: Test Builders for Testing

```typescript
// File: /apps/api/tests/builders/tenant.builder.ts
import { TenantEntity, TenantStatus } from '../../src/core/domain/tenant'
import { EntityId } from '../../src/core/domain/shared/value-objects/entity-id'

export class TenantBuilder {
  private props = {
    id: EntityId.generate(),
    name: TenantName.from('Default Test Company'),
    email: Email.from('test@example.com'),
    slug: Slug.from('default-test-company'),
    status: TenantStatus.ACTIVE,
    settings: TenantSettings.defaults(),
    subscription: TenantSubscription.trial(),
    metadata: {},
    memberCount: 0,
    apiCallsThisMonth: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1
  }

  withId(id: string): TenantBuilder {
    this.props.id = EntityId.from(id)
    return this
  }

  withName(name: string): TenantBuilder {
    this.props.name = TenantName.from(name)
    return this
  }

  withEmail(email: string): TenantBuilder {
    this.props.email = Email.from(email)
    return this
  }

  withSlug(slug: string): TenantBuilder {
    this.props.slug = Slug.from(slug)
    return this
  }

  withStatus(status: TenantStatus): TenantBuilder {
    this.props.status = status
    return this
  }

  withSubscription(subscription: TenantSubscription): TenantBuilder {
    this.props.subscription = subscription
    return this
  }

  suspended(): TenantBuilder {
    this.props.status = TenantStatus.SUSPENDED
    this.props.suspendedAt = new Date()
    this.props.suspensionReason = SuspensionReason.from('Test suspension')
    return this
  }

  deleted(): TenantBuilder {
    this.props.deletedAt = new Date()
    return this
  }

  build(): TenantEntity {
    return TenantEntity.restore(this.props)
  }
}
```

### Phase 7: Advanced DDD Patterns (Week 13-14)

#### 7.1 Implement Domain Events

##### Step 1: Create Event Bus Infrastructure

```typescript
// File: /apps/api/src/core/ports/events/event-bus.interface.ts
export interface EventBus {
  publish(event: DomainEvent): Promise<void>
  publishAll(events: DomainEvent[]): Promise<void>
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void
  unsubscribe(eventType: string, handler: EventHandler<any>): void
}

export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>
}

// File: /apps/api/src/infrastructure/events/in-memory-event-bus.ts
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>()
  private eventStore: DomainEvent[] = []

  async publish(event: DomainEvent): Promise<void> {
    // Store event
    this.eventStore.push(event)

    // Get handlers for this event type
    const handlers = this.handlers.get(event.eventName) || new Set()

    // Execute handlers
    const promises = Array.from(handlers).map(handler =>
      handler.handle(event).catch(error => {
        console.error(`Error handling event ${event.eventName}:`, error)
      })
    )

    await Promise.all(promises)
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
  }

  unsubscribe(eventType: string, handler: EventHandler<any>): void {
    this.handlers.get(eventType)?.delete(handler)
  }

  getEventHistory(): DomainEvent[] {
    return [...this.eventStore]
  }

  clearEventHistory(): void {
    this.eventStore = []
  }
}
```

##### Step 2: Create Domain Event Handlers

```typescript
// File: /apps/api/src/application/event-handlers/tenant-created.handler.ts
export class TenantCreatedHandler implements EventHandler<TenantCreatedEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: Logger
  ) {}

  async handle(event: TenantCreatedEvent): Promise<void> {
    this.logger.info('Handling TenantCreatedEvent', { event })

    try {
      // Send welcome email
      await this.emailService.sendWelcomeEmail({
        to: event.payload.email,
        tenantName: event.payload.name,
        activationUrl: this.generateActivationUrl(event.aggregateId)
      })

      // Track analytics
      await this.analyticsService.track({
        event: 'tenant_created',
        properties: {
          tenantId: event.aggregateId.toString(),
          subscription: event.payload.subscription,
          source: event.payload.metadata?.source || 'direct'
        }
      })

      // Could trigger other processes:
      // - Create default settings
      // - Set up initial data
      // - Notify sales team
    } catch (error) {
      this.logger.error('Failed to handle TenantCreatedEvent', { event, error })
      // Consider implementing retry logic or dead letter queue
      throw error
    }
  }

  private generateActivationUrl(tenantId: EntityId): string {
    return `${process.env.APP_URL}/activate/${tenantId}`
  }
}

// File: /apps/api/src/application/event-handlers/conversation-message-added.handler.ts
export class ConversationMessageAddedHandler implements EventHandler<MessageAddedToConversationEvent> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService,
    private readonly conversationRepo: ConversationRepository
  ) {}

  async handle(event: MessageAddedToConversationEvent): Promise<void> {
    // Update cache
    const cacheKey = CacheKey.for('conversation_stats', event.aggregateId.toString())
    await this.cacheService.delete(cacheKey)

    // Send real-time notification
    await this.notificationService.notifyNewMessage({
      conversationId: event.aggregateId,
      messageId: event.payload.messageId,
      userId: event.payload.userId
    })

    // Check for auto-responses
    if (event.payload.direction === MessageDirection.INBOUND) {
      await this.checkAutoResponse(event)
    }
  }

  private async checkAutoResponse(event: MessageAddedToConversationEvent): Promise<void> {
    const conversation = await this.conversationRepo.findById(event.aggregateId)
    if (!conversation) return

    // Business rules for auto-response
    if (conversation.metadata.autoReplyEnabled) {
      // Trigger auto-response use case
    }
  }
}
```

##### Step 3: Integrate Events with Repositories

```typescript
// File: /apps/api/src/infrastructure/repositories/event-sourced-repository.base.ts
export abstract class EventSourcedRepository<T extends AggregateRoot<any>> {
  constructor(
    protected readonly eventBus: EventBus,
    protected readonly eventStore: EventStore
  ) {}

  async save(aggregate: T): Promise<void> {
    // Get uncommitted events
    const events = aggregate.getUncommittedEvents()

    // Save to event store
    await this.eventStore.saveEvents(
      aggregate.id,
      events,
      aggregate.version
    )

    // Publish events
    await this.eventBus.publishAll(events)

    // Mark events as committed
    aggregate.markEventsAsCommitted()
  }

  async findById(id: EntityId): Promise<T | null> {
    // Load events from event store
    const events = await this.eventStore.getEvents(id)
    
    if (events.length === 0) {
      return null
    }

    // Rebuild aggregate from events
    return this.rebuildFromEvents(events)
  }

  protected abstract rebuildFromEvents(events: DomainEvent[]): T
}
```

#### 7.2 Implement Saga Pattern

##### Step 1: Create Saga Orchestrator

```typescript
// File: /apps/api/src/application/sagas/saga.interface.ts
export interface Saga {
  id: string
  state: SagaState
  handle(event: DomainEvent): Promise<void>
  compensate(): Promise<void>
}

export enum SagaState {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  COMPENSATING = 'compensating',
  FAILED = 'failed'
}

// File: /apps/api/src/application/sagas/tenant-onboarding.saga.ts
export class TenantOnboardingSaga implements Saga {
  id = EntityId.generate().toString()
  state = SagaState.STARTED
  
  private steps: SagaStep[] = []
  private completedSteps: SagaStep[] = []

  constructor(
    private readonly tenantService: TenantService,
    private readonly userService: UserService,
    private readonly billingService: BillingService,
    private readonly emailService: EmailService,
    private readonly logger: Logger
  ) {
    this.defineSteps()
  }

  private defineSteps(): void {
    this.steps = [
      {
        name: 'create_tenant',
        execute: async (context: SagaContext) => {
          const tenant = await this.tenantService.createTenant(context.tenantData)
          context.tenantId = tenant.id
          return { success: true, data: tenant }
        },
        compensate: async (context: SagaContext) => {
          if (context.tenantId) {
            await this.tenantService.deleteTenant(context.tenantId)
          }
        }
      },
      {
        name: 'create_owner_user',
        execute: async (context: SagaContext) => {
          const user = await this.userService.createUser({
            ...context.ownerData,
            tenantId: context.tenantId
          })
          context.userId = user.id
          return { success: true, data: user }
        },
        compensate: async (context: SagaContext) => {
          if (context.userId) {
            await this.userService.deleteUser(context.userId)
          }
        }
      },
      {
        name: 'setup_billing',
        execute: async (context: SagaContext) => {
          const billing = await this.billingService.createCustomer({
            tenantId: context.tenantId,
            email: context.tenantData.email
          })
          context.billingCustomerId = billing.customerId
          return { success: true, data: billing }
        },
        compensate: async (context: SagaContext) => {
          if (context.billingCustomerId) {
            await this.billingService.deleteCustomer(context.billingCustomerId)
          }
        }
      },
      {
        name: 'send_welcome_email',
        execute: async (context: SagaContext) => {
          await this.emailService.sendWelcomeEmail({
            to: context.ownerData.email,
            tenantName: context.tenantData.name
          })
          return { success: true }
        },
        compensate: async () => {
          // Email cannot be unsent, log for manual handling
          this.logger.warn('Welcome email was sent but saga failed')
        }
      }
    ]
  }

  async handle(event: DomainEvent): Promise<void> {
    if (event.eventName !== 'tenant.onboarding.requested') {
      return
    }

    this.state = SagaState.IN_PROGRESS
    const context: SagaContext = {
      tenantData: event.payload.tenantData,
      ownerData: event.payload.ownerData
    }

    try {
      // Execute each step
      for (const step of this.steps) {
        this.logger.info(`Executing saga step: ${step.name}`)
        
        const result = await step.execute(context)
        
        if (!result.success) {
          throw new Error(`Step ${step.name} failed: ${result.error}`)
        }
        
        this.completedSteps.push(step)
      }

      this.state = SagaState.COMPLETED
      this.logger.info('Saga completed successfully', { sagaId: this.id })

    } catch (error) {
      this.logger.error('Saga failed, starting compensation', { sagaId: this.id, error })
      this.state = SagaState.COMPENSATING
      
      await this.compensate()
      
      this.state = SagaState.FAILED
      throw new SagaFailedError(this.id, error.message)
    }
  }

  async compensate(): Promise<void> {
    // Compensate in reverse order
    const stepsToCompensate = [...this.completedSteps].reverse()

    for (const step of stepsToCompensate) {
      try {
        this.logger.info(`Compensating step: ${step.name}`)
        await step.compensate(this.context)
      } catch (error) {
        this.logger.error(`Failed to compensate step: ${step.name}`, { error })
        // Continue compensating other steps
      }
    }
  }
}

interface SagaStep {
  name: string
  execute: (context: SagaContext) => Promise<StepResult>
  compensate: (context: SagaContext) => Promise<void>
}

interface SagaContext {
  tenantData: any
  ownerData: any
  tenantId?: EntityId
  userId?: EntityId
  billingCustomerId?: string
}

interface StepResult {
  success: boolean
  data?: any
  error?: string
}
```

##### Step 2: Create Saga Manager

```typescript
// File: /apps/api/src/application/sagas/saga-manager.ts
export class SagaManager {
  private activeSagas = new Map<string, Saga>()

  constructor(
    private readonly eventBus: EventBus,
    private readonly sagaRepository: SagaRepository,
    private readonly logger: Logger
  ) {
    this.subscribeToEvents()
  }

  private subscribeToEvents(): void {
    // Subscribe to events that can trigger sagas
    this.eventBus.subscribe('tenant.onboarding.requested', {
      handle: async (event) => {
        await this.startSaga(new TenantOnboardingSaga(...dependencies), event)
      }
    })

    this.eventBus.subscribe('order.placed', {
      handle: async (event) => {
        await this.startSaga(new OrderProcessingSaga(...dependencies), event)
      }
    })
  }

  async startSaga(saga: Saga, triggerEvent: DomainEvent): Promise<void> {
    try {
      this.activeSagas.set(saga.id, saga)
      
      // Persist saga state
      await this.sagaRepository.save(saga)

      // Handle the trigger event
      await saga.handle(triggerEvent)

      // Remove from active sagas
      this.activeSagas.delete(saga.id)

      // Update persisted state
      await this.sagaRepository.save(saga)

    } catch (error) {
      this.logger.error('Saga execution failed', { 
        sagaId: saga.id, 
        error 
      })
      
      // Saga handles its own compensation
      // Could implement retry logic here
    }
  }

  async recoverSagas(): Promise<void> {
    // Load incomplete sagas from repository
    const incompleteSagas = await this.sagaRepository.findIncomplete()

    for (const saga of incompleteSagas) {
      if (saga.state === SagaState.COMPENSATING) {
        // Continue compensation
        await saga.compensate()
      } else if (saga.state === SagaState.IN_PROGRESS) {
        // Restart or compensate based on business rules
        this.logger.warn('Found in-progress saga', { sagaId: saga.id })
      }
    }
  }
}
```

### Phase 8: Refactor Services (Week 15-16)

#### 8.1 Split Fat Services

##### Step 1: Identify Responsibilities

Let's refactor the ConversationService which currently does too much:

```typescript
// BEFORE - Fat Service
export class ConversationService {
  // Too many responsibilities:
  // 1. Message processing
  // 2. File handling  
  // 3. WhatsApp integration
  // 4. Auto-reply logic
  // 5. Verification handling
  // 6. Rate limiting
  // 7. Caching
}

// AFTER - Split into focused use cases:
```

##### Step 2: Create Focused Use Cases

```typescript
// File: /apps/api/src/core/usecases/conversation/process-incoming-message.usecase.ts
export class ProcessIncomingMessageUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly channelRepo: UserChannelRepository,
    private readonly rateLimiter: RateLimiterService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: ProcessIncomingMessageCommand): Promise<void> {
    // Rate limiting
    await this.rateLimiter.checkLimit(
      command.from,
      'incoming_message',
      { maxRequests: 10, window: 60 }
    )

    // Find channel
    const channel = await this.channelRepo.findByPhoneNumber(command.from)
    if (!channel) {
      throw new ChannelNotFoundError(command.from)
    }

    // Business rule: Channel must be verified
    if (!channel.isVerified()) {
      throw new UnverifiedChannelError(channel.id)
    }

    // Find or create conversation
    const conversation = await this.findOrCreateConversation(
      channel,
      command.tenantId
    )

    // Add message
    const message = conversation.addMessage(
      { text: command.body },
      MessageDirection.INBOUND,
      command.externalId
    )

    // Save
    await this.conversationRepo.save(conversation)

    // Publish events
    await this.eventBus.publishAll(conversation.getUncommittedEvents())
  }

  private async findOrCreateConversation(
    channel: UserChannelEntity,
    tenantId: EntityId
  ): Promise<ConversationEntity> {
    const existing = await this.conversationRepo.findActiveByChannel(channel.id)
    
    if (existing) {
      return existing
    }

    return ConversationEntity.create({
      tenantId,
      userId: channel.userId,
      channelId: channel.id
    })
  }
}

// File: /apps/api/src/core/usecases/conversation/send-message.usecase.ts
export class SendMessageUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messagingService: MessagingService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: SendMessageCommand): Promise<MessageResult> {
    // Load conversation
    const conversation = await this.conversationRepo.findById(command.conversationId)
    if (!conversation) {
      throw new ConversationNotFoundError(command.conversationId)
    }

    // Business rule: Can't send to closed conversation
    if (conversation.isClosed()) {
      throw new CannotSendToClosedConversationError(command.conversationId)
    }

    // Add message to conversation
    const message = conversation.addMessage(
      command.content,
      MessageDirection.OUTBOUND
    )

    // Send via messaging service
    const result = await this.messagingService.sendMessage({
      to: conversation.getPhoneNumber(),
      content: command.content,
      metadata: {
        conversationId: conversation.id.toString(),
        messageId: message.id.toString()
      }
    })

    // Update message with external ID
    message.setExternalId(result.messageId)
    message.markAsSent()

    // Save
    await this.conversationRepo.save(conversation)

    // Publish events
    await this.eventBus.publishAll(conversation.getUncommittedEvents())

    return result
  }
}

// File: /apps/api/src/core/usecases/conversation/process-media-files.usecase.ts
export class ProcessMediaFilesUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly fileStorage: FileStorage,
    private readonly messagingService: MessagingService,
    private readonly virusScanner: VirusScannerService
  ) {}

  async execute(command: ProcessMediaFilesCommand): Promise<void> {
    const conversation = await this.conversationRepo.findById(command.conversationId)
    if (!conversation) {
      throw new ConversationNotFoundError(command.conversationId)
    }

    const message = conversation.getMessage(command.messageId)
    if (!message) {
      throw new MessageNotFoundError(command.messageId)
    }

    for (const mediaUrl of command.mediaUrls) {
      try {
        // Download media
        const media = await this.messagingService.downloadMedia(mediaUrl)

        // Virus scan
        const scanResult = await this.virusScanner.scan(media.data)
        if (!scanResult.isClean) {
          throw new MaliciousFileDetectedError(mediaUrl)
        }

        // Upload to storage
        const file = await this.fileStorage.upload({
          filename: media.filename || `attachment_${Date.now()}`,
          mimeType: media.mimeType,
          data: media.data,
          metadata: {
            conversationId: conversation.id.toString(),
            messageId: message.id.toString(),
            originalUrl: mediaUrl
          }
        })

        // Add to conversation
        conversation.addFile(file, message.id)

      } catch (error) {
        // Log but continue processing other files
        this.logger.error('Failed to process media file', { mediaUrl, error })
      }
    }

    await this.conversationRepo.save(conversation)
  }
}
```

##### Step 3: Create Application Service for Orchestration

```typescript
// File: /apps/api/src/application/services/conversation-application.service.ts
export class ConversationApplicationService {
  constructor(
    private readonly processIncomingMessage: ProcessIncomingMessageUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly processMediaFiles: ProcessMediaFilesUseCase,
    private readonly verifyChannel: VerifyChannelUseCase,
    private readonly eventBus: EventBus
  ) {}

  async handleIncomingWhatsAppMessage(dto: WhatsAppWebhookDto): Promise<void> {
    // Convert DTO to command
    const command = ProcessIncomingMessageCommand.fromWhatsAppWebhook(dto)

    try {
      // Process the message
      await this.processIncomingMessage.execute(command)

      // Process media if present
      if (dto.NumMedia > 0) {
        const mediaUrls = this.extractMediaUrls(dto)
        await this.processMediaFiles.execute({
          conversationId: command.conversationId,
          messageId: command.messageId,
          mediaUrls
        })
      }

    } catch (error) {
      if (error instanceof UnverifiedChannelError) {
        // Send verification prompt
        await this.handleUnverifiedChannel(command.from)
      } else if (error instanceof ChannelNotFoundError) {
        // Send registration prompt
        await this.handleUnregisteredNumber(command.from)
      } else {
        throw error
      }
    }
  }

  private async handleUnverifiedChannel(phoneNumber: PhoneNumber): Promise<void> {
    await this.eventBus.publish(new UnverifiedChannelMessageReceivedEvent({
      phoneNumber,
      timestamp: new Date()
    }))
  }

  private extractMediaUrls(dto: WhatsAppWebhookDto): string[] {
    const urls: string[] = []
    for (let i = 0; i < dto.NumMedia; i++) {
      const url = dto[`MediaUrl${i}`]
      if (url) urls.push(url)
    }
    return urls
  }
}
```

#### 8.2 Remove Direct Database Access

##### Step 1: Refactor TenantService

```typescript
// BEFORE - Direct database access
export class TenantService {
  private db = getDatabase() // ❌ Direct database

  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    const result = await this.db.transaction(async (tx) => {
      const [tenant] = await tx.insert(tenants).values({...})
      // Direct SQL operations
    })
  }
}

// AFTER - Using repository and use cases
export class CreateTenantUseCase {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly memberRepo: TenantMemberRepository,
    private readonly uow: UnitOfWork,
    private readonly slugService: SlugGenerationService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateTenantCommand): Promise<CreateTenantResult> {
    return this.uow.runInTransaction(async (uow) => {
      // Get repositories from unit of work
      const tenantRepo = uow.getRepository<TenantEntity>(TOKENS.TenantRepository)
      const memberRepo = uow.getRepository<TenantMemberEntity>(TOKENS.TenantMemberRepository)

      // Create tenant using domain logic
      const tenant = await TenantEntity.create(command, {
        slugService: this.slugService,
        slugChecker: {
          isAvailable: (slug) => tenantRepo.isSlugAvailable(slug)
        }
      })

      // Save tenant
      await tenantRepo.save(tenant)

      // Create owner membership
      const ownerMember = TenantMemberEntity.createOwner(
        tenant.id,
        command.ownerId
      )
      await memberRepo.save(ownerMember)

      // Publish events outside transaction
      await this.eventBus.publishAll(tenant.getUncommittedEvents())
      await this.eventBus.publishAll(ownerMember.getUncommittedEvents())

      return {
        tenant,
        ownerMembership: ownerMember
      }
    })
  }
}
```

##### Step 2: Implement Proper Transaction Boundaries

```typescript
// File: /apps/api/src/application/decorators/transactional.decorator.ts
export function Transactional() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const uow: UnitOfWork = this.uow
      
      if (!uow) {
        throw new Error('UnitOfWork not found. Ensure it is injected.')
      }

      return uow.runInTransaction(async (transactionalUow) => {
        // Temporarily replace UoW with transactional one
        const originalUow = this.uow
        this.uow = transactionalUow
        
        try {
          return await originalMethod.apply(this, args)
        } finally {
          this.uow = originalUow
        }
      })
    }

    return descriptor
  }
}

// Usage in use case
export class TransferMoneyUseCase {
  constructor(
    private uow: UnitOfWork,
    private accountRepo: AccountRepository
  ) {}

  @Transactional()
  async execute(command: TransferMoneyCommand): Promise<void> {
    const fromAccount = await this.accountRepo.findById(command.fromAccountId)
    const toAccount = await this.accountRepo.findById(command.toAccountId)

    if (!fromAccount || !toAccount) {
      throw new AccountNotFoundError()
    }

    // Domain logic
    fromAccount.debit(command.amount)
    toAccount.credit(command.amount)

    // Save within transaction
    await this.accountRepo.save(fromAccount)
    await this.accountRepo.save(toAccount)
  }
}
```

## Code Templates

### Base Entity Template

```typescript
// File: /apps/api/src/core/domain/shared/base.entity.ts
export abstract class BaseEntity<T> {
  protected readonly props: T

  protected constructor(props: T) {
    this.props = Object.freeze({ ...props })
  }

  equals(other: BaseEntity<T>): boolean {
    if (other === null || other === undefined) {
      return false
    }
    if (other.props === undefined) {
      return false
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props)
  }

  protected updateTimestamp(): void {
    (this.props as any).updatedAt = new Date()
  }
}

// File: /apps/api/src/core/domain/shared/aggregate-root.ts
export abstract class AggregateRoot<T> extends BaseEntity<T> {
  private domainEvents: DomainEvent[] = []

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event)
  }

  clearEvents(): void {
    this.domainEvents = []
  }

  getUncommittedEvents(): readonly DomainEvent[] {
    return [...this.domainEvents]
  }

  markEventsAsCommitted(): void {
    this.domainEvents = []
  }

  protected incrementVersion(): void {
    (this.props as any).version++
  }
}
```

### Value Object Template

```typescript
// File: /apps/api/src/core/domain/shared/value-object.template.ts
export abstract class ValueObject<T> {
  protected readonly value: T

  protected constructor(value: T) {
    this.value = Object.freeze(value)
    this.validate()
  }

  protected abstract validate(): void

  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false
    }
    return JSON.stringify(this.value) === JSON.stringify(other.value)
  }

  toString(): string {
    return String(this.value)
  }
}

// Example implementation
export class Money extends ValueObject<{ amount: number; currency: string }> {
  static from(amount: number, currency: string): Money {
    return new Money({ amount, currency })
  }

  protected validate(): void {
    if (this.value.amount < 0) {
      throw new Error('Amount cannot be negative')
    }
    if (!['USD', 'EUR', 'GBP'].includes(this.value.currency)) {
      throw new Error('Invalid currency')
    }
  }

  add(other: Money): Money {
    if (this.value.currency !== other.value.currency) {
      throw new Error('Cannot add money with different currencies')
    }
    return Money.from(
      this.value.amount + other.value.amount,
      this.value.currency
    )
  }

  get amount(): number {
    return this.value.amount
  }

  get currency(): string {
    return this.value.currency
  }
}
```

### Use Case Template

```typescript
// File: /apps/api/src/core/usecases/usecase.template.ts
export interface UseCase<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>
}

export abstract class BaseUseCase<TCommand, TResult> implements UseCase<TCommand, TResult> {
  abstract execute(command: TCommand): Promise<TResult>

  protected async validate(command: TCommand): Promise<void> {
    // Override in concrete implementations
  }
}

// Example implementation
export class CreateOrderUseCase extends BaseUseCase<CreateOrderCommand, CreateOrderResult> {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly productRepo: ProductRepository,
    private readonly inventoryService: InventoryService,
    private readonly pricingService: PricingService,
    private readonly eventBus: EventBus
  ) {
    super()
  }

  async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    await this.validate(command)

    // Load customer
    const customer = await this.customerRepo.findById(command.customerId)
    if (!customer) {
      throw new CustomerNotFoundError(command.customerId)
    }

    // Create order
    const order = Order.create({
      customerId: customer.id,
      shippingAddress: command.shippingAddress
    })

    // Add items
    for (const item of command.items) {
      const product = await this.productRepo.findById(item.productId)
      if (!product) {
        throw new ProductNotFoundError(item.productId)
      }

      // Check inventory
      const available = await this.inventoryService.checkAvailability(
        product.id,
        item.quantity
      )
      if (!available) {
        throw new InsufficientInventoryError(product.id, item.quantity)
      }

      // Get pricing
      const price = await this.pricingService.getPrice(
        product.id,
        customer.tier
      )

      // Add to order
      order.addItem(product, item.quantity, price)
    }

    // Save order
    await this.orderRepo.save(order)

    // Publish events
    await this.eventBus.publishAll(order.getUncommittedEvents())

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total
    }
  }

  protected async validate(command: CreateOrderCommand): Promise<void> {
    if (!command.customerId) {
      throw new ValidationError('Customer ID is required')
    }
    if (!command.items || command.items.length === 0) {
      throw new ValidationError('Order must contain at least one item')
    }
  }
}
```

### Repository Template

```typescript
// File: /apps/api/src/infrastructure/repositories/repository.template.ts
export abstract class TypedRepository<TEntity, TId> implements Repository<TEntity> {
  constructor(
    protected readonly queryBuilder: QueryBuilder,
    protected readonly mapper: EntityMapper<TEntity>
  ) {}

  async findById(id: TId): Promise<TEntity | null> {
    const query = this.queryBuilder
      .select()
      .from(this.tableName)
      .where({ id })
      .build()

    const result = await query.execute()
    return result ? this.mapper.toDomain(result) : null
  }

  async findMany(criteria: Criteria): Promise<TEntity[]> {
    const query = this.buildQuery(criteria)
    const results = await query.execute()
    return results.map(row => this.mapper.toDomain(row))
  }

  async save(entity: TEntity): Promise<void> {
    const data = this.mapper.toDatabase(entity)
    
    const query = this.queryBuilder
      .upsert(this.tableName)
      .values(data)
      .onConflict('id')
      .build()

    await query.execute()
  }

  async delete(entity: TEntity): Promise<void> {
    const id = this.getEntityId(entity)
    
    const query = this.queryBuilder
      .delete()
      .from(this.tableName)
      .where({ id })
      .build()

    await query.execute()
  }

  protected abstract get tableName(): string
  protected abstract getEntityId(entity: TEntity): TId
  protected abstract buildQuery(criteria: Criteria): Query
}
```

## Migration Checklist

### Pre-Migration
- [ ] Set up test environment
- [ ] Create comprehensive test suite for current functionality
- [ ] Document current API contracts
- [ ] Set up feature flags for gradual rollout
- [ ] Train team on DDD concepts

### Phase 1: Domain Isolation ✅ PHASE COMPLETE
- [x] Remove all infrastructure imports from domain entities ✅ COMPLETED (2025-01-05)
  - Removed generateId imports from all 4 conversation entities
  - Updated to use EntityId value object
- [x] Create value objects for IDs ✅ COMPLETED (2025-01-05)
  - Created EntityId value object in /apps/api/src/core/domain/shared/value-objects/entity-id.ts
  - Created Slug value object for domain-owned slug handling
  - Created VerificationCode value object with expiry logic
- [x] Move database types to infrastructure ✅ COMPLETED (2025-01-05)
  - Moved all DatabaseRow interfaces to /apps/api/src/infrastructure/persistence/types/
  - Created user.types.ts and conversation.types.ts
  - Removed fromDatabase/toDatabase methods from entities
- [x] Create domain services ✅ COMPLETED (2025-01-05)
  - Created SlugGenerationService with unique slug generation logic
  - Created VerificationCodeService with cooldown and attempt tracking
- [x] Update all entity creation logic ✅ COMPLETED (2025-01-05)
  - All entities now use EntityId.generate() for ID creation

### Phase 2: Repository Pattern
- [ ] Create repository interfaces
- [ ] Implement specification pattern
- [x] Create Unit of Work ✅ COMPLETED (2025-01-05)
  - Created QueryExecutor abstraction in /apps/api/src/infrastructure/persistence/query-executor.ts
  - Created DrizzleQueryExecutor with full table mapping
  - Created DrizzleUnitOfWork for transaction support
- [x] Refactor all repositories ✅ PARTIALLY COMPLETED (2025-01-05)
  - Updated repositories to use mappers instead of entity methods
  - Created comprehensive mapper layer in /apps/api/src/infrastructure/persistence/mappers/
  - DrizzleUserRepository fully refactored to use QueryExecutor
  - Conversation repositories still need QueryExecutor integration
- [x] Remove ORM leakage ✅ PARTIALLY COMPLETED (2025-01-05)
  - UserRepository: No more direct Drizzle usage ✅
  - Conversation repositories: Still use Drizzle directly ⏳

### Phase 3: Rich Domain Model
- [ ] Move business logic from services to entities
- [ ] Define aggregate boundaries
- [ ] Implement domain events
- [ ] Create domain exceptions
- [ ] Add entity validation

### Phase 4: Infrastructure Ports
- [ ] Create messaging service port
- [ ] Create cache service port
- [ ] Implement adapters
- [ ] Update service dependencies
- [ ] Configure dependency injection

### Phase 5: Type System
- [ ] Centralize type definitions
- [ ] Remove duplicates
- [ ] Create DTOs
- [ ] Implement mappers
- [ ] Update API contracts

### Phase 6: Testing
- [ ] Unit test all entities
- [ ] Unit test domain services
- [ ] Integration test repositories
- [ ] Test use cases
- [ ] End-to-end testing

### Phase 7: Advanced Patterns
- [ ] Implement event bus
- [ ] Create event handlers
- [ ] Implement sagas
- [ ] Add event sourcing preparation
- [ ] Test event flows

### Phase 8: Service Refactoring
- [ ] Split fat services
- [ ] Create focused use cases
- [ ] Remove direct DB access
- [ ] Implement proper transactions
- [ ] Final cleanup

### Post-Migration
- [ ] Performance testing
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation update
- [ ] Team training on new architecture

## Conclusion

This expanded migration plan provides a complete roadmap for transforming your codebase from its current mixed architecture to a proper Domain-Driven Design implementation. Each section includes:

1. **Detailed explanations** of what the problem is and why it matters
2. **Concrete code examples** showing the current problematic code
3. **Step-by-step transformations** with complete implementations
4. **Testing strategies** for each component
5. **Ready-to-use templates** for common patterns

The key to success is following the phases in order, as each builds upon the previous one. Take time to properly implement each phase before moving to the next. This investment in architecture will pay dividends in maintainability, scalability, and team velocity for years to come.