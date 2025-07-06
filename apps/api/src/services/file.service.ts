import type { FileRepository } from '../core/ports/file.repository'
import type { FileEntity } from '../core/domain/file'
import type { FileStorage } from '../core/ports/storage/file-storage'

export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly fileStorage: FileStorage
  ) {}

  async findById(id: string): Promise<FileEntity | null> {
    return this.fileRepository.findById(id)
  }

  async findByTenantId(tenantId: string): Promise<FileEntity[]> {
    return this.fileRepository.findByTenantId(tenantId)
  }

  async save(file: FileEntity): Promise<FileEntity> {
    return this.fileRepository.save(file)
  }

  async delete(id: string): Promise<void> {
    return this.fileRepository.delete(id)
  }

  async performHealthcheck(): Promise<{ healthy: boolean; message: string; details?: any }> {
    let repositoryHealthy = true
    let repositoryMessage = 'Repository is operational'
    let fileCount = 0
    
    // Check database connectivity by trying to count files
    try {
      // Use a valid UUID format for healthcheck (this tenant doesn't need to exist)
      fileCount = await this.fileRepository.countByTenantId('00000000-0000-0000-0000-000000000000')
      repositoryHealthy = true
      repositoryMessage = 'Repository is operational'
    } catch (error) {
      repositoryHealthy = false
      repositoryMessage = `Repository error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('File Service healthcheck - Repository error details:', error)
    }
    
    // Check file storage connectivity
    let storageHealthy = true
    let storageMessage = 'File storage is operational'
    let storageDetails: any = {}
    
    if (this.fileStorage && typeof this.fileStorage.healthcheck === 'function') {
      try {
        const storageHealth = await this.fileStorage.healthcheck()
        storageHealthy = storageHealth.healthy
        storageMessage = storageHealth.message
        storageDetails = storageHealth.details || {}
      } catch (error) {
        storageHealthy = false
        storageMessage = `File storage error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
    
    const overallHealthy = repositoryHealthy && storageHealthy
    
    return {
      healthy: overallHealthy,
      message: overallHealthy ? 'File service is healthy' : 'File service has issues',
      details: {
        database: {
          healthy: repositoryHealthy,
          message: repositoryMessage,
          fileCount: fileCount >= 0 ? fileCount : 'inaccessible'
        },
        storage: {
          healthy: storageHealthy,
          message: storageMessage,
          details: storageDetails
        }
      }
    }
  }
}