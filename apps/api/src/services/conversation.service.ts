import type { ConversationRepository } from '../core/ports/conversation/conversation.repository'
import type { ConversationMessageRepository } from '../core/ports/conversation/conversation-message.repository'
import type { ConversationEntity, ConversationMessageEntity } from '../core/domain/conversation'
import { ConversationEntity as ConversationEntityClass } from '../core/domain/conversation/conversation.entity'
import { ConversationMessageEntity as ConversationMessageEntityClass } from '../core/domain/conversation/conversation-message.entity'
import type { UserChannelService } from './user-channel.service'
import type { ConversationStatus } from '../core/domain/conversation/conversation.entity'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'

export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: ConversationMessageRepository,
    private readonly userChannelService: UserChannelService
  ) {}

  async findById(conversationId: string): Promise<ConversationEntity | null> {
    return this.conversationRepository.findById(EntityId.from(conversationId))
  }

  async findByTenant(tenantId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.findByTenant(tenantId)
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.findByUserAndTenant(userId, tenantId)
  }

  async findByUser(userId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.findByUser(userId)
  }

  async findByChannel(channelId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.findByChannel(channelId)
  }

  async findByExternalThreadId(externalThreadId: string): Promise<ConversationEntity | null> {
    return this.conversationRepository.findByExternalThreadId(externalThreadId)
  }

  async createConversation(data: {
    tenantId: string
    userId: string
    channelId: string
    externalThreadId?: string
    metadata?: Record<string, any>
  }): Promise<ConversationEntity> {
    // Verify channel exists and belongs to user
    const channel = await this.userChannelService.findById(data.channelId)
    if (!channel || channel.userId !== data.userId || channel.tenantId !== data.tenantId) {
      throw new Error('Invalid channel')
    }

    const conversation = ConversationEntityClass.create(data)
    return this.conversationRepository.save(conversation)
  }

  async updateStatus(conversationId: string, status: ConversationStatus): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findById(EntityId.from(conversationId))
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    if (status === 'archived') {
      conversation.archive()
    } else if (status === 'closed') {
      conversation.close()
    } else if (status === 'active') {
      conversation.reopen()
    }

    return this.conversationRepository.save(conversation)
  }

  async archiveConversation(conversationId: string): Promise<ConversationEntity>
  async archiveConversation(params: { conversationId: string; userId: string }): Promise<ConversationEntity>
  async archiveConversation(params: string | { conversationId: string; userId: string }): Promise<ConversationEntity> {
    // Handle both signatures for backward compatibility
    if (typeof params === 'string') {
      return this.updateStatus(params, 'archived')
    }
    
    // Verify user has access to this conversation
    const conversation = await this.getConversation({
      conversationId: params.conversationId,
      userId: params.userId
    })
    
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }
    
    return this.updateStatus(params.conversationId, 'archived')
  }

  async closeConversation(conversationId: string): Promise<ConversationEntity> {
    return this.updateStatus(conversationId, 'closed')
  }

  async reopenConversation(conversationId: string): Promise<ConversationEntity> {
    return this.updateStatus(conversationId, 'active')
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return this.conversationRepository.delete(conversationId)
  }

  // Message related methods
  async findMessageById(messageId: string): Promise<ConversationMessageEntity | null> {
    return this.messageRepository.findById(messageId)
  }

  async findMessagesByConversation(conversationId: string, limit?: number, offset?: number): Promise<ConversationMessageEntity[]> {
    return this.messageRepository.findByConversation(conversationId, limit, offset)
  }

  async createMessage(data: {
    conversationId: string
    externalMessageId?: string
    content: string
    direction: 'inbound' | 'outbound'
    messageType?: 'text' | 'file' | 'image' | 'voice' | 'system'
    senderName?: string
    metadata?: Record<string, any>
    tenantId: string
  }): Promise<ConversationMessageEntity> {
    // Verify conversation exists
    const conversation = await this.conversationRepository.findById(EntityId.from(data.conversationId))
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    const metadata = data.metadata || {}
    if (data.senderName) {
      metadata.senderName = data.senderName
    }

    const messageData: {
      conversationId: string
      externalMessageId?: string
      content: string
      direction: 'inbound' | 'outbound'
      messageType: 'text' | 'file' | 'image' | 'voice' | 'system'
      metadata: Record<string, any>
    } = {
      conversationId: data.conversationId,
      content: data.content,
      direction: data.direction,
      messageType: data.messageType || 'text', // Default to text if not provided
      metadata
    }
    
    if (data.externalMessageId) {
      messageData.externalMessageId = data.externalMessageId
    }
    
    const message = ConversationMessageEntityClass.create(messageData)

    const savedMessage = await this.messageRepository.save(message)

    // Update conversation's last message timestamp and increment count
    conversation.incrementMessageCount()
    await this.conversationRepository.save(conversation)

    return savedMessage
  }

  async markMessageAsRead(messageId: string): Promise<ConversationMessageEntity> {
    const message = await this.messageRepository.findById(messageId)
    if (!message) {
      throw new Error('Message not found')
    }

    message.markAsRead()
    return this.messageRepository.save(message)
  }

  async markMessageAsDelivered(messageId: string): Promise<ConversationMessageEntity> {
    const message = await this.messageRepository.findById(messageId)
    if (!message) {
      throw new Error('Message not found')
    }

    message.markAsDelivered()
    return this.messageRepository.save(message)
  }

  async markMessageAsFailed(messageId: string, error: string): Promise<ConversationMessageEntity> {
    const message = await this.messageRepository.findById(messageId)
    if (!message) {
      throw new Error('Message not found')
    }

    message.markAsFailed(error)
    return this.messageRepository.save(message)
  }

  async updateMessageMetadata(messageId: string, metadata: Record<string, any>): Promise<ConversationMessageEntity> {
    const message = await this.messageRepository.findById(messageId)
    if (!message) {
      throw new Error('Message not found')
    }

    message.updateMetadata(metadata)
    return this.messageRepository.save(message)
  }

  async getUnreadMessageCount(conversationId: string): Promise<number> {
    return this.messageRepository.countUnreadByConversation(conversationId)
  }

  async getMessageCount(conversationId: string): Promise<number> {
    return this.messageRepository.countByConversation(conversationId)
  }

  async deleteMessage(messageId: string): Promise<void> {
    return this.messageRepository.delete(messageId)
  }

  // Utility methods
  async findActiveConversations(tenantId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.findByStatus(tenantId, 'active')
  }

  async countConversationsByStatus(tenantId: string, status: ConversationStatus): Promise<number> {
    return this.conversationRepository.countByStatus(tenantId, status)
  }

  async updateConversationMetadata(conversationId: string, metadata: Record<string, any>): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findById(EntityId.from(conversationId))
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    conversation.updateMetadata(metadata)
    return this.conversationRepository.save(conversation)
  }

  async processIncomingWhatsAppMessage(data: {
    tenantId: string
    from: string
    to: string
    messageSid: string
    body?: string
    mediaUrls?: string[]
  }): Promise<void> {
    // Find or create conversation based on phone numbers
    const channelId = data.to // The business WhatsApp number
    const userChannel = await this.userChannelService.findByIdentifier('whatsapp', channelId)
    
    if (!userChannel) {
      throw new Error(`No WhatsApp channel found for number: ${channelId}`)
    }

    // Find existing conversation or create new one
    let conversation = await this.findByExternalThreadId(data.from)
    
    if (!conversation) {
      conversation = await this.createConversation({
        tenantId: data.tenantId,
        userId: userChannel.userId,
        channelId: userChannel.id.toString(),
        externalThreadId: data.from,
        metadata: {
          whatsappNumber: data.from,
          channelNumber: data.to
        }
      })
    }

    // Create the message
    await this.createMessage({
      conversationId: conversation.id.toString(),
      externalMessageId: data.messageSid,
      content: data.body || '',
      direction: 'inbound',
      messageType: data.mediaUrls && data.mediaUrls.length > 0 ? 'file' : 'text',
      metadata: {
        whatsappMessageSid: data.messageSid,
        mediaUrls: data.mediaUrls,
        from: data.from,
        to: data.to
      },
      tenantId: data.tenantId
    })
  }

  // Methods required by conversation router
  async listUserConversations(params: {
    userId: string
    limit: number
    offset: number
    status?: ConversationStatus[]
  }): Promise<{ conversations: ConversationEntity[]; total: number }> {
    const conversations = await this.findByUser(params.userId)
    
    // Filter by status if provided
    let filtered = conversations
    if (params.status && params.status.length > 0) {
      filtered = conversations.filter(c => params.status!.includes(c.status))
    }
    
    // Apply pagination
    const total = filtered.length
    const paginated = filtered.slice(params.offset, params.offset + params.limit)
    
    return { conversations: paginated, total }
  }

  async getConversation(params: {
    conversationId: string
    userId: string
  }): Promise<ConversationEntity | null> {
    const conversation = await this.findById(params.conversationId)
    
    // Verify the conversation belongs to the user
    if (conversation && conversation.userId !== params.userId) {
      return null
    }
    
    return conversation
  }

  async getConversationMessages(params: {
    conversationId: string
    userId: string
    limit: number
    offset: number
  }): Promise<{ messages: ConversationMessageEntity[]; total: number }> {
    // First verify user has access to this conversation
    const conversation = await this.getConversation({
      conversationId: params.conversationId,
      userId: params.userId
    })
    
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }
    
    const messages = await this.findMessagesByConversation(params.conversationId, params.limit, params.offset)
    const total = await this.getMessageCount(params.conversationId)
    
    return { messages, total }
  }

  async sendMessage(params: {
    conversationId: string
    userId: string
    content: string
  }): Promise<ConversationMessageEntity> {
    // Verify user has access to this conversation
    const conversation = await this.getConversation({
      conversationId: params.conversationId,
      userId: params.userId
    })
    
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }
    
    // Create outbound message
    const message = await this.createMessage({
      conversationId: params.conversationId,
      content: params.content,
      direction: 'outbound',
      messageType: 'text',
      tenantId: conversation.tenantId
    })
    
    // TODO: Send message via messaging service (WhatsApp, etc)
    
    return message
  }

  async unarchiveConversation(params: {
    conversationId: string
    userId: string
  }): Promise<void> {
    const conversation = await this.getConversation({
      conversationId: params.conversationId,
      userId: params.userId
    })
    
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }
    
    await this.reopenConversation(params.conversationId)
  }

  async getOrCreateConversation(params: {
    userId: string
    tenantId: string
    channelId: string
    externalThreadId?: string
    metadata?: Record<string, any>
  }): Promise<ConversationEntity> {
    // Try to find existing conversation
    if (params.externalThreadId) {
      const existing = await this.findByExternalThreadId(params.externalThreadId)
      if (existing) {
        return existing
      }
    }

    // Create new conversation
    const createParams: {
      userId: string
      tenantId: string
      channelId: string
      externalThreadId?: string
      metadata?: Record<string, any>
    } = {
      userId: params.userId,
      tenantId: params.tenantId,
      channelId: params.channelId
    }
    
    if (params.externalThreadId) {
      createParams.externalThreadId = params.externalThreadId
    }
    
    if (params.metadata) {
      createParams.metadata = params.metadata
    }
    
    return this.createConversation(createParams)
  }

  async saveMessage(message: ConversationMessageEntity): Promise<ConversationMessageEntity> {
    return this.messageRepository.save(message)
  }
}