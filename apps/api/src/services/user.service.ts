import type { UserRepository } from '../core/ports/user.repository'
import type { UserEntity } from '../core/domain/user'
import { UserEntity as UserEntityClass } from '../core/domain/user'
import { container, TOKENS } from '../shared/utils/container'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'

export interface CreateUserData {
  email: string
  password?: string
  emailVerified?: boolean
  profile?: {
    firstName?: string
    lastName?: string
    avatar?: string
  }
}

export interface UpdateUserData {
  email?: string
  emailVerified?: boolean
  profile?: {
    firstName?: string
    lastName?: string
    avatar?: string
  }
}

export class UserService {
  constructor() {}

  async findById(id: string): Promise<UserEntity | null> {
    const repository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY)
    return repository.findById(id)
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const repository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY)
    return repository.findByEmail(email)
  }

  async createUser(data: CreateUserData): Promise<UserEntity> {
    const repository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY)
    
    // Check if user already exists
    const existing = await repository.findByEmail(data.email)
    if (existing) {
      throw new Error('User with this email already exists')
    }

    // Create user entity
    const userId = EntityId.generate().toString()
    const user = UserEntityClass.create(
      userId,
      data.email,
      data.profile ? { profile: data.profile } : {}
    )

    return repository.save(user)
  }

  async updateUser(id: string, data: UpdateUserData): Promise<UserEntity> {
    const repository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY)
    
    const user = await repository.findById(id)
    if (!user) {
      throw new Error('User not found')
    }

    // Update fields
    if (data.email && data.email !== user.email) {
      // Check if new email is already taken
      const existingWithEmail = await repository.findByEmail(data.email)
      if (existingWithEmail && existingWithEmail.id.toString() !== id) {
        throw new Error('Email already in use')
      }
      user.changeEmail(data.email)
    }

    if (data.emailVerified !== undefined) {
      if (data.emailVerified) {
        user.verifyEmail()
      }
    }

    if (data.profile) {
      user.updateProfile(data.profile)
    }

    return repository.save(user)
  }

  async updateEmail(userId: string, newEmail: string): Promise<UserEntity> {
    return this.updateUser(userId, { email: newEmail })
  }

  async verifyEmail(userId: string): Promise<UserEntity> {
    return this.updateUser(userId, { emailVerified: true })
  }

  async updateProfile(userId: string, profile: any): Promise<UserEntity> {
    return this.updateUser(userId, { profile })
  }

  async deleteUser(id: string): Promise<void> {
    const repository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY)
    return repository.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const repository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY)
    return repository.exists(id)
  }

  async existsByEmail(email: string): Promise<boolean> {
    const repository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY)
    const user = await repository.findByEmail(email)
    return !!user
  }
}