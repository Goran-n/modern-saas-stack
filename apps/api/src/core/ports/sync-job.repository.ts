import type { SyncJobEntity } from '../domain/sync-job/index'

export interface SyncJobRepository {
  save(syncJob: SyncJobEntity): Promise<SyncJobEntity>
  findById(id: string): Promise<SyncJobEntity | null>
  findByIntegrationId(integrationId: string, limit?: number, offset?: number): Promise<SyncJobEntity[]>
  findByTenantId(tenantId: string, limit?: number, offset?: number): Promise<SyncJobEntity[]>
  findPendingJobs(limit?: number): Promise<SyncJobEntity[]>
  findRunningJobs(): Promise<SyncJobEntity[]>
  countByIntegrationId(integrationId: string): Promise<number>
  countByTenantId(tenantId: string): Promise<number>
  delete(id: string): Promise<void>
  deleteByIntegrationId(integrationId: string): Promise<void>
}