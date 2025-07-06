# DDD Testing Strategy

## Overview

This document outlines the testing strategy for our Domain-Driven Design architecture, ensuring testability at all layers while maintaining clean separation of concerns.

## Testing Principles

1. **Test the behaviour, not the implementation**
2. **Follow the testing pyramid** - more unit tests, fewer integration tests, minimal E2E tests
3. **Mock at architectural boundaries** - repositories, external services, etc.
4. **Use test doubles appropriately** - stubs for queries, mocks for commands
5. **Keep tests focused and fast**

## Layer-Specific Testing Strategies

### 1. Domain Layer Testing

The domain layer should be tested in complete isolation with no external dependencies.

#### What to Test
- Entity business logic and invariants
- Value object validation and equality
- Domain service calculations and rules
- Aggregate boundaries and consistency

#### Test Structure
```typescript
// Example: tests/unit/domain/user.entity.test.ts
describe('UserEntity', () => {
  describe('create', () => {
    it('should create a user with valid data', () => {
      // Test entity creation
    })
    
    it('should throw error for invalid email', () => {
      // Test validation
    })
  })
  
  describe('business logic', () => {
    it('should suspend user after 3 failed login attempts', () => {
      // Test domain rules
    })
  })
})
```

### 2. Application Service Testing

Application services orchestrate use cases and should be tested with mocked dependencies.

#### What to Test
- Use case orchestration flow
- Transaction boundaries
- Error handling and recovery
- Authorization checks

#### Test Structure
```typescript
// Example: tests/unit/application/user.application-service.test.ts
describe('UserApplicationService', () => {
  let service: UserApplicationService
  let mockUserRepo: jest.Mocked<UserRepository>
  let mockEmailService: jest.Mocked<EmailService>
  
  beforeEach(() => {
    mockUserRepo = createMockRepository<UserRepository>()
    mockEmailService = createMockService<EmailService>()
    service = new UserApplicationService(mockUserRepo, mockEmailService)
  })
  
  describe('registerUser', () => {
    it('should create user and send welcome email', async () => {
      // Test the complete flow
    })
  })
})
```

### 3. Repository Testing

Repository tests are integration tests that verify database interactions.

#### What to Test
- CRUD operations
- Query methods
- Transaction handling
- Database constraints

#### Test Structure
```typescript
// Example: tests/integration/repositories/user.repository.test.ts
describe('DrizzleUserRepository', () => {
  let repository: DrizzleUserRepository
  let testDb: TestDatabase
  
  beforeAll(async () => {
    testDb = await TestDatabase.create()
    repository = new DrizzleUserRepository(testDb.queryExecutor)
  })
  
  afterEach(async () => {
    await testDb.cleanup()
  })
  
  describe('findById', () => {
    it('should return user when exists', async () => {
      // Test with real database
    })
  })
})
```

### 4. API/Router Testing

API tests verify the HTTP interface and request/response handling.

#### What to Test
- Route handlers
- Input validation
- Response formatting
- Error responses

#### Test Structure
```typescript
// Example: tests/integration/routers/user.router.test.ts
describe('User Router', () => {
  let app: Application
  
  beforeAll(() => {
    app = createTestApp()
  })
  
  describe('POST /users', () => {
    it('should create user with valid data', async () => {
      const response = await request(app)
        .post('/users')
        .send({ email: 'test@example.com' })
      
      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          email: 'test@example.com'
        })
      })
    })
  })
})
```

### 5. E2E Testing

End-to-end tests verify complete user journeys through the system.

#### What to Test
- Critical user flows
- Integration between services
- Real-world scenarios

#### Test Structure
```typescript
// Example: tests/e2e/user-registration.e2e.test.ts
describe('User Registration Flow', () => {
  it('should allow user to register and verify email', async () => {
    // 1. Register user via API
    // 2. Check email was sent
    // 3. Verify email token
    // 4. Login with new account
  })
})
```

## Test Infrastructure

### 1. Test Helpers

```typescript
// tests/helpers/factories.ts
export const factories = {
  user: (overrides?: Partial<UserProps>) => ({
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    ...overrides
  }),
  
  tenant: (overrides?: Partial<TenantProps>) => ({
    id: faker.datatype.uuid(),
    name: faker.company.name(),
    ...overrides
  })
}

// tests/helpers/mocks.ts
export function createMockRepository<T>(): jest.Mocked<T> {
  return {
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    // ... other methods
  } as any
}

// tests/helpers/test-database.ts
export class TestDatabase {
  static async create() {
    // Create isolated test database
  }
  
  async cleanup() {
    // Clean up test data
  }
}
```

### 2. Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ]
    }
  },
  resolve: {
    alias: {
      '@': './src',
      '@tests': './tests'
    }
  }
})
```

### 3. Test Setup

```typescript
// tests/setup.ts
import 'reflect-metadata'
import { container } from '@/shared/utils/container'

beforeEach(() => {
  // Reset container state
  container.reset()
  
  // Clear all mocks
  jest.clearAllMocks()
})

// Global test utilities
global.createMockRepository = createMockRepository
global.factories = factories
```

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern
```typescript
it('should calculate order total correctly', () => {
  // Arrange
  const order = new Order()
  order.addItem(new OrderItem('SKU001', 2, 10.00))
  
  // Act
  const total = order.calculateTotal()
  
  // Assert
  expect(total).toBe(20.00)
})
```

### 2. Test Data Builders
```typescript
class UserBuilder {
  private props: Partial<UserProps> = {}
  
  withEmail(email: string): this {
    this.props.email = email
    return this
  }
  
  suspended(): this {
    this.props.status = UserStatus.SUSPENDED
    return this
  }
  
  build(): UserEntity {
    return UserEntity.create({
      email: 'default@example.com',
      ...this.props
    })
  }
}
```

### 3. Custom Matchers
```typescript
// tests/matchers/domain-matchers.ts
expect.extend({
  toBeValidEmail(received: string) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received)
    return {
      pass: valid,
      message: () => `Expected ${received} to be a valid email`
    }
  }
})
```

## Test Execution Strategy

### 1. Unit Tests
- Run on every commit
- Must pass before PR merge
- Target: < 5 seconds total

### 2. Integration Tests
- Run on PR creation/update
- Test against real databases
- Target: < 30 seconds total

### 3. E2E Tests
- Run before deployment
- Test critical paths only
- Target: < 5 minutes total

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: npm run test:integration
```

## Measuring Test Quality

### 1. Code Coverage Targets
- Domain Layer: 95%+
- Application Layer: 85%+
- Infrastructure Layer: 70%+
- Overall: 80%+

### 2. Mutation Testing
Use mutation testing to verify test quality:
```bash
npm run test:mutation
```

### 3. Test Review Checklist
- [ ] Tests are independent and can run in any order
- [ ] Tests use appropriate test doubles
- [ ] Tests verify behaviour, not implementation
- [ ] Tests have clear, descriptive names
- [ ] Tests follow AAA pattern
- [ ] Tests clean up after themselves