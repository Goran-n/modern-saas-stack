import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'

export type ConversationStatus = 'active' | 'archived' | 'closed'

export interface ConversationProps {
  id: EntityId
  tenantId: string
  userId: string
  channelId: string
  externalThreadId?: string | null
  status: ConversationStatus
  metadata: Record<string, any>
  messageCount: number
  lastMessageAt?: Date | null
  createdAt: Date
  updatedAt: Date
  version: number
}

export interface PublicConversation {
  id: string
  channelId: string
  externalThreadId?: string | null
  status: ConversationStatus
  metadata: Record<string, any>
  messageCount: number
  lastMessageAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ConversationEntity extends BaseEntity<ConversationProps> {
  private constructor(props: ConversationProps) {
    super(props)
  }

  static create(params: {
    tenantId: string
    userId: string
    channelId: string
    externalThreadId?: string
    metadata?: Record<string, any>
  }): ConversationEntity {
    const id = EntityId.generate()
    const now = new Date()
    
    return new ConversationEntity({
      id,
      tenantId: params.tenantId,
      userId: params.userId,
      channelId: params.channelId,
      externalThreadId: params.externalThreadId || null,
      status: 'active',
      metadata: params.metadata || {},
      messageCount: 0,
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
  }

  static fromProps(props: ConversationProps): ConversationEntity {
    return new ConversationEntity(props)
  }

  // Getters
  get id(): EntityId { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get userId(): string { return this.props.userId }
  get channelId(): string { return this.props.channelId }
  get externalThreadId(): string | null | undefined { return this.props.externalThreadId }
  get status(): ConversationStatus { return this.props.status }
  get metadata(): Record<string, any> { return this.props.metadata }
  get messageCount(): number { return this.props.messageCount }
  get lastMessageAt(): Date | null | undefined { return this.props.lastMessageAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get version(): number { return this.props.version }
  get isActive(): boolean { return this.props.status === 'active' }

  // Business methods
  incrementMessageCount(): void {
    this.props.messageCount += 1
    this.props.lastMessageAt = new Date()
    this.touch()
  }

  archive(): void {
    this.props.status = 'archived'
    this.touch()
  }

  unarchive(): void {
    this.props.status = 'active'
    this.touch()
  }

  close(): void {
    this.props.status = 'closed'
    this.touch()
  }

  reopen(): void {
    this.props.status = 'active'
    this.touch()
  }

  updateMetadata(metadata: Partial<Record<string, any>>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
    this.touch()
  }

  toPublic(): PublicConversation {
    return {
      id: this.props.id.toString(),
      channelId: this.props.channelId,
      externalThreadId: this.props.externalThreadId ?? null,
      status: this.props.status,
      metadata: this.props.metadata,
      messageCount: this.props.messageCount,
      lastMessageAt: this.props.lastMessageAt ?? null,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    }
  }
}