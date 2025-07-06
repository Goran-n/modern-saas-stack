import type { TenantEntity, TenantMemberEntity } from '../domain/tenant'
import { EntityId } from '../domain/shared/value-objects/entity-id'

export interface TenantRepository {
  findById(id: EntityId): Promise<TenantEntity | null>
  findBySlug(slug: string): Promise<TenantEntity | null>
  findByEmail(email: string): Promise<TenantEntity | null>
  findByUserId(userId: string): Promise<Array<TenantEntity & { membership: TenantMemberEntity }>>
  save(tenant: TenantEntity): Promise<TenantEntity>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>
  count(): Promise<number>
  findAll(options?: {
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<TenantEntity[]>
}