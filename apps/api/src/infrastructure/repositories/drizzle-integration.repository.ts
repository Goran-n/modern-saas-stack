import { eq, desc, count, and } from 'drizzle-orm'
import { IntegrationEntity } from '../../core/domain/integration/index'
import type { IntegrationRepository } from '../../core/ports/integration.repository'
import { integrations, type Integration, type NewIntegration } from '../../database/schema/integrations'
import { BaseRepository, type Database } from '../database/types'

export class DrizzleIntegrationRepository extends BaseRepository implements IntegrationRepository {
  constructor(database: Database) {
    super(database)
  }

  async create(integration: IntegrationEntity): Promise<IntegrationEntity> {
    return this.save(integration)
  }

  async update(id: string, data: Partial<IntegrationEntity>): Promise<IntegrationEntity> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Integration not found: ${id}`)
    }
    
    // Update the entity with new data
    const updated = IntegrationEntity.fromDatabase({
      ...existing,
      ...data,
      id: existing.id,
      updatedAt: new Date()
    } as any)
    
    return this.save(updated)
  }

  async save(integration: IntegrationEntity): Promise<IntegrationEntity> {
    const data = integration.toDatabase()
    
    // Convert IntegrationEntityProps to database format
    const dbData: NewIntegration = {
      id: data.id,
      tenantId: data.tenantId,
      integrationType: data.integrationType,
      provider: data.provider,
      name: data.name,
      authData: data.authData,
      settings: data.settings,
      status: this.mapStatusToDb(data.status),
      lastSyncAt: data.lastSyncAt,
      lastError: data.lastErrorMessage,
      nextScheduledSync: data.nextScheduledSync,
      syncHealth: data.syncHealth,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }

    const [result] = await (this.db as any)
      .insert(integrations)
      .values(dbData)
      .onConflictDoUpdate({
        target: integrations.id,
        set: {
          ...dbData,
          updatedAt: new Date(),
        },
      })
      .returning()

    return this.mapToEntity(result)
  }

  async findById(id: string): Promise<IntegrationEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))

    return result ? this.mapToEntity(result) : null
  }

  async findByTenantId(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IntegrationEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(integrations)
      .where(eq(integrations.tenantId, tenantId))
      .orderBy(desc(integrations.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByTenant(tenantId: string): Promise<IntegrationEntity[]> {
    return this.findByTenantId(tenantId)
  }

  async findByTenantAndProvider(
    tenantId: string,
    provider: any
  ): Promise<IntegrationEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.provider, provider)
      ))
      .limit(1)

    return result ? this.mapToEntity(result) : null
  }

  async findByProvider(provider: any): Promise<IntegrationEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(integrations)
      .where(eq(integrations.provider, provider))
      .orderBy(desc(integrations.createdAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByType(type: any): Promise<IntegrationEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(integrations)
      .where(eq(integrations.integrationType, type))
      .orderBy(desc(integrations.createdAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async exists(id: string): Promise<boolean> {
    const [result] = await (this.db as any)
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.id, id))

    return !!result
  }

  async existsByTenantAndProvider(tenantId: string, provider: any): Promise<boolean> {
    const [result] = await (this.db as any)
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.provider, provider)
      ))

    return !!result
  }

  async countByTenant(tenantId: string): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(integrations)
      .where(eq(integrations.tenantId, tenantId))

    return result.count
  }

  async findActive(): Promise<IntegrationEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(integrations)
      .where(eq(integrations.status, 'active'))
      .orderBy(desc(integrations.createdAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findWithErrors(): Promise<IntegrationEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(integrations)
      .where(eq(integrations.status, 'error'))
      .orderBy(desc(integrations.updatedAt))

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findDueForSync(): Promise<IntegrationEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(integrations)
      .where(eq(integrations.status, 'active'))
      .orderBy(integrations.nextScheduledSync)

    return results
      .map((result: Integration) => this.mapToEntity(result))
      .filter((integration: IntegrationEntity) => integration.isDueForSync())
  }


  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(integrations)
      .where(eq(integrations.id, id))
  }

  async deleteByTenantId(tenantId: string): Promise<void> {
    await (this.db as any)
      .delete(integrations)
      .where(eq(integrations.tenantId, tenantId))
  }

  async updateLastSyncAt(id: string, lastSyncAt: Date): Promise<void> {
    await (this.db as any)
      .update(integrations)
      .set({
        lastSyncAt,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id))
  }

  async updateSyncHealth(
    id: string,
    syncHealth: 'healthy' | 'warning' | 'error' | 'unknown'
  ): Promise<void> {
    await (this.db as any)
      .update(integrations)
      .set({
        syncHealth,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id))
  }

  async updateAuthData(id: string, authData: Record<string, unknown>): Promise<void> {
    await (this.db as any)
      .update(integrations)
      .set({
        authData,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id))
  }

  private mapToEntity(dbIntegration: Integration): IntegrationEntity {
    return IntegrationEntity.fromDatabase({
      id: dbIntegration.id,
      tenantId: dbIntegration.tenantId,
      provider: dbIntegration.provider as any, // Type assertion needed for enum conversion
      integrationType: dbIntegration.integrationType,
      name: dbIntegration.name,
      status: this.mapStatusFromDb(dbIntegration.status),
      authData: dbIntegration.authData as Record<string, unknown>,
      settings: (dbIntegration.settings as any) || {},
      lastSyncAt: dbIntegration.lastSyncAt,
      lastErrorAt: dbIntegration.lastError ? new Date() : null, // Approximate since we don't store lastErrorAt separately
      lastErrorMessage: dbIntegration.lastError,
      nextScheduledSync: dbIntegration.nextScheduledSync,
      syncHealth: (dbIntegration.syncHealth as 'healthy' | 'warning' | 'error' | 'unknown') || 'unknown',
      syncCount: 0, // We'll need to calculate this from sync jobs if needed
      errorCount: 0, // We'll need to calculate this from sync jobs if needed
      createdAt: dbIntegration.createdAt,
      updatedAt: dbIntegration.updatedAt,
    })
  }

  private mapStatusToDb(status: 'active' | 'disabled' | 'error' | 'setup_pending'): 'active' | 'error' | 'disabled' | 'setup_pending' {
    return status // Direct mapping since they now match
  }

  private mapStatusFromDb(status: 'active' | 'error' | 'disabled' | 'setup_pending'): 'active' | 'disabled' | 'error' | 'setup_pending' {
    return status // Direct mapping since they now match
  }
}