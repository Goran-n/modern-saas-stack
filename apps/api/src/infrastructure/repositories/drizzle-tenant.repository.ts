import { eq, desc, count, like, and, ne } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { TenantEntity, TenantMemberEntity, type TenantStatus } from '../../core/domain/tenant/index'
import type { TenantRepository } from '../../core/ports/tenant.repository'
import { tenants, type Tenant, type NewTenant } from '../../database/schema/tenants'
import { tenantMembers } from '../../database/schema/tenant-members'

type Database = DrizzleD1Database<any> | PostgresJsDatabase<any>

export class DrizzleTenantRepository implements TenantRepository {
  constructor(private db: Database) {}

  async save(tenant: TenantEntity): Promise<TenantEntity> {
    const data = tenant.toDatabase()
    
    const dbData: NewTenant = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      email: data.email,
      status: data.status,
      settings: data.settings,
      subscription: data.subscription,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
    }

    const [result] = await (this.db as any)
      .insert(tenants)
      .values(dbData)
      .onConflictDoUpdate({
        target: tenants.id,
        set: {
          ...dbData,
          updatedAt: new Date(),
        },
      })
      .returning()

    return this.mapToEntity(result)
  }

  async findById(id: string): Promise<TenantEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))

    return result ? this.mapToEntity(result) : null
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))

    return result ? this.mapToEntity(result) : null
  }

  async findAll(options?: {
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<TenantEntity[]> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0
    const results = await (this.db as any)
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((result: Tenant) => this.mapToEntity(result))
  }

  async searchByName(name: string, limit: number = 50): Promise<TenantEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(tenants)
      .where(like(tenants.name, `%${name}%`))
      .orderBy(desc(tenants.createdAt))
      .limit(limit)

    return results.map((result: Tenant) => this.mapToEntity(result))
  }

  async count(): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(tenants)

    return result.count
  }

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(tenants)
      .where(eq(tenants.id, id))
  }

  async exists(id: string): Promise<boolean> {
    const [result] = await (this.db as any)
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, id))

    return !!result
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const conditions = excludeId 
      ? and(eq(tenants.slug, slug), ne(tenants.id, excludeId))
      : eq(tenants.slug, slug)
      
    const [result] = await (this.db as any)
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(conditions)

    return !!result
  }

  async findByEmail(email: string): Promise<TenantEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(tenants)
      .where(eq(tenants.email, email))

    return result ? this.mapToEntity(result) : null
  }

  async findByUserId(userId: string): Promise<Array<TenantEntity & { membership: TenantMemberEntity }>> {
    const results = await (this.db as any)
      .select({
        tenant: tenants,
        membership: tenantMembers,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(eq(tenantMembers.userId, userId))

    return results.map((result: any) => {
      const tenant = this.mapToEntity(result.tenant)
      const membership = TenantMemberEntity.fromDatabase({
        id: result.membership.id,
        tenantId: result.membership.tenantId,
        userId: result.membership.userId,
        role: result.membership.role,
        permissions: result.membership.permissions || {},
        status: result.membership.status,
        invitationToken: result.membership.invitationToken,
        invitationExpiresAt: result.membership.invitationExpiresAt,
        joinedAt: result.membership.joinedAt,
        lastAccessAt: result.membership.lastAccessAt,
        createdAt: result.membership.createdAt,
        updatedAt: result.membership.updatedAt,
      })
      return Object.assign(tenant, { membership })
    })
  }

  private mapToEntity(dbTenant: Tenant): TenantEntity {
    return TenantEntity.fromDatabase({
      id: dbTenant.id,
      name: dbTenant.name,
      slug: dbTenant.slug,
      email: dbTenant.email || '',
      status: (dbTenant.status as TenantStatus) || 'active',
      settings: (dbTenant.settings as any) || {},
      subscription: (dbTenant.subscription as any) || {},
      metadata: (dbTenant.metadata as any) || {},
      createdAt: dbTenant.createdAt,
      updatedAt: dbTenant.updatedAt,
      deletedAt: dbTenant.deletedAt,
    })
  }
}