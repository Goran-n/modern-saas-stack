/**
 * Example test pattern for API routers
 * This shows how to test HTTP endpoints with mocked services
 */

import { createCallerFactory } from '../../src/lib/trpc'
import { userRouter } from '../../src/routers/user'
import { container, TOKENS } from '../../src/shared/utils/container'
import { createMockUserService } from '../helpers/mocks'
import { aUser } from '../helpers/test-builders'
import { factories } from '../helpers/factories'
import { TRPCError } from '@trpc/server'
import type { UserService } from '../../src/services/user.service'

describe('User Router - API Testing Example', () => {
  let caller: any
  let mockUserService: jest.Mocked<UserService>

  beforeEach(() => {
    // Reset container
    container.reset()
    
    // Setup mock service
    mockUserService = createMockUserService()
    container.register(TOKENS.USER_SERVICE, { useValue: mockUserService })
    
    // Create test caller with context
    const createCaller = createCallerFactory(userRouter)
    caller = createCaller({
      user: { id: factories.userId(), email: 'test@example.com' },
      tenantContext: { tenantId: factories.tenantId() }
    })
  })

  describe('GET /users/me', () => {
    it('should return current user', async () => {
      // Arrange
      const currentUser = aUser()
        .withEmail('test@example.com')
        .build()
      
      mockUserService.getById.mockResolvedValue(currentUser)

      // Act
      const response = await caller.me()

      // Assert
      expect(response).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          email: 'test@example.com',
          status: 'active'
        }
      })
      
      expect(mockUserService.getById).toHaveBeenCalledWith(
        expect.any(String)
      )
    })

    it('should return 404 when user not found', async () => {
      // Arrange
      mockUserService.getById.mockResolvedValue(null)

      // Act & Assert
      await expect(caller.me()).rejects.toThrow(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      )
    })
  })

  describe('POST /users', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePass123!'
      }
      
      const createdUser = aUser()
        .withEmail(userData.email)
        .withName(userData.firstName, userData.lastName)
        .build()
      
      mockUserService.createUser.mockResolvedValue(createdUser)

      // Act
      const publicCaller = createCallerFactory(userRouter)({})
      const response = await publicCaller.create(userData)

      // Assert
      expect(response).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        }
      })
      
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password
      })
    })

    it('should validate email format', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User'
      }

      // Act & Assert
      const publicCaller = createCallerFactory(userRouter)({})
      await expect(publicCaller.create(invalidData))
        .rejects.toThrow('Invalid email')
    })
  })

  describe('PUT /users/:id', () => {
    it('should allow user to update own profile', async () => {
      // Arrange
      const userId = factories.userId()
      const updateData = {
        userId: userId,
        firstName: 'Updated',
        lastName: 'Name'
      }
      
      const updatedUser = aUser()
        .withId(userId)
        .withName('Updated', 'Name')
        .build()
      
      mockUserService.updateUser.mockResolvedValue(updatedUser)
      
      // Create caller with matching user ID
      const callerAsOwner = createCallerFactory(userRouter)({
        user: { id: userId, email: 'test@example.com' },
        tenantContext: { tenantId: factories.tenantId() }
      })

      // Act
      const response = await callerAsOwner.update(updateData)

      // Assert
      expect(response).toMatchObject({
        success: true,
        data: {
          firstName: 'Updated',
          lastName: 'Name'
        }
      })
    })

    it('should require admin role to update other users', async () => {
      // Arrange
      const otherUserId = factories.userId()
      const adminUser = aUser()
        .withRole('admin')
        .build()
      
      mockUserService.getById.mockResolvedValue(adminUser)

      // Act & Assert
      await expect(caller.update({
        userId: otherUserId,
        firstName: 'Updated'
      })).rejects.toThrow(
        new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied'
        })
      )
    })
  })

  describe('Input Validation', () => {
    it('should validate pagination parameters', async () => {
      // Act & Assert
      await expect(caller.list({
        limit: 200, // Exceeds max
        offset: -1   // Negative offset
      })).rejects.toThrow()
    })

    it('should provide default pagination', async () => {
      // Arrange
      mockUserService.listUsers.mockResolvedValue({
        users: [],
        total: 0
      })

      // Act
      await caller.list({})

      // Assert
      expect(mockUserService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 0
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      mockUserService.getById.mockRejectedValue(
        new Error('Database connection failed')
      )

      // Act
      const response = await caller.me()

      // Assert
      expect(response).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed'
        }
      })
    })
  })
})