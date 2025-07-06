/**
 * Example test pattern for repository integration tests
 * This shows how to test database interactions with a real test database
 */

import { DrizzleUserRepository } from '../../src/infrastructure/repositories/drizzle-user.repository'
import { TestDatabase } from '../helpers/test-database'
import { aUser } from '../helpers/test-builders'
import { factories } from '../helpers/factories'
import { UserEntity } from '../../src/core/domain/user'

describe('DrizzleUserRepository - Integration Testing Example', () => {
  let repository: DrizzleUserRepository
  let testDb: TestDatabase

  beforeAll(async () => {
    // Setup test database
    testDb = await TestDatabase.create()
    repository = new DrizzleUserRepository(testDb.queryExecutor)
  })

  afterEach(async () => {
    // Clean up test data after each test
    await testDb.cleanup()
  })

  afterAll(async () => {
    // Destroy test database
    await testDb.destroy()
  })

  describe('CRUD Operations', () => {
    it('should save and retrieve a user', async () => {
      // Arrange
      const user = aUser()
        .withEmail('test@example.com')
        .withName('John', 'Doe')
        .build()

      // Act
      const savedUser = await repository.save(user)
      const retrievedUser = await repository.findById(savedUser.id)

      // Assert
      expect(retrievedUser).toBeDefined()
      expect(retrievedUser?.email).toBe('test@example.com')
      expect(retrievedUser?.firstName).toBe('John')
      expect(retrievedUser?.lastName).toBe('Doe')
      expect(retrievedUser?.version).toBe(0)
    })

    it('should update existing user', async () => {
      // Arrange
      const user = await repository.save(
        aUser().withEmail('original@example.com').build()
      )
      
      // Act
      user.updateProfile({ firstName: 'Updated' })
      const updatedUser = await repository.save(user)

      // Assert
      expect(updatedUser.firstName).toBe('Updated')
      expect(updatedUser.version).toBe(1)
      
      // Verify in database
      const retrieved = await repository.findById(user.id)
      expect(retrieved?.firstName).toBe('Updated')
      expect(retrieved?.version).toBe(1)
    })

    it('should handle optimistic locking', async () => {
      // Arrange
      const user = await repository.save(aUser().build())
      
      // Simulate concurrent modification
      const user1 = await repository.findById(user.id)
      const user2 = await repository.findById(user.id)
      
      // Act - First update succeeds
      user1!.updateProfile({ firstName: 'First' })
      await repository.save(user1!)
      
      // Act - Second update should fail
      user2!.updateProfile({ firstName: 'Second' })
      
      // Assert
      await expect(repository.save(user2!))
        .rejects.toThrow('Optimistic lock error')
    })
  })

  describe('Query Methods', () => {
    it('should find user by email', async () => {
      // Arrange
      await repository.save(
        aUser().withEmail('unique@example.com').build()
      )

      // Act
      const found = await repository.findByEmail('unique@example.com')

      // Assert
      expect(found).toBeDefined()
      expect(found?.email).toBe('unique@example.com')
    })

    it('should return null for non-existent email', async () => {
      // Act
      const found = await repository.findByEmail('nonexistent@example.com')

      // Assert
      expect(found).toBeNull()
    })

    it('should find users by tenant', async () => {
      // Arrange
      const tenantId = factories.tenantId()
      
      await repository.save(
        aUser().withEmail('user1@example.com').build()
      )
      await repository.save(
        aUser().withEmail('user2@example.com').build()
      )
      
      // Note: In real implementation, you'd also need to save tenant membership

      // Act
      const users = await repository.findByTenantId(tenantId)

      // Assert
      expect(users).toHaveLength(2)
      expect(users.map(u => u.email)).toContain('user1@example.com')
      expect(users.map(u => u.email)).toContain('user2@example.com')
    })
  })

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      // Arrange - Create 25 users
      for (let i = 1; i <= 25; i++) {
        await repository.save(
          aUser().withEmail(`user${i}@example.com`).build()
        )
      }

      // Act - Get first page
      const page1 = await repository.findAll({ limit: 10, offset: 0 })
      const page2 = await repository.findAll({ limit: 10, offset: 10 })
      const page3 = await repository.findAll({ limit: 10, offset: 20 })

      // Assert
      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(10)
      expect(page3).toHaveLength(5)
      
      // Verify no duplicates
      const allEmails = [
        ...page1.map(u => u.email),
        ...page2.map(u => u.email),
        ...page3.map(u => u.email)
      ]
      expect(new Set(allEmails).size).toBe(25)
    })
  })

  describe('Transactions', () => {
    it('should rollback on error', async () => {
      // Arrange
      const user = aUser().build()
      
      try {
        await testDb.queryExecutor.transaction(async (tx) => {
          // Save user in transaction
          await repository.save(user)
          
          // Force error
          throw new Error('Simulated error')
        })
      } catch (error) {
        // Expected error
      }

      // Assert - User should not exist due to rollback
      const found = await repository.findById(user.id)
      expect(found).toBeNull()
    })
  })
})