import { eq, and, desc, count, inArray, gte, lte, sql } from 'drizzle-orm'
import { FileEntity } from '../../core/domain/file/index'
import type { FileRepository, FileSearchFilters } from '../../core/ports/file.repository'
import { files, type File, type NewFile } from '../../database/schema/files'
import { BaseRepository, type Database } from '../database/types'

export class DrizzleFileRepository extends BaseRepository implements FileRepository {
  constructor(database: Database) {
    super(database)
  }

  async save(file: FileEntity): Promise<FileEntity> {
    const data = file.toDatabase()
    
    // Convert FileEntityProps to database format
    const dbData: NewFile = {
      id: data.id,
      tenantId: data.tenantId,
      integrationId: data.integrationId,
      filename: data.filename,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      sha256Hash: data.sha256Hash,
      storageKey: data.storageKey,
      storageBucket: data.storageBucket,
      source: data.source,
      sourceId: data.sourceId,
      sourcePath: data.sourcePath,
      sourceModifiedAt: data.sourceModifiedAt,
      sourceMetadata: data.sourceMetadata,
      status: data.status,
      reviewStatus: data.reviewStatus,
      rejectionReason: data.rejectionReason,
      isDuplicate: data.isDuplicate,
      duplicateOf: data.duplicateOf,
      metadata: data.metadata,
      virusScanned: data.virusScanned,
      virusScanResult: data.virusScanResult,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      version: data.version,
    }

    const [result] = await (this.db as any)
      .insert(files)
      .values(dbData)
      .onConflictDoUpdate({
        target: files.id,
        set: {
          status: dbData.status,
          reviewStatus: dbData.reviewStatus,
          rejectionReason: dbData.rejectionReason,
          isDuplicate: dbData.isDuplicate,
          duplicateOf: dbData.duplicateOf,
          metadata: dbData.metadata,
          virusScanned: dbData.virusScanned,
          virusScanResult: dbData.virusScanResult,
          sourceModifiedAt: dbData.sourceModifiedAt,
          updatedAt: dbData.updatedAt,
          updatedBy: dbData.updatedBy,
          version: sql`${files.version} + 1`,
        },
      })
      .returning()

    return FileEntity.fromDatabase(this.mapToEntityProps(result))
  }

  async saveBatch(fileEntities: FileEntity[]): Promise<FileEntity[]> {
    if (fileEntities.length === 0) return []

    const dbData = fileEntities.map(file => {
      const data = file.toDatabase()
      return {
        id: data.id,
        tenantId: data.tenantId,
        integrationId: data.integrationId,
        filename: data.filename,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        sha256Hash: data.sha256Hash,
        storageKey: data.storageKey,
        storageBucket: data.storageBucket,
        source: data.source,
        sourceId: data.sourceId,
        sourcePath: data.sourcePath,
        sourceModifiedAt: data.sourceModifiedAt,
        sourceMetadata: data.sourceMetadata,
        status: data.status,
        reviewStatus: data.reviewStatus,
        rejectionReason: data.rejectionReason,
        isDuplicate: data.isDuplicate,
        duplicateOf: data.duplicateOf,
        metadata: data.metadata,
        virusScanned: data.virusScanned,
        virusScanResult: data.virusScanResult,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        version: data.version,
      } as NewFile
    })

    const results = await (this.db as any)
      .insert(files)
      .values(dbData)
      .returning()

    return results.map((result: File) => FileEntity.fromDatabase(this.mapToEntityProps(result)))
  }

  async findById(id: string): Promise<FileEntity | null> {
    const result = await (this.db as any)
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1)

    if (result.length === 0) return null
    
    return FileEntity.fromDatabase(this.mapToEntityProps(result[0]))
  }

  async findByTenantId(
    tenantId: string,
    filters?: FileSearchFilters,
    limit = 100,
    offset = 0
  ): Promise<FileEntity[]> {
    let query = (this.db as any)
      .select()
      .from(files)
      .where(eq(files.tenantId, tenantId))

    // Apply filters
    if (filters) {
      const conditions = [eq(files.tenantId, tenantId)]

      if (filters.status && filters.status.length > 0) {
        conditions.push(inArray(files.status, filters.status))
      }

      if (filters.reviewStatus && filters.reviewStatus.length > 0) {
        conditions.push(inArray(files.reviewStatus, filters.reviewStatus))
      }

      if (filters.source && filters.source.length > 0) {
        conditions.push(inArray(files.source, filters.source))
      }

      if (filters.mimeType && filters.mimeType.length > 0) {
        conditions.push(inArray(files.mimeType, filters.mimeType))
      }

      if (filters.isDuplicate !== undefined) {
        conditions.push(eq(files.isDuplicate, filters.isDuplicate))
      }

      if (filters.integrationId) {
        conditions.push(eq(files.integrationId, filters.integrationId))
      }

      if (filters.createdFrom) {
        conditions.push(gte(files.createdAt, filters.createdFrom))
      }

      if (filters.createdTo) {
        conditions.push(lte(files.createdAt, filters.createdTo))
      }


      query = query.where(and(...conditions))
    }

    query = query
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset)

    const results = await query

    return results.map((result: File) => FileEntity.fromDatabase(this.mapToEntityProps(result)))
  }

  async findByIntegrationId(integrationId: string, limit = 100, offset = 0): Promise<FileEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(files)
      .where(eq(files.integrationId, integrationId))
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((result: File) => FileEntity.fromDatabase(this.mapToEntityProps(result)))
  }

  async findByHash(tenantId: string, sha256Hash: string): Promise<FileEntity | null> {
    const result = await (this.db as any)
      .select()
      .from(files)
      .where(and(
        eq(files.tenantId, tenantId),
        eq(files.sha256Hash, sha256Hash)
      ))
      .limit(1)

    if (result.length === 0) return null
    
    return FileEntity.fromDatabase(this.mapToEntityProps(result[0]))
  }

  async findBySourceId(tenantId: string, source: string, sourceId: string): Promise<FileEntity | null> {
    const result = await (this.db as any)
      .select()
      .from(files)
      .where(and(
        eq(files.tenantId, tenantId),
        eq(files.source, source),
        eq(files.sourceId, sourceId)
      ))
      .limit(1)

    if (result.length === 0) return null
    
    return FileEntity.fromDatabase(this.mapToEntityProps(result[0]))
  }

  async findDuplicates(tenantId: string, limit = 100, offset = 0): Promise<FileEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(files)
      .where(and(
        eq(files.tenantId, tenantId),
        eq(files.isDuplicate, true)
      ))
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((result: File) => FileEntity.fromDatabase(this.mapToEntityProps(result)))
  }

  async findPendingReview(tenantId: string, limit = 100): Promise<FileEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(files)
      .where(and(
        eq(files.tenantId, tenantId),
        eq(files.reviewStatus, 'not_reviewed')
      ))
      .orderBy(desc(files.createdAt))
      .limit(limit)

    return results.map((result: File) => FileEntity.fromDatabase(this.mapToEntityProps(result)))
  }

  async countByTenantId(tenantId: string, filters?: FileSearchFilters): Promise<number> {
    let query = (this.db as any)
      .select({ count: count() })
      .from(files)
      .where(eq(files.tenantId, tenantId))

    // Apply same filters as findByTenantId
    if (filters) {
      const conditions = [eq(files.tenantId, tenantId)]

      if (filters.status && filters.status.length > 0) {
        conditions.push(inArray(files.status, filters.status))
      }

      if (filters.reviewStatus && filters.reviewStatus.length > 0) {
        conditions.push(inArray(files.reviewStatus, filters.reviewStatus))
      }

      if (filters.source && filters.source.length > 0) {
        conditions.push(inArray(files.source, filters.source))
      }

      if (filters.mimeType && filters.mimeType.length > 0) {
        conditions.push(inArray(files.mimeType, filters.mimeType))
      }

      if (filters.isDuplicate !== undefined) {
        conditions.push(eq(files.isDuplicate, filters.isDuplicate))
      }

      if (filters.integrationId) {
        conditions.push(eq(files.integrationId, filters.integrationId))
      }

      if (filters.createdFrom) {
        conditions.push(gte(files.createdAt, filters.createdFrom))
      }

      if (filters.createdTo) {
        conditions.push(lte(files.createdAt, filters.createdTo))
      }


      query = query.where(and(...conditions))
    }

    const result = await query
    return result[0]?.count || 0
  }

  async countByIntegrationId(integrationId: string): Promise<number> {
    const result = await (this.db as any)
      .select({ count: count() })
      .from(files)
      .where(eq(files.integrationId, integrationId))

    return result[0]?.count || 0
  }

  async updateReviewStatus(id: string, status: string, reason?: string): Promise<void> {
    await (this.db as any)
      .update(files)
      .set({
        reviewStatus: status,
        rejectionReason: reason,
        updatedAt: new Date(),
        version: sql`${files.version} + 1`,
      })
      .where(eq(files.id, id))
  }

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(files)
      .where(eq(files.id, id))
  }

  async deleteByIntegrationId(integrationId: string): Promise<void> {
    await (this.db as any)
      .delete(files)
      .where(eq(files.integrationId, integrationId))
  }

  async getFileSummary(tenantId: string): Promise<{
    totalFiles: number
    totalSizeBytes: number
    filesByStatus: Record<string, number>
    filesBySource: Record<string, number>
    duplicateCount: number
  }> {
    // Get total count and size
    const totals = await (this.db as any)
      .select({
        count: count(),
        totalSize: sql<number>`COALESCE(SUM(${files.sizeBytes}), 0)`,
      })
      .from(files)
      .where(eq(files.tenantId, tenantId))

    // Get counts by status
    const statusCounts = await (this.db as any)
      .select({
        status: files.status,
        count: count(),
      })
      .from(files)
      .where(eq(files.tenantId, tenantId))
      .groupBy(files.status)

    // Get counts by source
    const sourceCounts = await (this.db as any)
      .select({
        source: files.source,
        count: count(),
      })
      .from(files)
      .where(eq(files.tenantId, tenantId))
      .groupBy(files.source)

    // Get duplicate count
    const duplicates = await (this.db as any)
      .select({ count: count() })
      .from(files)
      .where(and(
        eq(files.tenantId, tenantId),
        eq(files.isDuplicate, true)
      ))

    // Build response
    const filesByStatus: Record<string, number> = {}
    statusCounts.forEach((row: any) => {
      filesByStatus[row.status] = row.count
    })

    const filesBySource: Record<string, number> = {}
    sourceCounts.forEach((row: any) => {
      filesBySource[row.source] = row.count
    })

    return {
      totalFiles: totals[0]?.count || 0,
      totalSizeBytes: Number(totals[0]?.totalSize || 0),
      filesByStatus,
      filesBySource,
      duplicateCount: duplicates[0]?.count || 0,
    }
  }


  private mapToEntityProps(file: File): any {
    return {
      id: file.id,
      tenantId: file.tenantId,
      integrationId: file.integrationId,
      filename: file.filename,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      sha256Hash: file.sha256Hash,
      storageKey: file.storageKey,
      storageBucket: file.storageBucket,
      source: file.source,
      sourceId: file.sourceId,
      sourcePath: file.sourcePath,
      sourceModifiedAt: file.sourceModifiedAt,
      sourceMetadata: file.sourceMetadata || {},
      status: file.status,
      reviewStatus: file.reviewStatus,
      rejectionReason: file.rejectionReason,
      isDuplicate: file.isDuplicate,
      duplicateOf: file.duplicateOf,
      metadata: file.metadata || {},
      virusScanned: file.virusScanned,
      virusScanResult: file.virusScanResult,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      createdBy: file.createdBy,
      updatedBy: file.updatedBy,
      version: file.version,
    }
  }
}