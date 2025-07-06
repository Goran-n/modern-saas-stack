/**
 * Orchestration and AI-related types
 */

import { ConversationId, MessageId, UserChannelId } from './branded-types'

// Intent types
export enum IntentType {
  QUESTION = 'question',
  DOCUMENT_SUBMISSION = 'document_submission',
  COMMAND = 'command',
  CLARIFICATION = 'clarification',
  GREETING = 'greeting',
  UNKNOWN = 'unknown'
}

export enum IntentSubType {
  // Question subtypes
  VAT_QUERY = 'vat_query',
  TRANSACTION_QUERY = 'transaction_query',
  RECEIPT_STATUS = 'receipt_status',
  DEADLINE_QUERY = 'deadline_query',
  
  // Document subtypes
  RECEIPT_UPLOAD = 'receipt_upload',
  INVOICE_UPLOAD = 'invoice_upload',
  STATEMENT_UPLOAD = 'statement_upload',
  
  // Command subtypes
  GENERATE_REPORT = 'generate_report',
  EXPORT_DATA = 'export_data',
  RECONCILE = 'reconcile'
}

export interface Intent {
  type: IntentType
  subType?: IntentSubType
  confidence: number
  entities: IntentEntity[]
  rawText: string
}

export interface IntentEntity {
  type: string
  value: string
  confidence: number
  metadata?: Record<string, any>
}

// Decision types
export enum DecisionAction {
  RESPOND = 'respond',
  REQUEST_INFO = 'request_info',
  EXECUTE_FUNCTION = 'execute_function',
  ESCALATE = 'escalate',
  CLARIFY = 'clarify'
}

export interface Decision {
  action: DecisionAction
  reasoning: string
  confidence: number
  suggestedResponse?: string
  requiredData?: string[]
  functions?: AIFunction[]
  followUpActions?: FollowUpAction[]
}

export interface AIFunction {
  name: string
  description: string
  parameters: Record<string, any>
  requiredPermission?: string
}

export interface FollowUpAction {
  type: string
  delay?: number
  data: Record<string, any>
}

// Action execution
export interface ActionResult {
  functionName: string
  success: boolean
  result?: any
  error?: string
  executionTime: number
}

export interface ExecutedAction {
  action: string
  result: ActionResult
  timestamp: Date
}

// Orchestration context
export interface OrchestrationContext {
  id: string
  conversationId: ConversationId
  userId: string
  channelId: UserChannelId
  tenantId: string
  recentMessages: ContextMessage[]
  currentIntent?: Intent
  pendingActions: PendingAction[]
  sessionData: Record<string, any>
  lastActivity: Date
  createdAt: Date
  updatedAt: Date
}

export interface ContextMessage {
  id: MessageId
  content?: string
  direction: 'inbound' | 'outbound'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface PendingAction {
  id: string
  type: string
  data: Record<string, any>
  scheduledFor?: Date
  attempts: number
}

// AI Decision tracking
export interface AIDecision {
  id: string
  contextId: string
  conversationId: ConversationId
  intent: Intent
  decision: Decision
  executedActions: ActionResult[]
  responseText: string
  tokensUsed: number
  modelUsed: string
  processingTime: number
  permissionsDenied?: string[]
  createdAt: Date
}

// Permission types for AI
export interface AIPermissionSet {
  canViewTransactions: boolean
  canViewVATReports: boolean
  canViewReceipts: boolean
  canUploadDocuments: boolean
  canGenerateReports: boolean
  canModifyData: boolean
  specificResourceIds?: string[]
  restrictions?: PermissionRestriction[]
}

export interface PermissionRestriction {
  resource: string
  action: string
  reason: string
}

// Orchestration requests/responses
export interface OrchestrationRequest {
  message: {
    content?: string
    mediaUrls?: string[]
    messageId: string
    from: string
  }
  source: 'whatsapp' | 'api' | 'slack' | 'internal'
  userId: string
  tenantId: string
  channelId: string
  conversationId?: string
  mode: 'async' | 'sync'
}

export interface OrchestrationResponse {
  conversationId: string
  responseText: string
  actions: ExecutedAction[]
  metadata: {
    intent: string
    confidence: number
    processingTime: number
    tokensUsed?: number
    modelUsed?: string
  }
}

// Queue job types
export interface OrchestrationJobData {
  type: 'process_message' | 'execute_followup'
  payload: OrchestrationRequest | FollowUpAction
  retryCount?: number
}

// Prompt template types
export interface PromptTemplate {
  id: string
  name: string
  description: string
  systemPrompt?: string
  userPromptTemplate: string
  variables: string[]
  examples?: PromptExample[]
  metadata?: Record<string, any>
}

export interface PromptExample {
  input: Record<string, string>
  output: string
}

// Memory types
export interface ShortTermMemory {
  conversationId: string
  messages: ContextMessage[]
  metadata: Record<string, any>
  expiresAt: Date
}

export interface LongTermMemory {
  id: string
  userId: string
  tenantId: string
  summary: string
  keyPoints: string[]
  embedding?: number[]
  createdAt: Date
}