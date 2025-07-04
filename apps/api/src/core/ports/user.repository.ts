import type { UserEntity } from '../domain/user'

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByPhone(phone: string): Promise<UserEntity | null>
  save(user: UserEntity): Promise<UserEntity>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  existsByEmail(email: string, excludeId?: string): Promise<boolean>
  existsByPhone(phone: string, excludeId?: string): Promise<boolean>
  count(): Promise<number>
  findAll(options?: {
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
  }): Promise<UserEntity[]>
}