import type { FileEntity } from '../domain/file/index'

export interface FileSearchFilters {
  status?: string[]
  reviewStatus?: string[]
  source?: string[]
  mimeType?: string[]
  isDuplicate?: boolean
  integrationId?: string
  createdFrom?: Date
  createdTo?: Date
}

export interface FileRepository {
  save(file: FileEntity): Promise<FileEntity>
  saveBatch(files: FileEntity[]): Promise<FileEntity[]>
  findById(id: string): Promise<FileEntity | null>
  findByTenantId(tenantId: string, filters?: FileSearchFilters, limit?: number, offset?: number): Promise<FileEntity[]>
  findByIntegrationId(integrationId: string, limit?: number, offset?: number): Promise<FileEntity[]>
  findByHash(tenantId: string, sha256Hash: string): Promise<FileEntity | null>
  findBySourceId(tenantId: string, source: string, sourceId: string): Promise<FileEntity | null>
  findDuplicates(tenantId: string, limit?: number, offset?: number): Promise<FileEntity[]>
  findPendingReview(tenantId: string, limit?: number): Promise<FileEntity[]>
  countByTenantId(tenantId: string, filters?: FileSearchFilters): Promise<number>
  countByIntegrationId(integrationId: string): Promise<number>
  updateReviewStatus(id: string, status: string, reason?: string): Promise<void>
  delete(id: string): Promise<void>
  deleteByIntegrationId(integrationId: string): Promise<void>
  getFileSummary(tenantId: string): Promise<{
    totalFiles: number
    totalSizeBytes: number
    filesByStatus: Record<string, number>
    filesBySource: Record<string, number>
    duplicateCount: number
  }>
}