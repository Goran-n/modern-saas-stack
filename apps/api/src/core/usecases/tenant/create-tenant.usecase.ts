import { TenantEntity } from '../../domain/tenant'
import { TenantMemberEntity } from '../../domain/tenant'
import { ConflictError, BusinessRuleError } from '../../../shared/errors'
import type { TenantRepository, TenantMemberRepository } from '../../ports'
import { generateSlug } from '../../../utils/slug'

export interface CreateTenantInput {
  name: string
  email: string
  slug?: string
  ownerId: string
  settings?: Record<string, unknown>
  subscription?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface CreateTenantOutput {
  tenant: TenantEntity
  ownerMembership: TenantMemberEntity
}

export class CreateTenantUseCase {
  constructor(
    private tenantRepository: TenantRepository,
    private tenantMemberRepository: TenantMemberRepository
  ) {}

  async execute(input: CreateTenantInput): Promise<CreateTenantOutput> {
    // Validate business rules
    await this.validateBusinessRules(input)

    // Generate unique slug
    const slug = await this.generateUniqueSlug(input.name, input.slug)

    // Create tenant entity
    const tenant = TenantEntity.create({
      name: input.name,
      email: input.email,
      slug,
      status: 'active',
      settings: input.settings || {},
      subscription: input.subscription || {},
      metadata: input.metadata || {},
    })

    // Create owner membership
    const ownerMembership = TenantMemberEntity.create({
      tenantId: tenant.id.toString(),
      userId: input.ownerId,
      role: 'owner',
      status: 'active',
      invitationToken: null,
      invitationExpiresAt: null,
      joinedAt: new Date(),
      lastAccessAt: new Date(),
    })

    // Save to repository
    const savedTenant = await this.tenantRepository.save(tenant)
    const savedMembership = await this.tenantMemberRepository.save(ownerMembership)

    return {
      tenant: savedTenant,
      ownerMembership: savedMembership,
    }
  }

  private async validateBusinessRules(input: CreateTenantInput): Promise<void> {
    // Check if email is already taken
    const existingTenant = await this.tenantRepository.findByEmail(input.email)
    if (existingTenant) {
      throw new ConflictError('A tenant with this email already exists')
    }

    // Check if custom slug is already taken
    if (input.slug) {
      const existingSlugTenant = await this.tenantRepository.findBySlug(input.slug)
      if (existingSlugTenant) {
        throw new ConflictError('A tenant with this slug already exists')
      }
    }

    // Validate tenant name
    if (input.name.length < 2 || input.name.length > 100) {
      throw new BusinessRuleError(
        'TENANT_NAME_LENGTH',
        'Tenant name must be between 2 and 100 characters'
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.email)) {
      throw new BusinessRuleError(
        'INVALID_EMAIL_FORMAT',
        'Email must be a valid email address'
      )
    }
  }

  private async generateUniqueSlug(name: string, customSlug?: string): Promise<string> {
    if (customSlug) {
      return customSlug
    }

    const baseSlug = generateSlug(name)
    let slug = baseSlug
    let counter = 1

    while (await this.tenantRepository.existsBySlug(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }
}