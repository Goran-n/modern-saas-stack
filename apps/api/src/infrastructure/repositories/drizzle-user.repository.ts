import { eq, count } from 'drizzle-orm'
import { UserEntity, type UserPreferences } from '../../core/domain/user/index'
import type { UserRepository } from '../../core/ports/user.repository'
import { users, type User, type NewUser } from '../../database/schema/users'
import { BaseRepository, type Database } from '../database/types'

export class DrizzleUserRepository extends BaseRepository implements UserRepository {
  constructor(database: Database) {
    super(database)
  }

  async findById(id: string): Promise<UserEntity | null> {
    const result = await (this.db as any).select().from(users).where(eq(users.id, id)).limit(1)
    return result[0] ? this.mapToEntity(result[0]) : null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const result = await (this.db as any).select().from(users).where(eq(users.email, email)).limit(1)
    return result[0] ? this.mapToEntity(result[0]) : null
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const data = this.mapFromEntity(user)
    
    if (await this.exists(user.id)) {
      await (this.db as any).update(users).set(data).where(eq(users.id, user.id))
    } else {
      await (this.db as any).insert(users).values(data as NewUser)
    }
    
    return user
  }

  async delete(id: string): Promise<void> {
    await (this.db as any).delete(users).where(eq(users.id, id))
  }

  async exists(id: string): Promise<boolean> {
    const result = await (this.db as any).select({ count: users.id }).from(users).where(eq(users.id, id)).limit(1)
    return result.length > 0
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const result = await (this.db as any).select().from(users).where(eq(users.phone, phone)).limit(1)
    return result[0] ? this.mapToEntity(result[0]) : null
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await (this.db as any).select({ count: users.id }).from(users).where(eq(users.email, email)).limit(1)
    return result.length > 0
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const result = await (this.db as any).select({ count: users.id }).from(users).where(eq(users.phone, phone)).limit(1)
    return result.length > 0
  }

  async count(): Promise<number> {
    const result = await (this.db as any).select({ count: count() }).from(users)
    return result[0]?.count ?? 0
  }

  async findAll(options?: {
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
  }): Promise<UserEntity[]> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0
    const results = await (this.db as any).select().from(users).limit(limit).offset(offset)
    return results.map((user: User) => this.mapToEntity(user))
  }

  private mapToEntity(data: User): UserEntity {
    // Extract profile from name (assuming name is "firstName lastName")
    const nameParts = data.name.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')
    
    return UserEntity.fromDatabase({
      id: data.id,
      email: data.email,
      phone: data.phone || null,
      profile: {
        firstName,
        lastName: lastName || undefined,
      },
      preferences: (data.preferences as UserPreferences) || {},
      status: 'active',
      emailVerified: data.emailVerified,
      phoneVerified: data.phoneVerified,
      lastLoginAt: data.lastLoginAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: null
    })
  }

  private mapFromEntity(entity: UserEntity): Partial<User> {
    // Combine profile firstName and lastName into name
    const profile = entity.profile
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || entity.email
    
    return {
      id: entity.id,
      name,
      email: entity.email,
      phone: entity.phone || null,
      preferences: entity.preferences || {},
      emailVerified: entity.emailVerified,
      phoneVerified: entity.phoneVerified,
      lastLoginAt: entity.lastLoginAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    }
  }
}