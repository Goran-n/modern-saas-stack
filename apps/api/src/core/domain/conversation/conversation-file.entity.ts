import { EntityId } from '../shared/value-objects/entity-id'

export interface ConversationFileProps {
  id: string
  messageId: string
  fileId: string
  originalName: string | null
  createdAt: Date
}

export interface PublicConversationFile {
  id: string
  messageId: string
  fileId: string
  originalName: string | null | undefined
  createdAt: Date
}

export class ConversationFileEntity {
  private constructor(private readonly props: ConversationFileProps) {}

  static create(params: {
    messageId: string
    fileId: string
    originalName?: string
  }): ConversationFileEntity {
    const id = EntityId.generate().toString()
    const now = new Date()
    
    return new ConversationFileEntity({
      id,
      messageId: params.messageId,
      fileId: params.fileId,
      originalName: params.originalName || null,
      createdAt: now,
    })
  }

  static fromProps(props: ConversationFileProps): ConversationFileEntity {
    return new ConversationFileEntity(props)
  }

  // Getters
  get id(): string { return this.props.id }
  get messageId(): string { return this.props.messageId }
  get fileId(): string { return this.props.fileId }
  get originalName(): string | null { return this.props.originalName }
  get createdAt(): Date { return this.props.createdAt }

  toPublic(): PublicConversationFile {
    return {
      id: this.props.id,
      messageId: this.props.messageId,
      fileId: this.props.fileId,
      originalName: this.props.originalName,
      createdAt: this.props.createdAt,
    }
  }
}