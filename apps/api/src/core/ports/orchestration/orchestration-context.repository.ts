import type { OrchestrationContextEntity } from '../../domain/orchestration'

export interface OrchestrationContextRepository {
  findById(id: string): Promise<OrchestrationContextEntity | null>
  findByConversationId(conversationId: string): Promise<OrchestrationContextEntity | null>
  findByUserId(userId: string, limit?: number): Promise<OrchestrationContextEntity[]>
  findActive(olderThan: Date): Promise<OrchestrationContextEntity[]>
  
  save(context: OrchestrationContextEntity): Promise<OrchestrationContextEntity>
  delete(id: string): Promise<boolean>
  
  // Cleanup operations
  deleteInactive(olderThan: Date): Promise<number>
  pruneOldMessages(contextId: string, keepCount: number): Promise<void>
}