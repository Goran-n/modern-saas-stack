import { z } from 'zod'
import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'

export const tenantStatusSchema = z.enum(['active', 'suspended', 'deleted'])
export type TenantStatus = z.infer<typeof tenantStatusSchema>

export const tenantSettingsSchema = z.object({
  maxApiCalls: z.number().optional(),
  enabledFeatures: z.array(z.string()).optional(),
  securitySettings: z.object({
    requireMfa: z.boolean().optional(),
    sessionTimeout: z.number().optional(),
  }).optional(),
}).strict()

export const tenantSubscriptionSchema = z.object({
  planId: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'past_due', 'trialing']).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
}).strict()

export const tenantMetadataSchema = z.object({
  companyInfo: z.object({
    industry: z.string().optional(),
    size: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']).optional(),
    country: z.string().optional(),
  }).optional(),
  onboarding: z.object({
    completed: z.boolean().optional(),
    currentStep: z.string().optional(),
    completedSteps: z.array(z.string()).optional(),
  }).optional(),
  integration: z.object({
    primaryProvider: z.string().optional(),
    connectedProviders: z.array(z.string()).optional(),
  }).optional(),
}).strict()

export type TenantSettings = z.infer<typeof tenantSettingsSchema>
export type TenantSubscription = z.infer<typeof tenantSubscriptionSchema>
export type TenantMetadata = z.infer<typeof tenantMetadataSchema>

export interface TenantEntityProps {
  id: EntityId
  name: string
  slug: string
  email: string
  status: TenantStatus
  settings: TenantSettings
  subscription: TenantSubscription
  metadata: TenantMetadata
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class TenantEntity extends BaseEntity<TenantEntityProps> {
  private constructor(props: TenantEntityProps) {
    super(props)
  }

  static create(props: Omit<TenantEntityProps, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): TenantEntity {
    const now = new Date()
    return new TenantEntity({
      ...props,
      id: EntityId.generate(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static fromDatabase(props: TenantEntityProps): TenantEntity {
    return new TenantEntity(props)
  }

  get id(): EntityId { return this.props.id }
  get name(): string { return this.props.name }
  get slug(): string { return this.props.slug }
  get email(): string { return this.props.email }
  get status(): TenantStatus { return this.props.status }
  get settings(): TenantSettings { return this.props.settings }
  get subscription(): TenantSubscription { return this.props.subscription }
  get metadata(): TenantMetadata { return this.props.metadata }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get deletedAt(): Date | null { return this.props.deletedAt }

  isActive(): boolean {
    return this.props.status === 'active' && !this.props.deletedAt
  }

  isSuspended(): boolean {
    return this.props.status === 'suspended'
  }

  isDeleted(): boolean {
    return this.props.status === 'deleted' || !!this.props.deletedAt
  }

  canAcceptNewMembers(): boolean {
    return this.isActive()
  }

  hasFeatureEnabled(feature: string): boolean {
    return this.props.settings.enabledFeatures?.includes(feature) ?? false
  }

  isWithinApiLimits(currentCalls: number): boolean {
    const maxCalls = this.props.settings.maxApiCalls
    return maxCalls ? currentCalls < maxCalls : true
  }

  updateName(name: string): void {
    this.props.name = name
    this.touch()
  }

  updateEmail(email: string): void {
    this.props.email = email
    this.touch()
  }

  updateSettings(settings: Partial<TenantSettings>): void {
    this.props.settings = { ...this.props.settings, ...settings }
    this.touch()
  }

  updateSubscription(subscription: Partial<TenantSubscription>): void {
    this.props.subscription = { ...this.props.subscription, ...subscription }
    this.touch()
  }

  updateMetadata(metadata: Partial<TenantMetadata>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
    this.touch()
  }

  suspend(): void {
    if (this.props.status === 'deleted') {
      throw new Error('Cannot suspend deleted tenant')
    }
    this.props.status = 'suspended'
    this.touch()
  }

  activate(): void {
    if (this.props.status === 'deleted') {
      throw new Error('Cannot activate deleted tenant')
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
      throw new Error('Tenant is not deleted')
    }
    this.props.status = 'active'
    this.props.deletedAt = null
    this.touch()
  }


  toDatabase(): TenantEntityProps {
    return { ...this.props }
  }
}