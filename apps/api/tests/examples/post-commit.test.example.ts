/**
 * Example tests for services using PostCommitManager
 * Shows how to test async operations with post-commit hooks
 */

import { ConversationService } from '../../src/services/conversation.service'
import { TenantService } from '../../src/services/tenant.service'
import { TestPostCommitManager, createMockLogger } from '../helpers/post-commit-test-helper'
import { 
  createMockConversationRepository,
  createMockMessagingService,
  createMockUserChannelService 
} from '../helpers/mocks'

// Mock the PostCommitManager module
jest.mock('../../src/core/application/base/post-commit-manager', () => ({
  PostCommitManager: jest.fn().mockImplementation((logger) => {
    return new TestPostCommitManager(logger, { executeSync: true })
  })
}))

describe('Services with PostCommit Hooks', () => {
  describe('ConversationService', () => {
    let service: ConversationService
    let mockLogger: any
    let mockMessaging: any
    let mockChannelService: any
    
    beforeEach(() => {
      mockLogger = createMockLogger()
      mockMessaging = createMockMessagingService()
      mockChannelService = createMockUserChannelService()
      
      // Setup service with mocks
      service = new ConversationService(
        createMockConversationRepository(),
        createMockMessageRepository(),
        mockChannelService,
        createMockFileService(),
        mockMessaging,
        mockLogger
      )
    })
    
    it('should process message and execute post-commit hooks', async () => {
      // Arrange
      const dto = {
        tenantId: 'tenant-123',
        from: '+1234567890',
        to: '+0987654321',
        body: 'Test message',
        messageSid: 'msg-123'
      }
      
      mockChannelService.findByWhatsAppNumber.mockResolvedValue({
        id: 'channel-123',
        isVerified: true,
        userId: 'user-123',
        tenantId: 'tenant-123',
        channelIdentifier: '+1234567890'
      })
      
      // Act
      await service.processIncomingWhatsAppMessage(dto)
      
      // Assert - main operation completed
      expect(mockChannelService.updateChannelActivity).toHaveBeenCalled()
      
      // Assert - post-commit hooks executed
      expect(mockMessaging.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ text: expect.stringContaining('Thank you') })
      )
    })
    
    it('should handle post-commit hook failures gracefully', async () => {
      // Arrange
      mockMessaging.sendMessage.mockRejectedValue(new Error('Network error'))
      
      // Act - should not throw even if post-commit hook fails
      await expect(service.processIncomingWhatsAppMessage({
        tenantId: 'tenant-123',
        from: '+1234567890',
        to: '+0987654321',
        body: 'Test message',
        messageSid: 'msg-123'
      })).resolves.not.toThrow()
      
      // Assert - error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Post-commit hook'),
        expect.any(Error)
      )
    })
  })
  
  describe('TenantService - Testing with controlled hooks', () => {
    it('should track post-commit hook execution', async () => {
      // Create service with test post-commit manager
      const testManager = new TestPostCommitManager(createMockLogger())
      
      // Simulate what the service would do
      testManager.addHook(async () => {
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      testManager.addHook(async () => {
        // Simulate analytics tracking
        await new Promise(resolve => setTimeout(resolve, 5))
      })
      
      // Assert hooks are registered
      expect(testManager.hookCount).toBe(2)
      testManager.expectHookCount(2)
      
      // Execute hooks
      await testManager.execute()
      
      // Assert execution
      expect(testManager.executedHooks).toBe(2)
      expect(testManager.executedSuccessfully).toBe(2)
      expect(testManager.executedWithError).toBe(0)
      testManager.expectAllSuccess()
    })
  })
  
  describe('Testing with different environments', () => {
    it('should skip post-commit hooks when configured', async () => {
      // Arrange
      process.env.SKIP_POST_COMMIT = 'true'
      const testManager = new TestPostCommitManager()
      
      testManager.addHook(async () => {
        throw new Error('Should not execute')
      })
      
      // Act
      await testManager.execute()
      
      // Assert - hooks were not executed
      expect(testManager.executedSuccessfully).toBe(0)
      expect(testManager.executedWithError).toBe(0)
      
      // Cleanup
      delete process.env.SKIP_POST_COMMIT
    })
    
    it('should execute hooks synchronously in test mode', async () => {
      // Arrange
      const testManager = new TestPostCommitManager(undefined, { executeSync: true })
      let executed = false
      
      testManager.addHook(async () => {
        executed = true
      })
      
      // Act
      await testManager.execute()
      
      // Assert - hook executed immediately
      expect(executed).toBe(true)
    })
  })
})