import crypto from 'crypto'
import type { FileRepository } from '../core/ports/file.repository'
import type { FileStorage } from '../core/ports/storage/file-storage'
import { FileEntity, type FileSource } from '../core/domain/file'
import type { Logger } from 'pino'
import { FileTypeNotAllowedError, FileSizeExceededError, FileNotFoundError, FileAccessDeniedError } from '../shared/errors/file.errors'

export interface FileUploadDto {
  tenantId: string
  userId: string
  filename: string
  mimeType: string
  data: Buffer
  source?: FileSource
  integrationId?: string | null
}

export interface FileSearchDto {
  tenantId: string
  status?: string[]
  reviewStatus?: string[]
  source?: string[]
  mimeType?: string[]
  limit?: number
  offset?: number
}

export interface FilePresignedUrlDto {
  fileId: string
  tenantId: string
  userId: string
  expiresIn?: number
}

export class FileService {
  constructor(
    private fileRepository: FileRepository,
    private fileStorage: FileStorage,
    private logger: Logger
  ) {}

  async uploadFile(dto: FileUploadDto): Promise<FileEntity> {
    try {
      // Validate file type - only PDFs allowed
      if (dto.mimeType !== 'application/pdf') {
        throw new FileTypeNotAllowedError(dto.mimeType)
      }
      
      // Validate file size (10MB limit)
      const maxSizeBytes = 10 * 1024 * 1024 // 10MB
      if (dto.data.length > maxSizeBytes) {
        throw new FileSizeExceededError(dto.data.length, maxSizeBytes)
      }
      
      // Calculate file hash
      const sha256Hash = this.calculateHash(dto.data)
      
      // Check for duplicates
      const existingFile = await this.fileRepository.findByHash(dto.tenantId, sha256Hash)
      
      // Create file entity
      const file = FileEntity.create({
        tenantId: dto.tenantId,
        integrationId: dto.integrationId || null,
        filename: this.sanitizeFilename(dto.filename),
        originalFilename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.data.length,
        sha256Hash,
        storageKey: '', // Will be set after upload
        storageBucket: '', // Will be set after upload
        source: dto.source || 'manual',
        sourceId: null,
        sourcePath: null,
        sourceModifiedAt: null,
        sourceMetadata: {},
        metadata: {},
        rejectionReason: null,
        createdBy: dto.userId,
      })
      
      // If duplicate found, mark it
      if (existingFile) {
        file.markAsDuplicate(existingFile.id, dto.userId)
        this.logger.info('Duplicate file detected', {
          fileId: file.id,
          duplicateOf: existingFile.id,
          tenantId: dto.tenantId,
        })
      }
      
      // Store file in S3
      const storageResult = await this.fileStorage.store(
        dto.tenantId,
        file.id,
        dto.data,
        {
          filename: dto.filename,
          mimeType: dto.mimeType,
          sizeBytes: dto.data.length,
          tenantId: dto.tenantId,
          fileId: file.id,
          source: dto.source || 'manual',
        }
      )
      
      // Update file with storage info
      const updatedFile = FileEntity.fromDatabase({
        ...file.toDatabase(),
        storageKey: storageResult.storageKey,
        storageBucket: storageResult.storageBucket,
      })
      
      // Save to database
      const savedFile = await this.fileRepository.save(updatedFile)
      
      this.logger.info('File uploaded successfully', {
        fileId: savedFile.id,
        tenantId: dto.tenantId,
        filename: dto.filename,
        sizeBytes: dto.data.length,
      })
      
      return savedFile
    } catch (error) {
      this.logger.error('Failed to upload file', {
        error,
        tenantId: dto.tenantId,
        filename: dto.filename,
      })
      throw error
    }
  }

  async getFile(fileId: string, tenantId: string): Promise<FileEntity | null> {
    const file = await this.fileRepository.findById(fileId)
    
    // Verify tenant access
    if (file && file.tenantId !== tenantId) {
      this.logger.warn('Unauthorized file access attempt', {
        fileId,
        tenantId,
        fileTenantId: file.tenantId,
      })
      throw new FileAccessDeniedError(fileId, tenantId)
    }
    
    return file
  }

  async downloadFile(fileId: string, tenantId: string): Promise<{ data: Buffer; metadata: FileEntity } | null> {
    const file = await this.getFile(fileId, tenantId)
    if (!file) return null
    
    try {
      const data = await this.fileStorage.retrieve(file.storageKey)
      
      return {
        data,
        metadata: file,
      }
    } catch (error) {
      this.logger.error('Failed to download file', {
        error,
        fileId,
        storageKey: file.storageKey,
      })
      throw error
    }
  }

  async generatePresignedUrl(dto: FilePresignedUrlDto): Promise<string | null> {
    const file = await this.getFile(dto.fileId, dto.tenantId)
    if (!file) return null
    
    try {
      const url = await this.fileStorage.generatePresignedUrl(
        file.storageKey,
        {
          expiresIn: dto.expiresIn || 3600, // Default 1 hour
          contentType: file.mimeType,
          contentDisposition: `attachment; filename="${file.originalFilename}"`,
        }
      )
      
      this.logger.info('Generated presigned URL', {
        fileId: dto.fileId,
        tenantId: dto.tenantId,
        expiresIn: dto.expiresIn || 3600,
      })
      
      return url
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', {
        error,
        fileId: dto.fileId,
      })
      throw error
    }
  }

  async searchFiles(dto: FileSearchDto): Promise<{ files: FileEntity[]; total: number }> {
    const filters: any = {}
    if (dto.status) filters.status = dto.status
    if (dto.reviewStatus) filters.reviewStatus = dto.reviewStatus
    if (dto.source) filters.source = dto.source
    if (dto.mimeType) filters.mimeType = dto.mimeType
    
    const [files, total] = await Promise.all([
      this.fileRepository.findByTenantId(
        dto.tenantId,
        filters,
        dto.limit || 100,
        dto.offset || 0
      ),
      this.fileRepository.countByTenantId(dto.tenantId, filters),
    ])
    
    return { files, total }
  }

  async getFileSummary(tenantId: string) {
    return this.fileRepository.getFileSummary(tenantId)
  }

  async markFileAsReviewed(fileId: string, tenantId: string, userId: string): Promise<void> {
    const file = await this.getFile(fileId, tenantId)
    if (!file) {
      throw new FileNotFoundError(fileId)
    }
    
    file.updateReviewStatus('reviewed', null, userId)
    await this.fileRepository.save(file)
    
    this.logger.info('File marked as reviewed', {
      fileId,
      tenantId,
      userId,
    })
  }

  async deleteFile(fileId: string, tenantId: string, userId: string): Promise<void> {
    const file = await this.getFile(fileId, tenantId)
    if (!file) {
      throw new FileNotFoundError(fileId)
    }
    
    try {
      // Delete from storage
      await this.fileStorage.delete(file.storageKey)
      
      // Delete from database
      await this.fileRepository.delete(fileId)
      
      this.logger.info('File deleted successfully', {
        fileId,
        tenantId,
        userId,
        storageKey: file.storageKey,
      })
    } catch (error) {
      this.logger.error('Failed to delete file', {
        error,
        fileId,
        tenantId,
      })
      throw error
    }
  }

  private calculateHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace problematic characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase()
  }

  async performHealthcheck(): Promise<{ healthy: boolean; message: string; details: any }> {
    try {
      // 1. Check storage backend
      const storageHealth = await this.fileStorage.healthcheck()
      
      // 2. Check database connectivity
      let dbHealthy = false
      let dbMessage = 'Database check not performed'
      
      try {
        // Simple database query to check connectivity
        await this.fileRepository.countByTenantId('healthcheck-tenant')
        dbHealthy = true
        dbMessage = 'Database is healthy'
      } catch (error) {
        dbHealthy = false
        dbMessage = `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
      
      const healthy = storageHealth.healthy && dbHealthy
      
      return {
        healthy,
        message: healthy ? 'File service is healthy' : 'File service has issues',
        details: {
          storage: storageHealth,
          database: {
            healthy: dbHealthy,
            message: dbMessage,
          },
          timestamp: new Date().toISOString(),
        }
      }
    } catch (error) {
      this.logger.error('File service healthcheck failed', { error })
      
      return {
        healthy: false,
        message: `File service healthcheck failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    }
  }
}