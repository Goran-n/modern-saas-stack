/**
 * Mock creators for testing
 */

import type { UserRepository } from '../../src/core/ports/user.repository'
import type { TenantRepository } from '../../src/core/ports/tenant.repository'
import type { ConversationRepository } from '../../src/core/ports/conversation/conversation.repository'
import type { MessagingService } from '../../src/core/ports/messaging/messaging.service'
import type { FileStorageService } from '../../src/core/ports/file-storage.service'

// Generic mock repository creator
export function createMockRepository<T>(): jest.Mocked<T> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(false),
    count: jest.fn().mockResolvedValue(0),
  } as any
}

// Specific mock creators with proper typing
export function createMockUserRepository(): jest.Mocked<UserRepository> {
  const base = createMockRepository<UserRepository>()
  return {
    ...base,
    findByEmail: jest.fn().mockResolvedValue(null),
    findByPhone: jest.fn().mockResolvedValue(null),
    findByTenantId: jest.fn().mockResolvedValue([]),
  }
}

export function createMockTenantRepository(): jest.Mocked<TenantRepository> {
  const base = createMockRepository<TenantRepository>()
  return {
    ...base,
    findBySlug: jest.fn().mockResolvedValue(null),
    findByUserId: jest.fn().mockResolvedValue([]),
  }
}

export function createMockConversationRepository(): jest.Mocked<ConversationRepository> {
  const base = createMockRepository<ConversationRepository>()
  return {
    ...base,
    findByChannelId: jest.fn().mockResolvedValue([]),
    findByExternalThreadId: jest.fn().mockResolvedValue(null),
    findActiveByChannelId: jest.fn().mockResolvedValue([]),
  }
}

// Mock service creators
export function createMockMessagingService(): jest.Mocked<MessagingService> {
  return {
    sendMessage: jest.fn().mockResolvedValue({
      messageId: 'msg-123',
      status: 'sent',
    }),
    sendVerificationCode: jest.fn().mockResolvedValue({
      messageId: 'msg-456',
      status: 'sent',
    }),
    sendBulkMessages: jest.fn().mockResolvedValue({
      successful: [],
      failed: [],
    }),
    validateWebhook: jest.fn().mockReturnValue(true),
    downloadMedia: jest.fn().mockResolvedValue({
      data: Buffer.from('test'),
      contentType: 'image/jpeg',
      size: 1024,
    }),
    getMessageStatus: jest.fn().mockResolvedValue({
      status: 'delivered',
      deliveredAt: new Date(),
    }),
  }
}

export function createMockFileStorageService(): jest.Mocked<FileStorageService> {
  return {
    upload: jest.fn().mockResolvedValue({
      url: 'https://storage.example.com/file.jpg',
      key: 'file-key-123',
    }),
    download: jest.fn().mockResolvedValue(Buffer.from('test')),
    delete: jest.fn().mockResolvedValue(undefined),
    generatePresignedUrl: jest.fn().mockResolvedValue('https://storage.example.com/signed-url'),
    exists: jest.fn().mockResolvedValue(true),
  }
}

// Mock transaction helper
export function createMockTransaction() {
  return {
    commit: jest.fn(),
    rollback: jest.fn(),
    isActive: true,
  }
}