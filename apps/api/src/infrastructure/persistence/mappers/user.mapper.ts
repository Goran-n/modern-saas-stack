import { UserEntity, type UserEntityProps, type UserPreferences } from '../../../core/domain/user/user.entity'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'
import type { UserDatabaseRow } from '../types/user.types'

export class UserMapper {
  static toDomain(row: UserDatabaseRow): UserEntity {
    // Extract profile from name (assuming name is "firstName lastName")
    const nameParts = row.name.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')
    
    const props: UserEntityProps = {
      id: EntityId.from(row.id),
      email: row.email,
      phone: row.phone,
      profile: {
        firstName,
        lastName: lastName || undefined,
      },
      preferences: (row.preferences as UserPreferences) || {},
      status: 'active', // Assuming active as default since not stored in DB
      emailVerified: row.email_verified,
      phoneVerified: row.phone_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: null, // Not in current schema
      version: 1 // Default version for reconstituted entities
    }
    
    return UserEntity.reconstitute(props)
  }

  static toDatabase(entity: UserEntity): UserDatabaseRow {
    // Combine profile firstName and lastName into name
    const profile = entity.profile
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || entity.email
    
    return {
      id: entity.id.toString(),
      name,
      email: entity.email,
      phone: entity.phone,
      preferences: entity.preferences || {},
      email_verified: entity.emailVerified,
      phone_verified: entity.phoneVerified,
      last_login_at: entity.lastLoginAt,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    }
  }

  static toPersistence(entity: UserEntity): Record<string, any> {
    // For insert/update operations - camelCase keys
    const profile = entity.profile
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || entity.email
    
    return {
      id: entity.id.toString(),
      name,
      email: entity.email,
      phone: entity.phone,
      preferences: entity.preferences || {},
      emailVerified: entity.emailVerified,
      phoneVerified: entity.phoneVerified,
      lastLoginAt: entity.lastLoginAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    }
  }
}