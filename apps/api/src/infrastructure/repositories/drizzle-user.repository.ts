import { UserEntity } from '../../core/domain/user/index'
import type { UserRepository } from '../../core/ports/user.repository'
import { UserMapper } from '../persistence/mappers/user.mapper'
import type { 
  QueryExecutor
} from '../persistence/query-executor'
import {
  FindByIdQuery,
  FindOneQuery,
  FindManyQuery,
  ExistsQuery,
  InsertQuery,
  UpdateQuery,
  DeleteQuery,
  CountQuery
} from '../persistence/query-executor'

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly queryExecutor: QueryExecutor) {}

  async findById(id: string): Promise<UserEntity | null> {
    const query = new FindByIdQuery('users', id)
    const result = await this.queryExecutor.execute(query)
    return result ? UserMapper.toDomain(result) : null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const query = new FindOneQuery('users', { email })
    const result = await this.queryExecutor.execute(query)
    return result ? UserMapper.toDomain(result) : null
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const data = UserMapper.toPersistence(user)
    
    if (await this.exists(user.id.toString())) {
      const updateQuery = new UpdateQuery('users', { id: user.id.toString() }, data)
      await this.queryExecutor.executeUpdate(updateQuery)
    } else {
      const insertQuery = new InsertQuery('users', data)
      await this.queryExecutor.executeInsert(insertQuery)
    }
    
    return user
  }

  async delete(id: string): Promise<void> {
    const query = new DeleteQuery('users', { id })
    await this.queryExecutor.executeDelete(query)
  }

  async exists(id: string): Promise<boolean> {
    const query = new ExistsQuery('users', { id })
    return this.queryExecutor.executeExists(query)
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const query = new FindOneQuery('users', { phone })
    const result = await this.queryExecutor.execute(query)
    return result ? UserMapper.toDomain(result) : null
  }

  async existsByEmail(email: string): Promise<boolean> {
    const query = new ExistsQuery('users', { email })
    return this.queryExecutor.executeExists(query)
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const query = new ExistsQuery('users', { phone })
    return this.queryExecutor.executeExists(query)
  }

  async count(): Promise<number> {
    const query = new CountQuery('users')
    return this.queryExecutor.executeCount(query)
  }

  async findAll(options?: {
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
  }): Promise<UserEntity[]> {
    const queryOptions: any = {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0
    }
    
    if (options?.sortBy) {
      queryOptions.orderBy = {
        field: options.sortBy,
        direction: options.sortOrder ?? 'asc'
      }
    }
    
    const query = new FindManyQuery('users', undefined, queryOptions)
    const results = await this.queryExecutor.executeMany(query)
    return results.map(row => UserMapper.toDomain(row))
  }
}