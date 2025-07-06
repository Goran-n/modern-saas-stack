# DDD Migration Plan: From Architectural Chaos to Domain-Driven Design

## Executive Summary

This document outlines the complete migration path to transform the Kibly backend from its current mixed architecture into a proper Domain-Driven Design (DDD) implementation. The migration will be executed in phases to maintain system stability while progressively improving the architecture.

## Current State Analysis

### Critical Issues
1. **Repository Pattern Violations**: Repositories expose ORM-specific details (Drizzle)
2. **Domain Contamination**: Domain entities depend on infrastructure (`generateId()`)
3. **Anemic Domain Model**: Business logic scattered across services instead of entities
4. **Infrastructure Coupling**: Direct dependencies on Twilio, Redis, S3 in services
5. **Type System Chaos**: Triple definitions of types across layers
6. **Missing Abstractions**: No ports for external services
7. **Inconsistent Patterns**: Mix of DDD, service layer, and transaction scripts

## Migration Phases

### Phase 1: Establish True Domain Isolation (Week 1-2)

#### 1.1 Remove Infrastructure Dependencies from Domain Entities

**Current Problem**: Domain entities import `generateId()` from `shared/utils`

**Tasks**:
- [ ] Create domain-specific ID value objects
- [ ] Implement ID generation at the application layer
- [ ] Remove all imports from domain to infrastructure
- [ ] Move database row interfaces out of entity files

**Implementation**:
```typescript
// core/domain/shared/value-objects/entity-id.ts
export class EntityId {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEntityIdError(value);
    }
  }

  static generate(): EntityId {
    // Domain-owned ID generation
    return new EntityId(crypto.randomUUID());
  }

  toString(): string {
    return this.value;
  }

  private isValid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
```

**Affected Files**:
- `/apps/api/src/core/domain/conversation/conversation.entity.ts`
- `/apps/api/src/core/domain/conversation/user-channel.entity.ts`
- `/apps/api/src/core/domain/conversation/conversation-message.entity.ts`
- `/apps/api/src/core/domain/conversation/conversation-file.entity.ts`
- All other domain entities using `generateId()`

#### 1.2 Create Domain Services for Cross-Cutting Concerns

**Tasks**:
- [ ] Create `SlugGenerationService` in domain layer
- [ ] Create `VerificationCodeService` in domain layer
- [ ] Move all business logic from application services to domain

**Implementation**:
```typescript
// core/domain/tenant/services/slug-generation.service.ts
export interface SlugChecker {
  isAvailable(slug: string): Promise<boolean>;
}

export class SlugGenerationService {
  async generateUniqueSlug(
    name: string, 
    checker: SlugChecker
  ): Promise<string> {
    const baseSlug = this.createSlug(name);
    let slug = baseSlug;
    let counter = 0;

    while (!(await checker.isAvailable(slug))) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
```

### Phase 2: Implement Proper Repository Pattern (Week 3-4)

#### 2.1 Create Abstract Repository Interfaces

**Tasks**:
- [ ] Define generic repository interface
- [ ] Create specification pattern for queries
- [ ] Implement Unit of Work pattern
- [ ] Remove all ORM imports from domain layer

**Implementation**:
```typescript
// core/ports/shared/repository.interface.ts
export interface Repository<T> {
  findById(id: EntityId): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(entity: T): Promise<void>;
}

// core/ports/shared/specification.interface.ts
export interface Specification<T> {
  isSatisfiedBy(entity: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

// core/ports/shared/unit-of-work.interface.ts
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getRepository<T>(token: symbol): Repository<T>;
}
```

#### 2.2 Refactor Existing Repositories

**Current Problem**: Repositories expose Drizzle ORM methods and types

**Tasks**:
- [ ] Create repository base class that hides ORM details
- [ ] Implement specification pattern for complex queries
- [ ] Move all SQL logic into private methods
- [ ] Remove type casting `(this.db as any)`

**Implementation**:
```typescript
// infrastructure/persistence/base/drizzle-repository.base.ts
export abstract class DrizzleRepository<T, TDb> implements Repository<T> {
  constructor(
    private readonly db: Database,
    private readonly table: Table
  ) {}

  protected abstract toDomain(row: TDb): T;
  protected abstract toDatabase(entity: T): TDb;

  async findById(id: EntityId): Promise<T | null> {
    const row = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id.toString()))
      .limit(1);
    
    return row[0] ? this.toDomain(row[0]) : null;
  }

  async save(entity: T): Promise<void> {
    const data = this.toDatabase(entity);
    await this.db
      .insert(this.table)
      .values(data)
      .onConflictDoUpdate({
        target: this.table.id,
        set: data
      });
  }

  // Complex queries use specifications
  async findBySpecification(spec: DatabaseSpecification): Promise<T[]> {
    const query = spec.toSQL();
    const rows = await this.db.execute(query);
    return rows.map(row => this.toDomain(row));
  }
}
```

**Affected Repositories**:
- `DrizzleTenantRepository`
- `DrizzleUserRepository`
- `DrizzleTransactionRepository`
- `DrizzleConversationRepository`
- All other repository implementations

### Phase 3: Enrich Domain Model (Week 5-6)

#### 3.1 Move Business Logic to Entities

**Current Problem**: Business logic lives in services (anemic domain model)

**Tasks**:
- [ ] Move tenant slug generation to `TenantEntity`
- [ ] Move transaction filtering logic to domain
- [ ] Move conversation business rules to entities
- [ ] Implement domain events

**Implementation**:
```typescript
// core/domain/tenant/tenant.entity.ts
export class TenantEntity extends BaseEntity {
  private events: DomainEvent[] = [];

  static async create(
    props: CreateTenantProps,
    slugService: SlugGenerationService,
    slugChecker: SlugChecker
  ): Promise<TenantEntity> {
    const id = EntityId.generate();
    const slug = await slugService.generateUniqueSlug(
      props.name, 
      slugChecker
    );

    const tenant = new TenantEntity({
      ...props,
      id,
      slug,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    tenant.addEvent(new TenantCreatedEvent(tenant));
    return tenant;
  }

  addOwner(userId: EntityId): TenantMember {
    if (this.hasOwner()) {
      throw new BusinessRuleError('Tenant already has an owner');
    }

    const member = TenantMember.createOwner(this.id, userId);
    this.addEvent(new OwnerAddedEvent(this, member));
    return member;
  }

  suspend(reason: string): void {
    if (!this.isActive()) {
      throw new BusinessRuleError('Can only suspend active tenants');
    }

    this.props.status = 'suspended';
    this.props.suspendedAt = new Date();
    this.props.suspensionReason = reason;
    this.updateTimestamp();

    this.addEvent(new TenantSuspendedEvent(this, reason));
  }

  validateApiLimit(currentUsage: number): void {
    const limit = this.getApiCallLimit();
    if (currentUsage >= limit) {
      throw new ApiLimitExceededError(this.id, limit, currentUsage);
    }
  }

  private hasOwner(): boolean {
    // This would check via repository in use case
    return false;
  }
}
```

#### 3.2 Implement Aggregate Boundaries

**Tasks**:
- [ ] Define aggregate roots clearly
- [ ] Ensure consistency boundaries
- [ ] Implement aggregate-level business rules
- [ ] Create domain events for cross-aggregate communication

**Aggregates to Define**:
1. **Tenant Aggregate**
   - Root: `TenantEntity`
   - Includes: Settings, Subscription
   - Does NOT include: TenantMembers (separate aggregate)

2. **User Aggregate**
   - Root: `UserEntity`
   - Includes: Profile, Preferences

3. **Conversation Aggregate**
   - Root: `ConversationEntity`
   - Includes: Messages, Files
   - Consistency boundary for message ordering

4. **Transaction Aggregate**
   - Root: `TransactionEntity`
   - Includes: TransactionLines

### Phase 4: Create Infrastructure Ports (Week 7-8)

#### 4.1 Abstract External Services

**Current Problem**: Services directly use Twilio, Redis, S3

**Tasks**:
- [ ] Create messaging service port
- [ ] Create cache service port
- [ ] Create file storage port (already exists, needs refinement)
- [ ] Create notification service port

**Implementation**:
```typescript
// core/ports/messaging/messaging.service.ts
export interface MessagingService {
  sendMessage(params: SendMessageParams): Promise<MessageResult>;
  sendVerificationCode(params: VerificationParams): Promise<MessageResult>;
  validateWebhook(signature: string, body: any): boolean;
  downloadMedia(mediaUrl: string): Promise<MediaContent>;
}

// core/ports/cache/cache.service.ts
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// infrastructure/messaging/twilio-messaging.service.ts
export class TwilioMessagingService implements MessagingService {
  constructor(
    private readonly twilioClient: Twilio,
    private readonly config: TwilioConfig
  ) {}

  async sendMessage(params: SendMessageParams): Promise<MessageResult> {
    // Twilio-specific implementation
  }
}
```

#### 4.2 Update Services to Use Ports

**Tasks**:
- [ ] Inject ports instead of concrete implementations
- [ ] Remove all infrastructure imports from services
- [ ] Update DI container configuration

**Example Refactoring**:
```typescript
// Before
import { getTwilioWhatsAppService } from '../integrations/messaging/twilio'

// After
export class ConversationService {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly conversationRepo: ConversationRepository,
    private readonly cacheService: CacheService
  ) {}

  async sendMessage(params: SendMessageDto): Promise<void> {
    // Uses injected port
    await this.messagingService.sendMessage({
      to: params.phoneNumber,
      content: params.content
    });
  }
}
```

### Phase 5: Fix Type System (Week 9-10)

#### 5.1 Centralize Type Definitions

**Current Problem**: Types defined in multiple places

**Tasks**:
- [ ] Move all shared enums to `shared-types` package
- [ ] Remove duplicate type definitions
- [ ] Create clear DTOs for API boundaries
- [ ] Implement type mappers

**Structure**:
```
packages/shared-types/src/
├── enums/
│   ├── channel.enum.ts
│   ├── conversation.enum.ts
│   └── user.enum.ts
├── api/
│   ├── conversation.dto.ts
│   ├── user.dto.ts
│   └── tenant.dto.ts
└── index.ts
```

#### 5.2 Implement DTO Pattern

**Tasks**:
- [ ] Create input/output DTOs for each route
- [ ] Export Zod schemas with TypeScript types
- [ ] Implement mappers between layers

**Implementation**:
```typescript
// api/dto/conversation/create-conversation.dto.ts
export const createConversationSchema = z.object({
  channelId: z.string().uuid(),
  initialMessage: z.string().optional()
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export class CreateConversationOutput {
  constructor(
    public readonly id: string,
    public readonly status: ConversationStatus,
    public readonly createdAt: string
  ) {}

  static fromDomain(entity: ConversationEntity): CreateConversationOutput {
    return new CreateConversationOutput(
      entity.id.toString(),
      entity.status,
      entity.createdAt.toISOString()
    );
  }
}
```

### Phase 6: Implement Proper Testing (Week 11-12)

#### 6.1 Domain Layer Testing

**Tasks**:
- [ ] Unit tests for all domain entities
- [ ] Unit tests for domain services
- [ ] Tests for value objects
- [ ] Tests for domain events

**Test Structure**:
```
tests/
├── unit/
│   ├── domain/
│   │   ├── tenant/
│   │   │   ├── tenant.entity.test.ts
│   │   │   ├── tenant-member.entity.test.ts
│   │   │   └── slug-generation.service.test.ts
│   │   └── conversation/
│   └── application/
├── integration/
│   ├── repositories/
│   └── services/
└── e2e/
```

#### 6.2 Repository Testing

**Tasks**:
- [ ] Integration tests for each repository
- [ ] Test transaction boundaries
- [ ] Test specification queries
- [ ] Test Unit of Work pattern

### Phase 7: Advanced DDD Patterns (Week 13-14)

#### 7.1 Implement Domain Events

**Tasks**:
- [ ] Create event bus abstraction
- [ ] Implement domain event base class
- [ ] Create event handlers
- [ ] Implement eventual consistency

**Implementation**:
```typescript
// core/domain/shared/domain-event.ts
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly aggregateId: EntityId;

  constructor(aggregateId: EntityId) {
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
  }
}

// core/ports/events/event-bus.ts
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void;
}
```

#### 7.2 Implement Saga Pattern

**Tasks**:
- [ ] Create saga orchestrator
- [ ] Implement compensation logic
- [ ] Handle distributed transactions

### Phase 8: Refactor Services (Week 15-16)

#### 8.1 Split Fat Services

**Current Problem**: Services doing too much (e.g., ConversationService)

**Tasks**:
- [ ] Create focused use cases
- [ ] Separate infrastructure concerns
- [ ] Implement application services properly

**New Structure**:
```
core/usecases/conversation/
├── create-conversation.usecase.ts
├── send-message.usecase.ts
├── process-incoming-message.usecase.ts
├── verify-channel.usecase.ts
└── close-conversation.usecase.ts
```

#### 8.2 Remove Direct Database Access

**Tasks**:
- [ ] Refactor TenantService to use repositories
- [ ] Remove all direct Drizzle usage from services
- [ ] Implement proper transaction management

## Migration Execution Plan

### Week 1-2: Domain Isolation
- Remove infrastructure dependencies
- Create domain services
- Move database types to infrastructure

### Week 3-4: Repository Pattern
- Implement specification pattern
- Create Unit of Work
- Refactor all repositories

### Week 5-6: Rich Domain Model
- Move business logic to entities
- Define aggregate boundaries
- Implement domain events

### Week 7-8: Infrastructure Ports
- Abstract all external services
- Update service dependencies
- Configure DI properly

### Week 9-10: Type System
- Centralize type definitions
- Implement DTO pattern
- Create type mappers

### Week 11-12: Testing
- Domain unit tests
- Repository integration tests
- Use case tests

### Week 13-14: Advanced Patterns
- Domain events
- Saga pattern
- Event sourcing preparation

### Week 15-16: Service Refactoring
- Split fat services
- Create focused use cases
- Final cleanup

## Success Metrics

1. **Zero infrastructure imports in domain layer**
2. **100% of business logic in domain entities/services**
3. **All repositories properly abstracted**
4. **No type duplication across layers**
5. **80%+ test coverage on domain logic**
6. **All external services behind ports**
7. **Clear aggregate boundaries**
8. **Event-driven communication between aggregates**

## Risk Mitigation

1. **Gradual Migration**: Each phase is self-contained
2. **Backward Compatibility**: Maintain existing APIs during migration
3. **Feature Flags**: Toggle between old/new implementations
4. **Comprehensive Testing**: Each phase includes testing requirements
5. **Rollback Plan**: Each change should be reversible

## Tools and Libraries

### Required Libraries
- **ts-pattern**: For pattern matching in domain logic
- **neverthrow**: For Result type error handling
- **@types/node**: For crypto UUID generation
- **vitest**: For testing (better than Jest for ESM)

### Development Tools
- **dependency-cruiser**: To enforce architectural boundaries
- **eslint-plugin-boundaries**: To prevent layer violations
- **madge**: To visualize and check circular dependencies

## Architectural Decision Records (ADRs)

### ADR-001: Use Value Objects for IDs
- **Status**: Proposed
- **Context**: Need type-safe IDs across the system
- **Decision**: Use value objects for all entity IDs
- **Consequences**: More boilerplate but prevents ID mixing

### ADR-002: Event-Driven Cross-Aggregate Communication
- **Status**: Proposed
- **Context**: Need loose coupling between aggregates
- **Decision**: Use domain events for all cross-aggregate operations
- **Consequences**: Eventual consistency, more complex debugging

### ADR-003: Specification Pattern for Queries
- **Status**: Proposed
- **Context**: Complex queries leak ORM details
- **Decision**: Implement specification pattern
- **Consequences**: More abstraction layers but true persistence ignorance

## Conclusion

This migration plan transforms the current architectural chaos into a proper DDD implementation. The phased approach ensures system stability while progressively improving the architecture. Each phase builds upon the previous one, creating a solid foundation for a scalable, maintainable system.

The key to success is discipline: resist shortcuts, maintain boundaries, and keep the domain pure. This investment will pay dividends in maintainability, testability, and team velocity.