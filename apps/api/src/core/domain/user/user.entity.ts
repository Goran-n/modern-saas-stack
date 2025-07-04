import { z } from 'zod'

export const userStatusSchema = z.enum(['active', 'suspended', 'deleted'])
export type UserStatus = z.infer<typeof userStatusSchema>

export const userProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  bio: z.string().optional(),
}).strict()

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private']).optional(),
    shareAnalytics: z.boolean().optional(),
  }).optional(),
}).strict()

export type UserProfile = z.infer<typeof userProfileSchema>
export type UserPreferences = z.infer<typeof userPreferencesSchema>

export interface UserEntityProps {
  id: string
  email: string
  phone: string | null
  profile: UserProfile
  preferences: UserPreferences
  status: UserStatus
  emailVerified: boolean
  phoneVerified: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class UserEntity {
  private constructor(private props: UserEntityProps) {}

  static create(props: Omit<UserEntityProps, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'profile' | 'preferences' | 'emailVerified' | 'phoneVerified' | 'lastLoginAt'>): UserEntity {
    const now = new Date()
    return new UserEntity({
      ...props,
      id: crypto.randomUUID(),
      profile: {},
      preferences: {},
      emailVerified: false,
      phoneVerified: false,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static fromDatabase(props: UserEntityProps): UserEntity {
    return new UserEntity(props)
  }

  static fromSupabaseAuth(supabaseUser: {
    id: string
    email?: string
    phone?: string
    user_metadata?: Record<string, unknown>
    app_metadata?: Record<string, unknown>
    email_verified?: boolean
    phone_verified?: boolean
    last_sign_in_at?: string
    created_at?: string
    updated_at?: string
  }): UserEntity {
    const now = new Date()
    
    return new UserEntity({
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      phone: supabaseUser.phone || null,
      profile: {
        firstName: supabaseUser.user_metadata?.firstName as string,
        lastName: supabaseUser.user_metadata?.lastName as string,
        avatar: supabaseUser.user_metadata?.avatar as string,
      },
      preferences: {},
      status: 'active',
      emailVerified: supabaseUser.email_verified || false,
      phoneVerified: supabaseUser.phone_verified || false,
      lastLoginAt: supabaseUser.last_sign_in_at ? new Date(supabaseUser.last_sign_in_at) : null,
      createdAt: supabaseUser.created_at ? new Date(supabaseUser.created_at) : now,
      updatedAt: supabaseUser.updated_at ? new Date(supabaseUser.updated_at) : now,
      deletedAt: null,
    })
  }

  get id(): string { return this.props.id }
  get email(): string { return this.props.email }
  get phone(): string | null { return this.props.phone }
  get profile(): UserProfile { return this.props.profile }
  get preferences(): UserPreferences { return this.props.preferences }
  get status(): UserStatus { return this.props.status }
  get emailVerified(): boolean { return this.props.emailVerified }
  get phoneVerified(): boolean { return this.props.phoneVerified }
  get lastLoginAt(): Date | null { return this.props.lastLoginAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get deletedAt(): Date | null { return this.props.deletedAt }

  get displayName(): string {
    const { firstName, lastName } = this.props.profile
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) return firstName
    if (lastName) return lastName
    return this.props.email.split('@')[0]
  }

  get initials(): string {
    const { firstName, lastName } = this.props.profile
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) return firstName[0].toUpperCase()
    if (lastName) return lastName[0].toUpperCase()
    return this.props.email[0].toUpperCase()
  }

  isActive(): boolean {
    return this.props.status === 'active' && !this.props.deletedAt
  }

  isSuspended(): boolean {
    return this.props.status === 'suspended'
  }

  isDeleted(): boolean {
    return this.props.status === 'deleted' || !!this.props.deletedAt
  }

  isFullyVerified(): boolean {
    return this.props.emailVerified && (this.props.phone ? this.props.phoneVerified : true)
  }

  canLogin(): boolean {
    return this.isActive() && this.props.emailVerified
  }

  updateProfile(profile: Partial<UserProfile>): void {
    this.props.profile = { ...this.props.profile, ...profile }
    this.touch()
  }

  updatePreferences(preferences: Partial<UserPreferences>): void {
    this.props.preferences = { ...this.props.preferences, ...preferences }
    this.touch()
  }

  updateEmail(email: string): void {
    this.props.email = email
    this.props.emailVerified = false
    this.touch()
  }

  updatePhone(phone: string | null): void {
    this.props.phone = phone
    this.props.phoneVerified = false
    this.touch()
  }

  verifyEmail(): void {
    this.props.emailVerified = true
    this.touch()
  }

  verifyPhone(): void {
    this.props.phoneVerified = true
    this.touch()
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date()
    this.touch()
  }

  suspend(): void {
    if (this.props.status === 'deleted') {
      throw new Error('Cannot suspend deleted user')
    }
    this.props.status = 'suspended'
    this.touch()
  }

  activate(): void {
    if (this.props.status === 'deleted') {
      throw new Error('Cannot activate deleted user')
    }
    this.props.status = 'active'
    this.props.deletedAt = null
    this.touch()
  }

  softDelete(): void {
    this.props.status = 'deleted'
    this.props.deletedAt = new Date()
    this.touch()
  }

  restore(): void {
    if (!this.isDeleted()) {
      throw new Error('User is not deleted')
    }
    this.props.status = 'active'
    this.props.deletedAt = null
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }

  toDatabase(): UserEntityProps {
    return { ...this.props }
  }

  toPublic(): Omit<UserEntityProps, 'phone' | 'preferences' | 'emailVerified' | 'phoneVerified' | 'lastLoginAt'> {
    const { phone, preferences, emailVerified, phoneVerified, lastLoginAt, ...publicProps } = this.props
    return publicProps
  }
}