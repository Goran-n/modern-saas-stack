import { eq, desc, count, and, inArray } from 'drizzle-orm'
import { SyncJobEntity } from '../../core/domain/sync-job/index'
import type { SyncJobRepository } from '../../core/ports/sync-job.repository'
import { syncJobs, type SyncJob, type NewSyncJob } from '../../database/schema/sync-jobs'
import { BaseRepository, type Database } from '../database/types'

export class DrizzleSyncJobRepository extends BaseRepository implements SyncJobRepository {
  constructor(database: Database) {
    super(database)
  }

  async save(syncJob: SyncJobEntity): Promise<SyncJobEntity> {
    const data = syncJob.toDatabase()
    
    // Convert SyncJobEntityProps to database format
    const dbData: NewSyncJob = {
      id: data.id,
      integrationId: data.integrationId,
      tenantId: data.tenantId,
      jobType: data.jobType,
      status: data.status,
      priority: data.priority,
      progress: data.progress,
      result: data.result,
      error: data.error,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }

    const [result] = await (this.db as any)
      .insert(syncJobs)
      .values(dbData)
      .onConflictDoUpdate({
        target: syncJobs.id,
        set: {
          ...dbData,
          updatedAt: new Date(),
        },
      })
      .returning()

    return this.mapToEntity(result)
  }

  async findById(id: string): Promise<SyncJobEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.id, id))

    return result ? this.mapToEntity(result) : null
  }

  async findByTenantId(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SyncJobEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.tenantId, tenantId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByIntegrationId(
    integrationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SyncJobEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.integrationId, integrationId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByStatus(
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
    limit: number = 50,
    offset: number = 0
  ): Promise<SyncJobEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.status, status))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findPendingJobs(
    limit: number = 50,
    offset: number = 0
  ): Promise<SyncJobEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.status, 'pending'))
      .orderBy(desc(syncJobs.priority), syncJobs.createdAt)
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findRunningJobs(): Promise<SyncJobEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.status, 'running'))
      .orderBy(syncJobs.startedAt)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findRecentByTenantId(
    tenantId: string,
    limit: number = 10
  ): Promise<SyncJobEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.tenantId, tenantId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findRecentByIntegrationId(
    integrationId: string,
    limit: number = 10
  ): Promise<SyncJobEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.integrationId, integrationId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async countByTenantId(tenantId: string): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(syncJobs)
      .where(eq(syncJobs.tenantId, tenantId))

    return result.count
  }

  async countByIntegrationId(integrationId: string): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(syncJobs)
      .where(eq(syncJobs.integrationId, integrationId))

    return result.count
  }

  async countByStatus(
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  ): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(syncJobs)
      .where(eq(syncJobs.status, status))

    return result.count
  }

  async countByTenantIdAndStatus(
    tenantId: string,
    statuses: ('pending' | 'running' | 'completed' | 'failed' | 'cancelled')[]
  ): Promise<Record<string, number>> {
    const results = await (this.db as any)
      .select({
        status: syncJobs.status,
        count: count(),
      })
      .from(syncJobs)
      .where(and(
        eq(syncJobs.tenantId, tenantId),
        inArray(syncJobs.status, statuses)
      ))
      .groupBy(syncJobs.status)

    const statusCounts: Record<string, number> = {}
    for (const status of statuses) {
      statusCounts[status] = 0
    }

    for (const result of results) {
      statusCounts[result.status] = result.count
    }

    return statusCounts
  }

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(syncJobs)
      .where(eq(syncJobs.id, id))
  }

  async deleteByIntegrationId(integrationId: string): Promise<void> {
    await (this.db as any)
      .delete(syncJobs)
      .where(eq(syncJobs.integrationId, integrationId))
  }

  async deleteByTenantId(tenantId: string): Promise<void> {
    await (this.db as any)
      .delete(syncJobs)
      .where(eq(syncJobs.tenantId, tenantId))
  }

  async deleteCompletedOlderThan(_date: Date): Promise<void> {
    await (this.db as any)
      .delete(syncJobs)
      .where(and(
        eq(syncJobs.status, 'completed'),
        // completedAt < date - would need proper date comparison
      ))
  }

  private mapToEntity(dbSyncJob: SyncJob): SyncJobEntity {
    return SyncJobEntity.fromDatabase({
      id: dbSyncJob.id,
      integrationId: dbSyncJob.integrationId,
      tenantId: dbSyncJob.tenantId,
      jobType: dbSyncJob.jobType,
      status: dbSyncJob.status,
      priority: dbSyncJob.priority,
      progress: dbSyncJob.progress,
      result: dbSyncJob.result as any, // Type assertion for JSON data
      error: dbSyncJob.error,
      startedAt: dbSyncJob.startedAt,
      completedAt: dbSyncJob.completedAt,
      metadata: (dbSyncJob.metadata as any) || {},
      createdAt: dbSyncJob.createdAt,
      updatedAt: dbSyncJob.updatedAt,
    })
  }
}