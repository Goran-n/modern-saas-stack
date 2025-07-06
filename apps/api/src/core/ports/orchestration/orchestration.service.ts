import type {
  OrchestrationRequest,
  OrchestrationResponse,
  OrchestrationJobData,
  Intent,
  Decision,
  ActionResult,
  AIPermissionSet
} from '@kibly/shared-types'

export interface OrchestrationService {
  // Core processing
  processMessage(request: OrchestrationRequest): Promise<OrchestrationResponse>
  
  // Async processing for queued messages
  processAsync(jobData: OrchestrationJobData): Promise<void>
  
  // Sync processing for direct API calls
  processSync(request: OrchestrationRequest): Promise<OrchestrationResponse>
  
  // Context management
  getOrCreateContext(conversationId: string, userId: string, channelId: string): Promise<string>
  updateContext(contextId: string, updates: Partial<any>): Promise<void>
  
  // Intent and decision tracking
  recordDecision(params: {
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
  }): Promise<void>
  
  // Permission checking
  checkPermissions(userId: string, tenantId: string, requiredPermissions: string[]): Promise<AIPermissionSet>
}