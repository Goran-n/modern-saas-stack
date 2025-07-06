import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'

export type ChannelType = 'whatsapp' | 'slack' | 'teams' | 'email'
export type ChannelStatus = 'pending' | 'active' | 'inactive' | 'failed'

export interface ChannelSettings {
  autoDownloadMedia?: boolean
  notificationEnabled?: boolean
  allowedMediaTypes?: string[]
  maxFileSizeMb?: number
}

export interface UserChannelProps {
  id: EntityId
  userId: string
  tenantId: string
  channelType: ChannelType
  channelIdentifier: string
  channelName?: string | null
  status: ChannelStatus
  isVerified: boolean
  verificationCode?: string | null
  verificationExpiresAt?: Date | null
  settings: ChannelSettings
  lastActiveAt?: Date | null
  createdAt: Date
  updatedAt: Date
  version: number
}

export interface PublicUserChannel {
  id: string
  channelType: ChannelType
  channelIdentifier: string
  channelName?: string | null
  status: ChannelStatus
  isVerified: boolean
  settings: ChannelSettings
  lastActiveAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export class UserChannelEntity extends BaseEntity<UserChannelProps> {
  private constructor(props: UserChannelProps) {
    super(props)
  }

  static create(params: {
    userId: string
    tenantId: string
    channelType: ChannelType
    channelIdentifier: string
    channelName?: string
    settings?: ChannelSettings
  }): UserChannelEntity {
    const id = EntityId.generate()
    const now = new Date()
    
    return new UserChannelEntity({
      id,
      userId: params.userId,
      tenantId: params.tenantId,
      channelType: params.channelType,
      channelIdentifier: params.channelIdentifier,
      channelName: params.channelName || null,
      status: 'pending',
      isVerified: false,
      verificationCode: null,
      verificationExpiresAt: null,
      settings: params.settings || getDefaultSettings(params.channelType),
      lastActiveAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
  }

  static fromProps(props: UserChannelProps): UserChannelEntity {
    return new UserChannelEntity(props)
  }

  // Getters
  get id(): EntityId { return this.props.id }
  get userId(): string { return this.props.userId }
  get tenantId(): string { return this.props.tenantId }
  get channelType(): ChannelType { return this.props.channelType }
  get channelIdentifier(): string { return this.props.channelIdentifier }
  get channelName(): string | null | undefined { return this.props.channelName }
  get status(): ChannelStatus { return this.props.status }
  get isVerified(): boolean { return this.props.isVerified }
  get verificationCode(): string | null | undefined { return this.props.verificationCode }
  get verificationExpiresAt(): Date | null | undefined { return this.props.verificationExpiresAt }
  get settings(): ChannelSettings { return this.props.settings }
  get lastActiveAt(): Date | null | undefined { return this.props.lastActiveAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get version(): number { return this.props.version }
  get isActive(): boolean { return this.props.status === 'active' && this.props.isVerified }

  // Business methods
  activate(): void {
    this.props.status = 'active'
    this.props.lastActiveAt = new Date()
    this.touch()
  }

  deactivate(): void {
    this.props.status = 'inactive'
    this.touch()
  }

  markAsFailed(_error?: string): void {
    this.props.status = 'failed'
    this.touch()
  }

  updateActivity(): void {
    this.props.lastActiveAt = new Date()
    this.touch()
  }

  updateSettings(settings: Partial<ChannelSettings>): void {
    this.props.settings = { ...this.props.settings, ...settings }
    this.touch()
  }

  updateChannelName(name: string): void {
    this.props.channelName = name
    this.touch()
  }

  setVerificationCode(code: string, expiresInMinutes: number = 10): void {
    this.props.verificationCode = code
    this.props.verificationExpiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)
    this.touch()
  }
  
  verify(code: string): boolean {
    if (!this.props.verificationCode || !this.props.verificationExpiresAt) {
      return false
    }
    
    if (new Date() > this.props.verificationExpiresAt) {
      return false
    }
    
    if (this.props.verificationCode !== code) {
      return false
    }
    
    this.props.isVerified = true
    this.props.verificationCode = null
    this.props.verificationExpiresAt = null
    this.props.status = 'active'
    this.touch()
    
    return true
  }
  
  isVerificationExpired(): boolean {
    if (!this.props.verificationExpiresAt) {
      return true
    }
    return new Date() > this.props.verificationExpiresAt
  }

  toPublic(): PublicUserChannel {
    return {
      id: this.props.id.toString(),
      channelType: this.props.channelType,
      channelIdentifier: this.props.channelIdentifier,
      channelName: this.props.channelName ?? null,
      status: this.props.status,
      isVerified: this.props.isVerified,
      settings: this.props.settings,
      lastActiveAt: this.props.lastActiveAt ?? null,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    }
  }
}

// Helper function
function getDefaultSettings(channelType: ChannelType): ChannelSettings {
  switch (channelType) {
    case 'whatsapp':
      return {
        autoDownloadMedia: true,
        notificationEnabled: true,
        allowedMediaTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSizeMb: 10,
      }
    case 'slack':
      return {
        autoDownloadMedia: true,
        notificationEnabled: true,
        allowedMediaTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSizeMb: 20,
      }
    default:
      return {
        autoDownloadMedia: false,
        notificationEnabled: true,
      }
  }
}