import { ConversationEntity } from '../../../core/domain/conversation'
import type { ConversationRepository, ConversationFilters } from '../../../core/ports/conversation/conversation.repository'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'
import { ConversationMapper } from '../../persistence/mappers/conversation.mapper'
import type {
  QueryExecutor
} from '../../persistence/query-executor'
import {
  FindByIdQuery,
  FindOneQuery,
  FindManyQuery,
  ExistsQuery,
  InsertQuery,
  UpdateQuery,
  DeleteQuery,
  CountQuery
} from '../../persistence/query-executor'

export class DrizzleConversationRepository implements ConversationRepository {
  constructor(private readonly queryExecutor: QueryExecutor) {}

  async save(entity: ConversationEntity): Promise<ConversationEntity> {
    const data = ConversationMapper.toDatabase(entity)
    
    // Check if exists
    const exists = await this.exists(entity.id.toString())
    
    if (exists) {
      const updateQuery = new UpdateQuery('conversations', { id: entity.id.toString() }, data)
      await this.queryExecutor.executeUpdate(updateQuery)
    } else {
      const insertQuery = new InsertQuery('conversations', data)
      await this.queryExecutor.executeInsert(insertQuery)
    }
    
    return entity
  }

  async findById(id: EntityId): Promise<ConversationEntity | null> {
    const query = new FindByIdQuery('conversations', id.toString())
    const result = await this.queryExecutor.execute(query)
    return result ? ConversationMapper.toDomain(result) : null
  }

  async findByUser(
    userId: string, 
    filters?: ConversationFilters, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ConversationEntity[]> {
    // Build conditions for query
    const conditions: Record<string, any> = { user_id: userId }
    
    // For complex filters, we'll need to handle them differently
    // For now, using basic conditions that QueryExecutor can handle
    if (filters?.channelId) {
      conditions.channel_id = filters.channelId
    }
    
    // Status filter would need IN clause support - for now using single status
    if (filters?.status && filters.status.length === 1) {
      conditions.status = filters.status[0]
    }
    
    const query = new FindManyQuery('conversations', conditions, {
      limit,
      offset,
      orderBy: { field: 'last_message_at', direction: 'desc' }
    })
    
    const results = await this.queryExecutor.executeMany(query)
    return results.map(row => ConversationMapper.toDomain(row))
  }

  async countByUser(userId: string, filters?: ConversationFilters): Promise<number> {
    const conditions: Record<string, any> = { user_id: userId }
    
    if (filters?.channelId) {
      conditions.channel_id = filters.channelId
    }
    
    if (filters?.status && filters.status.length === 1) {
      conditions.status = filters.status[0]
    }
    
    const query = new CountQuery('conversations', conditions)
    return this.queryExecutor.executeCount(query)
  }

  async findActiveByUserAndChannel(userId: string, channelId: string): Promise<ConversationEntity | null> {
    const query = new FindOneQuery('conversations', {
      user_id: userId,
      channel_id: channelId,
      status: 'active'
    })
    const result = await this.queryExecutor.execute(query)
    return result ? ConversationMapper.toDomain(result) : null
  }

  async findByExternalId(channelId: string, externalThreadId: string): Promise<ConversationEntity | null> {
    const query = new FindOneQuery('conversations', {
      channel_id: channelId,
      external_thread_id: externalThreadId
    })
    const result = await this.queryExecutor.execute(query)
    return result ? ConversationMapper.toDomain(result) : null
  }

  async delete(id: string): Promise<void> {
    const query = new DeleteQuery('conversations', { id })
    await this.queryExecutor.executeDelete(query)
  }

  async exists(id: string): Promise<boolean> {
    const query = new ExistsQuery('conversations', { id })
    return this.queryExecutor.executeExists(query)
  }

  async findByTenant(tenantId: string): Promise<ConversationEntity[]> {
    const query = new FindManyQuery('conversations', { tenant_id: tenantId })
    const results = await this.queryExecutor.executeMany(query)
    return results.map(ConversationMapper.toDomain)
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<ConversationEntity[]> {
    const query = new FindManyQuery('conversations', {
      user_id: userId,
      tenant_id: tenantId
    })
    const results = await this.queryExecutor.executeMany(query)
    return results.map(ConversationMapper.toDomain)
  }

  async findByChannel(channelId: string): Promise<ConversationEntity[]> {
    const query = new FindManyQuery('conversations', { channel_id: channelId })
    const results = await this.queryExecutor.executeMany(query)
    return results.map(ConversationMapper.toDomain)
  }

  async findByExternalThreadId(externalThreadId: string): Promise<ConversationEntity | null> {
    const query = new FindOneQuery('conversations', {
      external_thread_id: externalThreadId
    })
    const result = await this.queryExecutor.execute(query)
    return result ? ConversationMapper.toDomain(result) : null
  }

  async findByStatus(tenantId: string, status: any): Promise<ConversationEntity[]> {
    const query = new FindManyQuery('conversations', {
      tenant_id: tenantId,
      status: status
    })
    const results = await this.queryExecutor.executeMany(query)
    return results.map(ConversationMapper.toDomain)
  }

  async countByStatus(tenantId: string, status: any): Promise<number> {
    const query = new CountQuery('conversations', {
      tenant_id: tenantId,
      status: status
    })
    const result = await this.queryExecutor.executeCount(query)
    return result
  }
}