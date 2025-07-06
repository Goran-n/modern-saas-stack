import type { AIDecisionEntity } from '../../domain/orchestration'

export interface AIDecisionFilters {
  conversationId?: string
  contextId?: string
  modelUsed?: string
  fromDate?: Date
  toDate?: Date
  hadPermissionIssues?: boolean
}

export interface AIDecisionRepository {
  findById(id: string): Promise<AIDecisionEntity | null>
  findByConversationId(conversationId: string, limit?: number): Promise<AIDecisionEntity[]>
  findByContextId(contextId: string): Promise<AIDecisionEntity[]>
  findByFilters(filters: AIDecisionFilters, limit?: number, offset?: number): Promise<{
    decisions: AIDecisionEntity[]
    total: number
  }>
  
  save(decision: AIDecisionEntity): Promise<AIDecisionEntity>
  
  // Analytics
  getTokenUsageByModel(tenantId: string, fromDate: Date, toDate: Date): Promise<{
    model: string
    totalTokens: number
    totalDecisions: number
  }[]>
  
  getIntentDistribution(tenantId: string, fromDate: Date, toDate: Date): Promise<{
    intentType: string
    intentSubType?: string
    count: number
  }[]>
}