import { 
  ConversationMessageEntity,
  ConversationFileEntity,
} from '../../../core/domain/conversation'
import type { ConversationMessageRepository } from '../../../core/ports/conversation/conversation-message.repository'
import { ConversationMessageMapper, ConversationFileMapper } from '../../persistence/mappers/conversation.mapper'
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

export class DrizzleConversationMessageRepository implements ConversationMessageRepository {
  constructor(private readonly queryExecutor: QueryExecutor) {}

  async save(entity: ConversationMessageEntity): Promise<ConversationMessageEntity> {
    const data = ConversationMessageMapper.toDatabase(entity)
    const persistenceData = {
      id: data.id,
      conversationId: data.conversation_id,
      externalMessageId: data.external_message_id,
      direction: data.direction,
      messageType: data.message_type,
      content: data.content,
      metadata: data.metadata,
      createdAt: data.created_at,
    }
    
    // Check if exists
    const exists = await this.exists(entity.id)
    
    if (exists) {
      const updateQuery = new UpdateQuery('conversationMessages', { id: entity.id }, { metadata: data.metadata })
      await this.queryExecutor.executeUpdate(updateQuery)
      return entity
    } else {
      const insertQuery = new InsertQuery('conversationMessages', persistenceData)
      await this.queryExecutor.executeInsert(insertQuery)
      return entity
    }
  }

  async findById(id: string): Promise<ConversationMessageEntity | null> {
    const query = new FindByIdQuery('conversationMessages', id)
    const result = await this.queryExecutor.execute(query)
    return result ? ConversationMessageMapper.toDomain(result) : null
  }

  async findByConversation(
    conversationId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ConversationMessageEntity[]> {
    const query = new FindManyQuery('conversationMessages', { conversationId }, {
      limit,
      offset,
      orderBy: { field: 'createdAt', direction: 'desc' }
    })
    
    const results = await this.queryExecutor.executeMany(query)
    return results.map(row => ConversationMessageMapper.toDomain(row))
  }

  async countByConversation(conversationId: string): Promise<number> {
    const query = new CountQuery('conversationMessages', { conversationId })
    return this.queryExecutor.executeCount(query)
  }

  async countUnreadByConversation(conversationId: string): Promise<number> {
    // Count messages that are inbound and not yet read
    const query = new CountQuery('conversationMessages', { 
      conversationId,
      direction: 'inbound',
      status: 'delivered' // Assuming unread messages have 'delivered' status, not 'read'
    })
    return this.queryExecutor.executeCount(query)
  }

  async findByExternalId(
    conversationId: string, 
    externalMessageId: string
  ): Promise<ConversationMessageEntity | null> {
    const query = new FindOneQuery('conversationMessages', {
      conversationId,
      externalMessageId
    })
    const result = await this.queryExecutor.execute(query)
    return result ? ConversationMessageMapper.toDomain(result) : null
  }

  async findWithFiles(messageId: string): Promise<{ 
    message: ConversationMessageEntity; 
    files: ConversationFileEntity[] 
  } | null> {
    const message = await this.findById(messageId)
    if (!message) return null
    
    const files = await this.findFilesByMessage(messageId)
    
    return { message, files }
  }

  async addFile(file: ConversationFileEntity): Promise<ConversationFileEntity> {
    const data = ConversationFileMapper.toDatabase(file)
    const persistenceData = {
      id: data.id,
      messageId: data.message_id,
      fileId: data.file_id,
      originalName: data.original_name,
      createdAt: data.created_at,
    }
    
    const insertQuery = new InsertQuery('conversationFiles', persistenceData)
    await this.queryExecutor.executeInsert(insertQuery)
    return file
  }

  async findFilesByMessage(messageId: string): Promise<ConversationFileEntity[]> {
    const query = new FindManyQuery('conversationFiles', { messageId }, {
      orderBy: { field: 'createdAt', direction: 'asc' }
    })
    
    const results = await this.queryExecutor.executeMany(query)
    return results.map(row => ConversationFileMapper.toDomain(row))
  }

  async delete(id: string): Promise<void> {
    const query = new DeleteQuery('conversationMessages', { id })
    await this.queryExecutor.executeDelete(query)
  }

  async exists(id: string): Promise<boolean> {
    const query = new ExistsQuery('conversationMessages', { id })
    return this.queryExecutor.executeExists(query)
  }

}