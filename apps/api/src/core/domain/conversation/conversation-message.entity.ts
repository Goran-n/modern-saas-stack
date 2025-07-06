import { EntityId } from '../shared/value-objects/entity-id'

export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'file' | 'image' | 'voice' | 'system'

export interface MessageMetadata {
  deliveryStatus?: string
  readReceipts?: boolean
  errorMessage?: string
  mediaCount?: number
  [key: string]: any
}

export interface ConversationMessageProps {
  id: string
  conversationId: string
  externalMessageId: string | null
  direction: MessageDirection
  messageType: MessageType
  content: string | null
  metadata: MessageMetadata
  createdAt: Date
}

export interface PublicConversationMessage {
  id: string
  conversationId: string
  externalMessageId: string | null | undefined
  direction: MessageDirection
  messageType: MessageType
  content: string | null | undefined
  metadata: MessageMetadata
  createdAt: Date
}

export class ConversationMessageEntity {
  private constructor(private readonly props: ConversationMessageProps) {}

  static create(params: {
    conversationId: string
    externalMessageId?: string
    direction: MessageDirection
    messageType: MessageType
    content?: string
    metadata?: MessageMetadata
  }): ConversationMessageEntity {
    const id = EntityId.generate().toString()
    const now = new Date()
    
    return new ConversationMessageEntity({
      id,
      conversationId: params.conversationId,
      externalMessageId: params.externalMessageId || null,
      direction: params.direction,
      messageType: params.messageType,
      content: params.content || null,
      metadata: params.metadata || {},
      createdAt: now,
    })
  }

  static fromProps(props: ConversationMessageProps): ConversationMessageEntity {
    return new ConversationMessageEntity(props)
  }

  // Getters
  get id(): string { return this.props.id }
  get conversationId(): string { return this.props.conversationId }
  get externalMessageId(): string | null { return this.props.externalMessageId }
  get direction(): MessageDirection { return this.props.direction }
  get messageType(): MessageType { return this.props.messageType }
  get content(): string | null { return this.props.content }
  get metadata(): MessageMetadata { return this.props.metadata }
  get createdAt(): Date { return this.props.createdAt }
  get isInbound(): boolean { return this.props.direction === 'inbound' }
  get isOutbound(): boolean { return this.props.direction === 'outbound' }

  // Business methods
  updateMetadata(metadata: Partial<MessageMetadata>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
  }

  markAsDelivered(): void {
    this.updateMetadata({ deliveryStatus: 'delivered' })
  }

  markAsRead(): void {
    this.updateMetadata({ deliveryStatus: 'read', readReceipts: true })
  }

  markAsFailed(error: string): void {
    this.updateMetadata({ deliveryStatus: 'failed', errorMessage: error })
  }

  toPublic(): PublicConversationMessage {
    return {
      id: this.props.id,
      conversationId: this.props.conversationId,
      externalMessageId: this.props.externalMessageId,
      direction: this.props.direction,
      messageType: this.props.messageType,
      content: this.props.content,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
    }
  }
}