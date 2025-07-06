import type { UserChannelRepository } from '../core/ports/conversation/user-channel.repository'
import type { UserChannelEntity, ChannelType, ChannelStatus, ChannelSettings } from '../core/domain/conversation'
import { UserChannelEntity as UserChannelEntityClass } from '../core/domain/conversation/user-channel.entity'
import { generateVerificationCode } from '../shared/utils/verification'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'

export class UserChannelService {
  constructor(
    private readonly userChannelRepository: UserChannelRepository
  ) {}

  async findById(channelId: string): Promise<UserChannelEntity | null> {
    return this.userChannelRepository.findById(EntityId.from(channelId))
  }

  async findByUser(userId: string): Promise<UserChannelEntity[]> {
    return this.userChannelRepository.findByUser(userId)
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<UserChannelEntity[]> {
    const allUserChannels = await this.userChannelRepository.findByUser(userId)
    return allUserChannels.filter(channel => channel.tenantId === tenantId)
  }

  async findByIdentifier(channelType: ChannelType, identifier: string): Promise<UserChannelEntity | null> {
    return this.userChannelRepository.findByChannelIdentifier(channelType, identifier)
  }

  async createChannel(data: {
    userId: string
    tenantId: string
    channelType: ChannelType
    channelIdentifier: string
    channelName?: string
    settings?: ChannelSettings
  }): Promise<UserChannelEntity> {
    // Check if channel already exists
    const existing = await this.userChannelRepository.findByChannelIdentifier(data.channelType, data.channelIdentifier)
    if (existing) {
      throw new Error('Channel with this identifier already exists')
    }

    const channel = UserChannelEntityClass.create(data)
    
    // Generate verification code for phone channels
    if (data.channelType === 'whatsapp') {
      const verificationCode = generateVerificationCode()
      channel.setVerificationCode(verificationCode, 10) // 10 minutes expiry
    }

    return this.userChannelRepository.save(channel)
  }

  async verifyChannel(channelId: string, verificationCode: string): Promise<UserChannelEntity> {
    const channel = await this.userChannelRepository.findById(EntityId.from(channelId))
    if (!channel) {
      throw new Error('Channel not found')
    }

    const isValid = channel.verify(verificationCode)
    if (!isValid) {
      throw new Error('Invalid or expired verification code')
    }
    // verify() method already marks as verified and activates
    
    return this.userChannelRepository.save(channel)
  }

  async resendVerificationCode(channelId: string): Promise<UserChannelEntity> {
    const channel = await this.userChannelRepository.findById(EntityId.from(channelId))
    if (!channel) {
      throw new Error('Channel not found')
    }

    if (channel.isVerified) {
      throw new Error('Channel is already verified')
    }

    const verificationCode = generateVerificationCode()
    channel.setVerificationCode(verificationCode, 10) // 10 minutes expiry
    
    return this.userChannelRepository.save(channel)
  }

  async updateChannelSettings(channelId: string, settings: Partial<ChannelSettings>): Promise<UserChannelEntity> {
    const channel = await this.userChannelRepository.findById(EntityId.from(channelId))
    if (!channel) {
      throw new Error('Channel not found')
    }

    channel.updateSettings(settings)
    return this.userChannelRepository.save(channel)
  }

  async updateChannelStatus(channelId: string, status: ChannelStatus): Promise<UserChannelEntity> {
    const channel = await this.userChannelRepository.findById(EntityId.from(channelId))
    if (!channel) {
      throw new Error('Channel not found')
    }

    switch (status) {
      case 'active':
        channel.activate()
        break
      case 'inactive':
        channel.deactivate()
        break
      case 'failed':
        channel.markAsFailed()
        break
      default:
        throw new Error(`Invalid status: ${status}`)
    }

    return this.userChannelRepository.save(channel)
  }

  async activateChannel(channelId: string): Promise<UserChannelEntity> {
    return this.updateChannelStatus(channelId, 'active')
  }

  async deactivateChannel(channelId: string): Promise<UserChannelEntity> {
    return this.updateChannelStatus(channelId, 'inactive')
  }

  async deleteChannel(channelId: string): Promise<void> {
    return this.userChannelRepository.delete(channelId)
  }

  async updateLastActive(channelId: string): Promise<void> {
    const channel = await this.userChannelRepository.findById(EntityId.from(channelId))
    if (!channel) {
      return // Silently return if channel not found
    }

    channel.updateActivity()
    await this.userChannelRepository.save(channel)
  }

  async findActiveChannels(tenantId: string): Promise<UserChannelEntity[]> {
    return this.userChannelRepository.findActiveByTenant(tenantId)
  }

  async countChannelsByType(tenantId: string, channelType: ChannelType): Promise<number> {
    const channels = await this.userChannelRepository.findActiveByTenant(tenantId)
    return channels.filter(channel => channel.channelType === channelType).length
  }

  async findVerifiedChannels(userId: string): Promise<UserChannelEntity[]> {
    const channels = await this.userChannelRepository.findByUser(userId)
    return channels.filter(channel => channel.isVerified)
  }

  async isChannelVerified(channelId: string): Promise<boolean> {
    const channel = await this.findById(channelId)
    return channel?.isVerified || false
  }

  async getChannelSettings(channelId: string): Promise<ChannelSettings | null> {
    const channel = await this.findById(channelId)
    return channel?.settings || null
  }

  async updateChannelName(channelId: string, name: string): Promise<UserChannelEntity> {
    const channel = await this.userChannelRepository.findById(EntityId.from(channelId))
    if (!channel) {
      throw new Error('Channel not found')
    }

    channel.updateChannelName(name)
    return this.userChannelRepository.save(channel)
  }

  async findExpiredVerifications(): Promise<UserChannelEntity[]> {
    const allChannels = await this.userChannelRepository.findByUser('') // Get all channels
    const now = new Date()
    return allChannels.filter(channel => 
      !channel.isVerified && 
      channel.status === 'pending' && 
      channel.verificationExpiresAt && 
      channel.verificationExpiresAt < now
    )
  }

  async cleanupExpiredVerifications(): Promise<void> {
    const expiredChannels = await this.findExpiredVerifications()
    for (const channel of expiredChannels) {
      if (!channel.isVerified && channel.status === 'pending') {
        await this.userChannelRepository.delete(channel.id.toString())
      }
    }
  }

  // Methods required by user-channel router
  async registerWhatsApp(params: {
    userId: string
    tenantId: string
    phoneNumber: string
    channelName?: string
  }): Promise<UserChannelEntity> {
    return this.createChannel({
      userId: params.userId,
      tenantId: params.tenantId,
      channelType: 'whatsapp',
      channelIdentifier: params.phoneNumber,
      channelName: params.channelName || `WhatsApp ${params.phoneNumber}`
    })
  }

  async verifyPhone(channelId: string, verificationCode: string): Promise<UserChannelEntity> {
    // This is just an alias for verifyChannel
    return this.verifyChannel(channelId, verificationCode)
  }

  async listUserChannels(params: {
    userId: string
    tenantId?: string
    channelType?: ChannelType
  }): Promise<{ channels: UserChannelEntity[]; total: number }> {
    const channels = await this.findByUser(params.userId)
    
    // Filter by tenant if provided
    let filtered = channels
    if (params.tenantId) {
      filtered = filtered.filter(c => c.tenantId === params.tenantId)
    }
    
    // Filter by channel type if provided
    if (params.channelType) {
      filtered = filtered.filter(c => c.channelType === params.channelType)
    }
    
    return { channels: filtered, total: filtered.length }
  }

  async getChannel(params: {
    channelId: string
    userId: string
  }): Promise<UserChannelEntity | null> {
    const channel = await this.findById(params.channelId)
    
    // Verify the channel belongs to the user
    if (channel && channel.userId !== params.userId) {
      return null
    }
    
    return channel
  }

  async disconnectChannel(params: {
    channelId: string
    userId: string
  }): Promise<void> {
    const channel = await this.getChannel(params)
    
    if (!channel) {
      throw new Error('Channel not found or access denied')
    }
    
    await this.deactivateChannel(params.channelId)
  }

  async getChannelStatistics(channelId: string): Promise<{
    totalConversations: number
    activeConversations: number
    totalMessages: number
    lastActivityAt?: Date
  }> {
    const channel = await this.findById(channelId)
    if (!channel) {
      throw new Error('Channel not found')
    }
    
    // TODO: Implement actual statistics gathering from conversation repository
    const stats: {
      totalConversations: number
      activeConversations: number
      totalMessages: number
      lastActivityAt?: Date
    } = {
      totalConversations: 0,
      activeConversations: 0,
      totalMessages: 0
    }
    
    if (channel.lastActiveAt) {
      stats.lastActivityAt = channel.lastActiveAt
    }
    
    return stats
  }

  async findByWhatsAppNumber(phoneNumber: string): Promise<UserChannelEntity | null> {
    // Find channel by WhatsApp phone number
    return this.findByIdentifier('whatsapp', phoneNumber)
  }
}