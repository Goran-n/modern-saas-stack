import type { SyncJobRepository } from '../core/ports/sync-job.repository'
import type { SyncJobEntity } from '../core/domain/sync-job'

export class SyncJobService {
  constructor(
    private syncJobRepository: SyncJobRepository
  ) {}

  async findById(id: string): Promise<SyncJobEntity | null> {
    return this.syncJobRepository.findById(id)
  }

  async findByIntegration(integrationId: string): Promise<SyncJobEntity[]> {
    return this.syncJobRepository.findByIntegrationId(integrationId)
  }

  async create(_data: any): Promise<SyncJobEntity> {
    // Implementation needed
    throw new Error('Not implemented')
  }

  async update(_id: string, _data: any): Promise<SyncJobEntity> {
    // Implementation needed
    throw new Error('Not implemented')
  }
}