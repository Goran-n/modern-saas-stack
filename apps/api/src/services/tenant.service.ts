import { eq, and, isNull, ne } from 'drizzle-orm'
import { getDatabase } from '../database/connection'
import { tenants, tenantMembers, type Tenant, type TenantSettings, type TenantSubscription, type TenantMetadata } from '../database/schema'
import { generateSlug } from '../utils/slug'
import log from '../config/logger'
import { getTenantMemberService } from '../lib/di/services'

export class TenantService {
  private db = getDatabase()

  async createTenant(data: {
    name: string
    email: string
    slug?: string
    settings?: TenantSettings
    subscription?: TenantSubscription
    metadata?: TenantMetadata
    ownerId?: string
  }): Promise<Tenant> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    // Generate unique slug
    const slug = data.slug || await this.generateUniqueSlug(data.name)

    try {
      const result = await this.db.transaction(async (tx) => {
        // Create tenant
        const [tenant] = await tx.insert(tenants).values({
          name: data.name,
          email: data.email,
          slug,
          settings: data.settings || {},
          subscription: data.subscription || {},
          metadata: data.metadata || {},
          status: 'active',
        }).returning()

        // Create owner membership if ownerId provided
        if (data.ownerId) {
          await tx.insert(tenantMembers).values({
            tenantId: tenant.id,
            userId: data.ownerId,
            role: 'owner',
            status: 'active',
            joinedAt: new Date(),
          })
        }

        return tenant
      })

      log.info(`Tenant created: ${result.id} (${result.slug})`)
      return result
    } catch (error) {
      log.error('Failed to create tenant:', error)
      throw new Error('Failed to create tenant')
    }
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    if (!this.db) return null

    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))

    return tenant || null
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    if (!this.db) return null

    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))

    return tenant || null
  }

  async getTenantByEmail(email: string): Promise<Tenant | null> {
    if (!this.db) return null

    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.email, email), isNull(tenants.deletedAt)))

    return tenant || null
  }

  async updateTenant(
    id: string,
    updates: Partial<Pick<Tenant, 'name' | 'email' | 'settings' | 'subscription' | 'metadata' | 'status'>>
  ): Promise<Tenant> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    // If name is being updated, regenerate slug
    const updateData: any = { ...updates, updatedAt: new Date() }
    if (updates.name) {
      const newSlug = await this.generateUniqueSlug(updates.name, id)
      updateData.slug = newSlug
    }

    const [updated] = await this.db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, id))
      .returning()

    if (!updated) {
      throw new Error('Tenant not found')
    }

    log.info(`Tenant updated: ${updated.id}`)
    return updated
  }

  async softDeleteTenant(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    await this.db
      .update(tenants)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))

    log.info(`Tenant soft deleted: ${id}`)
  }

  async restoreTenant(id: string): Promise<Tenant> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    const [restored] = await this.db
      .update(tenants)
      .set({
        status: 'active',
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning()

    if (!restored) {
      throw new Error('Tenant not found')
    }

    log.info(`Tenant restored: ${restored.id}`)
    return restored
  }

  async getUserTenants(userId: string): Promise<Array<Tenant & { membership: any }>> {
    if (!this.db) return []

    const result = await this.db
      .select({
        tenant: tenants,
        membership: tenantMembers,
      })
      .from(tenants)
      .innerJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId))
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.status, 'active'),
          isNull(tenants.deletedAt)
        )
      )

    // Get tenant member service to merge permissions
    const memberService = await getTenantMemberService()

    return result.map(row => ({
      ...row.tenant,
      membership: {
        ...row.membership,
        // Merge default role permissions with custom permissions
        permissions: memberService.getMemberPermissions(row.membership)
      },
    }))
  }

  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    if (!this.db) return false

    const [membership] = await this.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.status, 'active')
        )
      )

    return !!membership
  }

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    if (!this.db) {
      throw new Error('Database not available')
    }

    const baseSlug = generateSlug(name)
    let slug = baseSlug
    let counter = 1

    while (true) {
      // Check if slug exists (excluding current tenant if updating)
      const whereConditions = [eq(tenants.slug, slug), isNull(tenants.deletedAt)]
      if (excludeId) {
        whereConditions.push(ne(tenants.id, excludeId))
      }

      const [existing] = await this.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(...whereConditions))

      if (!existing) {
        return slug
      }

      slug = `${baseSlug}-${counter}`
      counter++
    }
  }
}