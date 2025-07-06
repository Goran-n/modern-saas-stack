import type { UserChannelEntity } from '../../domain/conversation'
import type { ChannelType } from '../../domain/conversation'
import { EntityId } from '../../domain/shared/value-objects/entity-id'

export interface UserChannelRepository {
  save(entity: UserChannelEntity): Promise<UserChannelEntity>
  findById(id: EntityId): Promise<UserChannelEntity | null>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  findByUser(userId: string): Promise<UserChannelEntity[]>
  findByUserAndType(userId: string, channelType: ChannelType): Promise<UserChannelEntity[]>
  findByUserAndIdentifier(userId: string, channelType: ChannelType, channelIdentifier: string): Promise<UserChannelEntity | null>
  findByChannelIdentifier(channelType: ChannelType, channelIdentifier: string): Promise<UserChannelEntity | null>
  findActiveByTenant(tenantId: string): Promise<UserChannelEntity[]>
  getChannelStatistics(channelId: string): Promise<{
    totalConversations: number
    activeConversations: number
    totalMessages: number
  }>
}