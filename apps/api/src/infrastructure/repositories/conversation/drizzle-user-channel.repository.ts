import { UserChannelEntity } from '../../../core/domain/conversation'
import type { ChannelType } from '../../../core/domain/conversation'
import type { UserChannelRepository } from '../../../core/ports/conversation/user-channel.repository'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'
import { UserChannelMapper } from '../../persistence/mappers/conversation.mapper'
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
  DeleteQuery
} from '../../persistence/query-executor'

export class DrizzleUserChannelRepository implements UserChannelRepository {
  constructor(private readonly queryExecutor: QueryExecutor) {}

  async save(entity: UserChannelEntity): Promise<UserChannelEntity> {
    const data = UserChannelMapper.toDatabase(entity)
    const persistenceData = {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      channelType: data.channel_type,
      channelIdentifier: data.channel_identifier,
      channelName: data.channel_name,
      status: data.status,
      settings: data.settings,
      isVerified: data.is_verified,
      verificationCode: data.verification_code,
      verificationExpiresAt: data.verification_expires_at,
      lastActiveAt: data.last_active_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      version: data.version,
    }
    
    try {
      // Check if exists
      const exists = await this.exists(entity.id.toString())
      
      if (exists) {
        // Update existing
        const updateData = {
          channelName: data.channel_name,
          status: data.status,
          settings: data.settings,
          isVerified: data.is_verified,
          verificationCode: data.verification_code,
          verificationExpiresAt: data.verification_expires_at,
          lastActiveAt: data.last_active_at,
          updatedAt: new Date(),
          version: data.version,
        }
        const updateQuery = new UpdateQuery('userChannels', { id: entity.id.toString() }, updateData)
        await this.queryExecutor.executeUpdate(updateQuery)
      } else {
        // Insert new
        const insertQuery = new InsertQuery('userChannels', persistenceData)
        await this.queryExecutor.executeInsert(insertQuery)
      }
      
      return entity
    } catch (error: any) {
      // Provide a more helpful error message
      if (error.code === '23505') { // Unique violation
        throw new Error(`A channel with this identifier already exists for this user`)
      }
      if (error.code === '23503') { // Foreign key violation
        throw new Error(`Invalid user or tenant ID`)
      }
      if (error.code === '22P02') { // Invalid text representation
        throw new Error(`Invalid data format: ${error.message}`)
      }
      
      throw new Error(`Database error: ${error.message || 'Unknown error'}`)
    }
  }

  async findById(id: EntityId): Promise<UserChannelEntity | null> {
    const query = new FindByIdQuery('userChannels', id.toString())
    const result = await this.queryExecutor.execute(query)
    return result ? UserChannelMapper.toDomain(result) : null
  }

  async findByUser(userId: string): Promise<UserChannelEntity[]> {
    const query = new FindManyQuery('userChannels', { userId }, {
      orderBy: { field: 'createdAt', direction: 'asc' }
    })
    
    const results = await this.queryExecutor.executeMany(query)
    return results.map(row => UserChannelMapper.toDomain(row))
  }

  async findByUserAndType(userId: string, channelType: ChannelType): Promise<UserChannelEntity[]> {
    const query = new FindManyQuery('userChannels', { userId, channelType }, {
      orderBy: { field: 'createdAt', direction: 'asc' }
    })
    
    const results = await this.queryExecutor.executeMany(query)
    return results.map(row => UserChannelMapper.toDomain(row))
  }

  async findByUserAndIdentifier(
    userId: string, 
    channelType: ChannelType, 
    channelIdentifier: string
  ): Promise<UserChannelEntity | null> {
    const query = new FindOneQuery('userChannels', {
      userId,
      channelType,
      channelIdentifier
    })
    const result = await this.queryExecutor.execute(query)
    return result ? UserChannelMapper.toDomain(result) : null
  }

  async findByChannelIdentifier(
    channelType: ChannelType, 
    channelIdentifier: string
  ): Promise<UserChannelEntity | null> {
    const query = new FindOneQuery('userChannels', {
      channelType,
      channelIdentifier
    })
    const result = await this.queryExecutor.execute(query)
    return result ? UserChannelMapper.toDomain(result) : null
  }

  async findActiveByTenant(tenantId: string): Promise<UserChannelEntity[]> {
    const query = new FindManyQuery('userChannels', { 
      tenantId,
      status: 'active'
    }, {
      orderBy: { field: 'createdAt', direction: 'asc' }
    })
    
    const results = await this.queryExecutor.executeMany(query)
    return results.map(row => UserChannelMapper.toDomain(row))
  }

  async delete(id: string): Promise<void> {
    const query = new DeleteQuery('userChannels', { id })
    await this.queryExecutor.executeDelete(query)
  }

  async exists(id: string): Promise<boolean> {
    const query = new ExistsQuery('userChannels', { id })
    return this.queryExecutor.executeExists(query)
  }

  async getChannelStatistics(channelId: string): Promise<{
    totalConversations: number
    activeConversations: number
    totalMessages: number
  }> {
    // Get conversation counts
    const conversationQuery = new FindManyQuery('conversations', { channelId })
    const conversations = await this.queryExecutor.executeMany(conversationQuery)
    
    const totalConversations = conversations.length
    const activeConversations = conversations.filter((c: any) => c.status === 'active').length
    
    // Get total message count across all conversations
    let totalMessages = 0
    for (const conversation of conversations) {
      const messageQuery = new FindManyQuery('conversationMessages', { 
        conversationId: conversation.id 
      })
      const messages = await this.queryExecutor.executeMany(messageQuery)
      totalMessages += messages.length
    }
    
    return {
      totalConversations,
      activeConversations,
      totalMessages
    }
  }

}