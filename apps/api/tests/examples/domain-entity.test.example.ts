/**
 * Example test pattern for domain entities
 * This shows how to test domain logic in isolation
 */

import { UserEntity } from '../../src/core/domain/user'
import { aUser } from '../helpers/test-builders'
import { UserStatus } from '@kibly/shared-types'

describe('UserEntity - Domain Testing Example', () => {
  describe('Creation and Validation', () => {
    it('should create a valid user entity', () => {
      // Act
      const user = UserEntity.create({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })

      // Assert
      expect(user).toBeDefined()
      expect(user.email).toBe('test@example.com')
      expect(user.status).toBe(UserStatus.ACTIVE)
      expect(user.id).toBeDefined()
    })

    it('should throw error for invalid email', () => {
      // Act & Assert
      expect(() => {
        UserEntity.create({
          email: 'invalid-email',
          firstName: 'John',
          lastName: 'Doe'
        })
      }).toThrow('Invalid email format')
    })
  })

  describe('Business Logic', () => {
    it('should suspend user after 3 failed login attempts', () => {
      // Arrange
      const user = aUser().build()

      // Act
      user.recordFailedLogin()
      user.recordFailedLogin()
      user.recordFailedLogin()

      // Assert
      expect(user.status).toBe(UserStatus.SUSPENDED)
      expect(user.getFailedLoginAttempts()).toBe(3)
    })

    it('should reset failed attempts on successful login', () => {
      // Arrange
      const user = aUser().build()
      user.recordFailedLogin()
      user.recordFailedLogin()

      // Act
      user.recordSuccessfulLogin()

      // Assert
      expect(user.getFailedLoginAttempts()).toBe(0)
    })
  })

  describe('Domain Events', () => {
    it('should emit UserSuspended event when suspended', () => {
      // Arrange
      const user = aUser().build()

      // Act
      user.suspend('Too many failed attempts')

      // Assert
      const events = user.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventName).toBe('UserSuspended')
      expect(events[0].payload).toMatchObject({
        userId: user.id,
        reason: 'Too many failed attempts'
      })
    })
  })

  describe('Invariants', () => {
    it('should not allow activation of deleted user', () => {
      // Arrange
      const user = aUser()
        .withStatus(UserStatus.DELETED)
        .build()

      // Act & Assert
      expect(() => user.activate()).toThrow('Cannot activate deleted user')
    })
  })
})