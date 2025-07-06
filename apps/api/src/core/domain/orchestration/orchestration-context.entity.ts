import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'
import type { 
  OrchestrationContext as IOrchestrationContext,
  ContextMessage,
  PendingAction,
  Intent
} from '@kibly/shared-types'
import { ConversationId, UserChannelId } from '@kibly/shared-types'

export type OrchestrationContextProps = {
  id: EntityId
  conversationId: string
  userId: string
  channelId: string
  tenantId: string
  recentMessages: ContextMessage[]
  currentIntent?: Intent
  pendingActions: PendingAction[]
  sessionData: Record<string, any>
  lastActivity: Date
  createdAt: Date
  updatedAt: Date
  version: number
}

export class OrchestrationContextEntity extends BaseEntity<OrchestrationContextProps> {
  private _conversationId: string
  private _userId: string
  private _channelId: string
  private _tenantId: string
  private _recentMessages: ContextMessage[]
  private _currentIntent?: Intent | undefined
  private _pendingActions: PendingAction[]
  private _sessionData: Record<string, any>
  private _lastActivity: Date

  private constructor(props: OrchestrationContextProps) {
    super(props)
    this._conversationId = props.conversationId
    this._userId = props.userId
    this._channelId = props.channelId
    this._tenantId = props.tenantId
    this._recentMessages = props.recentMessages
    this._currentIntent = props.currentIntent
    this._pendingActions = props.pendingActions
    this._sessionData = props.sessionData
    this._lastActivity = props.lastActivity
  }

  get id(): EntityId {
    return this.props.id
  }

  get conversationId(): string {
    return this._conversationId
  }

  get userId(): string {
    return this._userId
  }

  get channelId(): string {
    return this._channelId
  }

  get tenantId(): string {
    return this._tenantId
  }

  get recentMessages(): ContextMessage[] {
    return [...this._recentMessages]
  }

  get currentIntent(): Intent | undefined {
    return this._currentIntent
  }

  get pendingActions(): PendingAction[] {
    return [...this._pendingActions]
  }

  get sessionData(): Record<string, any> {
    return { ...this._sessionData }
  }

  get lastActivity(): Date {
    return this._lastActivity
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get isActive(): boolean {
    const fiveMinutes = 5 * 60 * 1000
    return Date.now() - this._lastActivity.getTime() < fiveMinutes
  }

  get messageCount(): number {
    return this._recentMessages.length
  }

  static create(params: {
    conversationId: string
    userId: string
    channelId: string
    tenantId: string
  }): OrchestrationContextEntity {
    const id = EntityId.generate()
    const now = new Date()
    
    return new OrchestrationContextEntity({
      id,
      conversationId: params.conversationId,
      userId: params.userId,
      channelId: params.channelId,
      tenantId: params.tenantId,
      recentMessages: [],
      pendingActions: [],
      sessionData: {},
      lastActivity: now,
      createdAt: now,
      updatedAt: now,
      version: 1
    })
  }

  static fromProps(props: OrchestrationContextProps): OrchestrationContextEntity {
    return new OrchestrationContextEntity(props)
  }

  addMessage(message: ContextMessage, maxMessages = 20): void {
    this._recentMessages.push(message)
    
    // Keep only the most recent messages
    if (this._recentMessages.length > maxMessages) {
      this._recentMessages = this._recentMessages.slice(-maxMessages)
    }
    
    this._lastActivity = new Date()
    this.touch()
  }

  setIntent(intent: Intent): void {
    this._currentIntent = intent
    this.touch()
  }

  clearIntent(): void {
    this._currentIntent = undefined
    this.touch()
  }

  addPendingAction(action: PendingAction): void {
    this._pendingActions.push(action)
    this.touch()
  }

  removePendingAction(actionId: string): void {
    this._pendingActions = this._pendingActions.filter(a => a.id !== actionId)
    this.touch()
  }

  updateSessionData(data: Record<string, any>): void {
    this._sessionData = {
      ...this._sessionData,
      ...data
    }
    this.touch()
  }

  clearSessionData(): void {
    this._sessionData = {}
    this.touch()
  }

  updateActivity(): void {
    this._lastActivity = new Date()
    this.touch()
  }

  pruneOldMessages(olderThan: Date): void {
    this._recentMessages = this._recentMessages.filter(
      msg => msg.timestamp > olderThan
    )
    this.touch()
  }

  getMessagesSince(since: Date): ContextMessage[] {
    return this._recentMessages.filter(msg => msg.timestamp > since)
  }

  getLastUserMessage(): ContextMessage | undefined {
    return [...this._recentMessages]
      .reverse()
      .find(msg => msg.direction === 'inbound')
  }

  getLastAssistantMessage(): ContextMessage | undefined {
    return [...this._recentMessages]
      .reverse()
      .find(msg => msg.direction === 'outbound')
  }

  toPublic(): IOrchestrationContext {
    const result: IOrchestrationContext = {
      id: this.id.toString(),
      conversationId: ConversationId(this._conversationId),
      userId: this._userId,
      channelId: UserChannelId(this._channelId),
      tenantId: this._tenantId,
      recentMessages: this._recentMessages,
      pendingActions: this._pendingActions,
      sessionData: this._sessionData,
      lastActivity: this._lastActivity,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
    
    if (this._currentIntent !== undefined) {
      result.currentIntent = this._currentIntent
    }
    
    return result
  }
}