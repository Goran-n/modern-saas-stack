/**
 * Example test pattern for application services
 * This shows how to test use case orchestration with mocked dependencies
 */

import { UserApplicationService } from '../../src/core/application/user.application-service'
import { 
  createMockUserRepository, 
  createMockMessagingService,
  createMockTransaction 
} from '../helpers/mocks'
import { aUser, aTenant } from '../helpers/test-builders'
import { factories } from '../helpers/factories'
import type { UserRepository } from '../../src/core/ports/user.repository'
import type { MessagingService } from '../../src/core/ports/messaging/messaging.service'

describe('UserApplicationService - Application Layer Testing Example', () => {
  let service: UserApplicationService
  let mockUserRepo: jest.Mocked<UserRepository>
  let mockMessaging: jest.Mocked<MessagingService>
  let mockTransaction: any

  beforeEach(() => {
    // Setup mocks
    mockUserRepo = createMockUserRepository()
    mockMessaging = createMockMessagingService()
    mockTransaction = createMockTransaction()
    
    // Create service with mocked dependencies
    service = new UserApplicationService(
      mockUserRepo,
      mockMessaging
    )
  })

  describe('registerUser', () => {
    it('should create user and send welcome email', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        tenantId: factories.tenantId()
      }
      
      const createdUser = aUser()
        .withEmail(userData.email)
        .withName(userData.firstName, userData.lastName)
        .build()
      
      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockUserRepo.save.mockResolvedValue(createdUser)

      // Act
      const result = await service.registerUser(userData)

      // Assert
      expect(result).toBeDefined()
      expect(result.email).toBe(userData.email)
      
      // Verify repository calls
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(userData.email)
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        })
      )
      
      // Verify email was sent
      expect(mockMessaging.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userData.email,
          templateId: 'welcome-email'
        })
      )
    })

    it('should throw error if email already exists', async () => {
      // Arrange
      const existingUser = aUser().build()
      mockUserRepo.findByEmail.mockResolvedValue(existingUser)

      // Act & Assert
      await expect(service.registerUser({
        email: existingUser.email,
        firstName: 'New',
        lastName: 'User'
      })).rejects.toThrow('Email already registered')
      
      expect(mockUserRepo.save).not.toHaveBeenCalled()
      expect(mockMessaging.sendMessage).not.toHaveBeenCalled()
    })
  })

  describe('suspendUser', () => {
    it('should suspend user and notify them', async () => {
      // Arrange
      const user = aUser().build()
      mockUserRepo.findById.mockResolvedValue(user)
      mockUserRepo.save.mockResolvedValue(user)

      // Act
      await service.suspendUser(user.id, 'Policy violation')

      // Assert
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'suspended'
        })
      )
      
      expect(mockMessaging.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          templateId: 'account-suspended',
          templateParams: {
            reason: 'Policy violation'
          }
        })
      )
    })
  })

  describe('Transaction handling', () => {
    it('should rollback on error', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockUserRepo.save.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(service.registerUser({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      })).rejects.toThrow('Database error')
      
      // Verify no email was sent due to rollback
      expect(mockMessaging.sendMessage).not.toHaveBeenCalled()
    })
  })
})