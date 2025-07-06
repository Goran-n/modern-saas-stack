import type { TenantRepository } from '../core/ports/tenant.repository'
import type { TenantEntity } from '../core/domain/tenant'
import { TenantEntity as TenantEntityClass } from '../core/domain/tenant'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'
import { container, TOKENS } from '../shared/utils/container'

export class TenantService {
  constructor() {}

  async findById(id: string): Promise<TenantEntity | null> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    return repository.findById(EntityId.from(id))
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    return repository.findBySlug(slug)
  }

  async save(tenant: TenantEntity): Promise<TenantEntity> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    return repository.save(tenant)
  }

  async delete(id: string): Promise<void> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    return repository.delete(id)
  }

  async createTenant(data: {
    name: string
    email: string
    slug?: string
    settings?: any
    metadata?: any
  }): Promise<TenantEntity> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    
    // Check if slug is already taken
    if (data.slug) {
      const existing = await repository.findBySlug(data.slug)
      if (existing) {
        throw new Error(`Tenant with slug ${data.slug} already exists`)
      }
    }
    
    // Generate slug if not provided
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    // Create tenant entity
    const tenant = TenantEntityClass.create({
      name: data.name,
      email: data.email,
      slug,
      status: 'active',
      settings: data.settings || {},
      subscription: {},
      metadata: data.metadata || {}
    })
    
    return repository.save(tenant)
  }

  async getUserTenants(userId: string): Promise<TenantEntity[]> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    const results = await repository.findByUserId(userId)
    return results.map(r => r) // Return just the tenant entities
  }

  async updateTenant(id: string, data: {
    name?: string
    email?: string
    settings?: any
    subscription?: any
    metadata?: any
  }): Promise<TenantEntity> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    
    const tenant = await repository.findById(EntityId.from(id))
    if (!tenant) {
      throw new Error(`Tenant with id ${id} not found`)
    }
    
    // Update fields
    if (data.name) {
      tenant.updateName(data.name)
    }
    if (data.email) {
      tenant.updateEmail(data.email)
    }
    if (data.settings) {
      tenant.updateSettings(data.settings)
    }
    if (data.subscription) {
      tenant.updateSubscription(data.subscription)
    }
    if (data.metadata) {
      tenant.updateMetadata(data.metadata)
    }
    
    return repository.save(tenant)
  }

  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    const repository = container.resolve<TenantRepository>(TOKENS.TENANT_REPOSITORY)
    
    // Check if user has access to this tenant
    const userTenants = await repository.findByUserId(userId)
    return userTenants.some(t => t.id.toString() === tenantId)
  }

  async getTenantById(id: string): Promise<TenantEntity | null> {
    return this.findById(id)
  }
}