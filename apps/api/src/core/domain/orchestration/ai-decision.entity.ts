import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'
import type { 
  AIDecision as IAIDecision,
  Intent,
  Decision,
  ActionResult
} from '@kibly/shared-types'
import { ConversationId } from '@kibly/shared-types'

export type AIDecisionProps = {
  id: EntityId
  contextId: string
  conversationId: string
  intent: Intent
  decision: Decision
  executedActions: ActionResult[]
  responseText: string
  tokensUsed: number
  modelUsed: string
  processingTime: number
  permissionsDenied?: string[]
  createdAt: Date
  updatedAt: Date
  version: number
}

export class AIDecisionEntity extends BaseEntity<AIDecisionProps> {
  private _contextId: string
  private _conversationId: string
  private _intent: Intent
  private _decision: Decision
  private _executedActions: ActionResult[]
  private _responseText: string
  private _tokensUsed: number
  private _modelUsed: string
  private _processingTime: number
  private _permissionsDenied?: string[]

  private constructor(props: AIDecisionProps) {
    super(props)
    this._contextId = props.contextId
    this._conversationId = props.conversationId
    this._intent = props.intent
    this._decision = props.decision
    this._executedActions = props.executedActions
    this._responseText = props.responseText
    this._tokensUsed = props.tokensUsed
    this._modelUsed = props.modelUsed
    this._processingTime = props.processingTime
    this._permissionsDenied = props.permissionsDenied || []
  }

  get id(): EntityId {
    return this.props.id
  }

  get contextId(): string {
    return this._contextId
  }

  get conversationId(): string {
    return this._conversationId
  }

  get intent(): Intent {
    return this._intent
  }

  get decision(): Decision {
    return this._decision
  }

  get executedActions(): ActionResult[] {
    return [...this._executedActions]
  }

  get responseText(): string {
    return this._responseText
  }

  get tokensUsed(): number {
    return this._tokensUsed
  }

  get modelUsed(): string {
    return this._modelUsed
  }

  get processingTime(): number {
    return this._processingTime
  }

  get permissionsDenied(): string[] | undefined {
    return this._permissionsDenied ? [...this._permissionsDenied] : undefined
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get wasSuccessful(): boolean {
    return this._executedActions.every(action => action.success)
  }

  get hadPermissionIssues(): boolean {
    return !!this._permissionsDenied && this._permissionsDenied.length > 0
  }

  get totalExecutionTime(): number {
    return this._executedActions.reduce(
      (total, action) => total + action.executionTime,
      0
    )
  }

  static create(params: {
    contextId: string
    conversationId: string
    intent: Intent
    decision: Decision
    executedActions: ActionResult[]
    responseText: string
    tokensUsed: number
    modelUsed: string
    processingTime: number
    permissionsDenied?: string[]
  }): AIDecisionEntity {
    const id = EntityId.generate()
    const now = new Date()
    
    return new AIDecisionEntity({
      id,
      contextId: params.contextId,
      conversationId: params.conversationId,
      intent: params.intent,
      decision: params.decision,
      executedActions: params.executedActions,
      responseText: params.responseText,
      tokensUsed: params.tokensUsed,
      modelUsed: params.modelUsed,
      processingTime: params.processingTime,
      permissionsDenied: params.permissionsDenied || [],
      createdAt: now,
      updatedAt: now,
      version: 1
    })
  }

  static fromProps(props: AIDecisionProps): AIDecisionEntity {
    return new AIDecisionEntity(props)
  }

  getSuccessfulActions(): ActionResult[] {
    return this._executedActions.filter(action => action.success)
  }

  getFailedActions(): ActionResult[] {
    return this._executedActions.filter(action => !action.success)
  }

  getActionByName(functionName: string): ActionResult | undefined {
    return this._executedActions.find(action => action.functionName === functionName)
  }

  toPublic(): IAIDecision {
    return {
      id: this.id.toString(),
      contextId: this._contextId,
      conversationId: ConversationId(this._conversationId),
      intent: this._intent,
      decision: this._decision,
      executedActions: this._executedActions,
      responseText: this._responseText,
      tokensUsed: this._tokensUsed,
      modelUsed: this._modelUsed,
      processingTime: this._processingTime,
      permissionsDenied: this._permissionsDenied || [],
      createdAt: this.createdAt
    }
  }

  toAnalytics(): Record<string, any> {
    return {
      decisionId: this.id.toString(),
      intentType: this._intent.type,
      intentSubType: this._intent.subType,
      intentConfidence: this._intent.confidence,
      decisionAction: this._decision.action,
      decisionConfidence: this._decision.confidence,
      tokensUsed: this._tokensUsed,
      modelUsed: this._modelUsed,
      processingTime: this._processingTime,
      totalExecutionTime: this.totalExecutionTime,
      successfulActions: this.getSuccessfulActions().length,
      failedActions: this.getFailedActions().length,
      hadPermissionIssues: this.hadPermissionIssues,
      timestamp: this.createdAt
    }
  }
}