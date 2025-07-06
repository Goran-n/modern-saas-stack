/**
 * Global test setup
 */

import 'reflect-metadata'
import { container } from '../src/shared/utils/container'
import { factories, resetFactories } from './helpers/factories'
import { 
  createMockRepository,
  createMockUserRepository,
  createMockTenantRepository,
  createMockConversationRepository,
  createMockMessagingService,
  createMockFileStorageService
} from './helpers/mocks'

// Reset state before each test
beforeEach(() => {
  // Reset DI container
  container.reset()
  
  // Reset factory counters
  resetFactories()
  
  // Clear all jest mocks
  if (typeof jest !== 'undefined') {
    jest.clearAllMocks()
  }
})

// Global test utilities
declare global {
  var createMockRepository: typeof createMockRepository
  var createMockUserRepository: typeof createMockUserRepository
  var createMockTenantRepository: typeof createMockTenantRepository
  var createMockConversationRepository: typeof createMockConversationRepository
  var createMockMessagingService: typeof createMockMessagingService
  var createMockFileStorageService: typeof createMockFileStorageService
  var factories: typeof factories
}

global.createMockRepository = createMockRepository
global.createMockUserRepository = createMockUserRepository
global.createMockTenantRepository = createMockTenantRepository
global.createMockConversationRepository = createMockConversationRepository
global.createMockMessagingService = createMockMessagingService
global.createMockFileStorageService = createMockFileStorageService
global.factories = factories

// Environment setup for tests
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret'
process.env.DATABASE_URL = 'postgres://localhost:5432/kibly_test'
process.env.REDIS_URL = 'redis://localhost:6379'

// Suppress console logs during tests unless explicitly needed
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn()
  console.info = jest.fn()
  console.warn = jest.fn()
  // Keep console.error for visibility
}