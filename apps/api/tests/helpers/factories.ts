/**
 * Test data factories for creating test objects
 */

import { 
  UserId, TenantId, IntegrationId, ConversationId, 
  MessageId, InvoiceId, SupplierId, AccountId 
} from '@kibly/shared-types'
import type { UserEntity } from '../../src/core/domain/user'
import type { TenantEntity } from '../../src/core/domain/tenant'
import type { ConversationEntity } from '../../src/core/domain/conversation/conversation.entity'

// Simple ID generators
let idCounter = 1
const generateId = () => `test-id-${idCounter++}`

export const factories = {
  // ID factories
  userId: (): UserId => UserId(generateId()),
  tenantId: (): TenantId => TenantId(generateId()),
  integrationId: (): IntegrationId => IntegrationId(generateId()),
  conversationId: (): ConversationId => ConversationId(generateId()),
  messageId: (): MessageId => MessageId(generateId()),
  invoiceId: (): InvoiceId => InvoiceId(generateId()),
  supplierId: (): SupplierId => SupplierId(generateId()),
  accountId: (): AccountId => AccountId(generateId()),

  // Entity data factories
  userData: (overrides?: Partial<any>) => ({
    id: generateId(),
    email: `test${idCounter}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
    ...overrides
  }),

  tenantData: (overrides?: Partial<any>) => ({
    id: generateId(),
    name: `Test Tenant ${idCounter}`,
    slug: `test-tenant-${idCounter}`,
    email: `tenant${idCounter}@example.com`,
    status: 'active',
    plan: 'trial',
    settings: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
    ...overrides
  }),

  conversationData: (overrides?: Partial<any>) => ({
    id: generateId(),
    channelId: generateId(),
    externalThreadId: `thread-${idCounter}`,
    status: 'active',
    metadata: {},
    messageCount: 0,
    lastMessageAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
    ...overrides
  }),

  integrationData: (overrides?: Partial<any>) => ({
    id: generateId(),
    tenantId: generateId(),
    provider: 'xero',
    integrationType: 'accounting',
    name: `Test Integration ${idCounter}`,
    status: 'active',
    settings: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
    ...overrides
  })
}

// Reset counter for test isolation
export const resetFactories = () => {
  idCounter = 1
}