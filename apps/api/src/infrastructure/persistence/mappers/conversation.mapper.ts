import { ConversationEntity, type ConversationProps } from '../../../core/domain/conversation/conversation.entity'
import { ConversationMessageEntity, type ConversationMessageProps } from '../../../core/domain/conversation/conversation-message.entity'
import { ConversationFileEntity, type ConversationFileProps } from '../../../core/domain/conversation/conversation-file.entity'
import { UserChannelEntity, type UserChannelProps, type ChannelSettings } from '../../../core/domain/conversation/user-channel.entity'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'
import type {
  ConversationDatabaseRow,
  ConversationMessageDatabaseRow,
  ConversationFileDatabaseRow,
  UserChannelDatabaseRow
} from '../types/conversation.types'

export class ConversationMapper {
  static toDomain(row: ConversationDatabaseRow): ConversationEntity {
    const props: ConversationProps = {
      id: EntityId.from(row.id),
      tenantId: row.tenant_id,
      userId: row.user_id,
      channelId: row.channel_id,
      externalThreadId: row.external_thread_id,
      status: row.status,
      metadata: row.metadata as Record<string, any>,
      messageCount: row.message_count,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    }
    
    return ConversationEntity.fromProps(props)
  }

  static toDatabase(entity: ConversationEntity): ConversationDatabaseRow {
    return {
      id: entity.id.toString(),
      tenant_id: entity.tenantId,
      user_id: entity.userId,
      channel_id: entity.channelId,
      external_thread_id: entity.externalThreadId ?? null,
      status: entity.status,
      metadata: entity.metadata,
      message_count: entity.messageCount,
      last_message_at: entity.lastMessageAt ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      version: entity.version,
    }
  }

  static toPersistence(entity: ConversationEntity): Record<string, any> {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      userId: entity.userId,
      channelId: entity.channelId,
      externalThreadId: entity.externalThreadId,
      status: entity.status,
      metadata: entity.metadata,
      messageCount: entity.messageCount,
      lastMessageAt: entity.lastMessageAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      version: entity.version,
    }
  }
}

export class ConversationMessageMapper {
  static toDomain(row: ConversationMessageDatabaseRow): ConversationMessageEntity {
    const props: ConversationMessageProps = {
      id: row.id,
      conversationId: row.conversation_id,
      externalMessageId: row.external_message_id,
      direction: row.direction,
      messageType: row.message_type,
      content: row.content,
      metadata: row.metadata as any,
      createdAt: row.created_at,
    }
    
    return ConversationMessageEntity.fromProps(props)
  }

  static toDatabase(entity: ConversationMessageEntity): ConversationMessageDatabaseRow {
    return {
      id: entity.id,
      conversation_id: entity.conversationId,
      external_message_id: entity.externalMessageId,
      direction: entity.direction,
      message_type: entity.messageType,
      content: entity.content,
      metadata: entity.metadata,
      created_at: entity.createdAt,
    }
  }

  static toPersistence(entity: ConversationMessageEntity): Record<string, any> {
    return {
      id: entity.id,
      conversationId: entity.conversationId,
      externalMessageId: entity.externalMessageId,
      direction: entity.direction,
      messageType: entity.messageType,
      content: entity.content,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
    }
  }
}

export class ConversationFileMapper {
  static toDomain(row: ConversationFileDatabaseRow): ConversationFileEntity {
    const props: ConversationFileProps = {
      id: row.id,
      messageId: row.message_id,
      fileId: row.file_id,
      originalName: row.original_name,
      createdAt: row.created_at,
    }
    
    return ConversationFileEntity.fromProps(props)
  }

  static toDatabase(entity: ConversationFileEntity): ConversationFileDatabaseRow {
    return {
      id: entity.id,
      message_id: entity.messageId,
      file_id: entity.fileId,
      original_name: entity.originalName,
      created_at: entity.createdAt,
    }
  }

  static toPersistence(entity: ConversationFileEntity): Record<string, any> {
    return {
      id: entity.id,
      messageId: entity.messageId,
      fileId: entity.fileId,
      originalName: entity.originalName,
      createdAt: entity.createdAt,
    }
  }
}

export class UserChannelMapper {
  static toDomain(row: UserChannelDatabaseRow): UserChannelEntity {
    const props: UserChannelProps = {
      id: EntityId.from(row.id),
      userId: row.user_id,
      tenantId: row.tenant_id,
      channelType: row.channel_type,
      channelIdentifier: row.channel_identifier,
      channelName: row.channel_name,
      status: row.status,
      isVerified: row.is_verified,
      verificationCode: row.verification_code,
      verificationExpiresAt: row.verification_expires_at,
      settings: row.settings as ChannelSettings,
      lastActiveAt: row.last_active_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    }
    
    return UserChannelEntity.fromProps(props)
  }

  static toDatabase(entity: UserChannelEntity): UserChannelDatabaseRow {
    return {
      id: entity.id.toString(),
      user_id: entity.userId,
      tenant_id: entity.tenantId,
      channel_type: entity.channelType,
      channel_identifier: entity.channelIdentifier,
      channel_name: entity.channelName ?? null,
      status: entity.status,
      is_verified: entity.isVerified,
      verification_code: entity.verificationCode ?? null,
      verification_expires_at: entity.verificationExpiresAt ?? null,
      settings: entity.settings,
      last_active_at: entity.lastActiveAt ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      version: entity.version,
    }
  }

  static toPersistence(entity: UserChannelEntity): Record<string, any> {
    return {
      id: entity.id,
      userId: entity.userId,
      tenantId: entity.tenantId,
      channelType: entity.channelType,
      channelIdentifier: entity.channelIdentifier,
      channelName: entity.channelName,
      status: entity.status,
      isVerified: entity.isVerified,
      verificationCode: entity.verificationCode,
      verificationExpiresAt: entity.verificationExpiresAt,
      settings: entity.settings,
      lastActiveAt: entity.lastActiveAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      version: entity.version,
    }
  }
}