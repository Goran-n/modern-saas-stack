import type { ConversationEntity } from '../../domain/conversation'
import type { ConversationStatus } from '../../domain/conversation'
import { EntityId } from '../../domain/shared/value-objects/entity-id'

export interface ConversationFilters {
  status?: ConversationStatus[]
  channelId?: string
  afterDate?: Date
}

export interface ConversationRepository {
  save(entity: ConversationEntity): Promise<ConversationEntity>
  findById(id: EntityId): Promise<ConversationEntity | null>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  findByUser(userId: string, filters?: ConversationFilters, limit?: number, offset?: number): Promise<ConversationEntity[]>
  countByUser(userId: string, filters?: ConversationFilters): Promise<number>
  findActiveByUserAndChannel(userId: string, channelId: string): Promise<ConversationEntity | null>
  findByExternalId(channelId: string, externalThreadId: string): Promise<ConversationEntity | null>
  findByTenant(tenantId: string): Promise<ConversationEntity[]>
  findByUserAndTenant(userId: string, tenantId: string): Promise<ConversationEntity[]>
  findByChannel(channelId: string): Promise<ConversationEntity[]>
  findByExternalThreadId(externalThreadId: string): Promise<ConversationEntity | null>
  findByStatus(tenantId: string, status: ConversationStatus): Promise<ConversationEntity[]>
  countByStatus(tenantId: string, status: ConversationStatus): Promise<number>
}