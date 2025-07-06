import { ConversationMessageEntity } from '../../domain/conversation'
import { ConversationFileEntity } from '../../domain/conversation'

export interface ConversationMessageRepository {
  save(entity: ConversationMessageEntity): Promise<ConversationMessageEntity>
  findById(id: string): Promise<ConversationMessageEntity | null>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  findByConversation(conversationId: string, limit?: number, offset?: number): Promise<ConversationMessageEntity[]>
  countByConversation(conversationId: string): Promise<number>
  countUnreadByConversation(conversationId: string): Promise<number>
  findByExternalId(conversationId: string, externalMessageId: string): Promise<ConversationMessageEntity | null>
  findWithFiles(messageId: string): Promise<{ message: ConversationMessageEntity; files: ConversationFileEntity[] } | null>
  
  // File attachment methods
  addFile(file: ConversationFileEntity): Promise<ConversationFileEntity>
  findFilesByMessage(messageId: string): Promise<ConversationFileEntity[]>
}