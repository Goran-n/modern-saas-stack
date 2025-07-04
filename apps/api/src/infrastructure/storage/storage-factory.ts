import type { FileStorage } from '../../core/ports/storage/file-storage'
import { S3FileStorage, type S3Config } from './s3-file-storage'

export type StorageProvider = 's3' | 'azure' | 'gcs'

export interface StorageConfig {
  provider: StorageProvider
  s3?: S3Config | null
  // Future: azure?: AzureConfig
  // Future: gcs?: GCSConfig
}

export class StorageFactory {
  static create(config: StorageConfig): FileStorage {
    switch (config.provider) {
      case 's3':
        if (!config.s3) {
          // Use default S3 config if not provided (will use IAM roles)
          const defaultConfig = {
            region: 'us-east-1',
            bucket: 'kibly-files'
          }
          return new S3FileStorage(defaultConfig)
        }
        return new S3FileStorage(config.s3)
      
      case 'azure':
        throw new Error('Azure storage provider not implemented yet')
      
      case 'gcs':
        throw new Error('Google Cloud Storage provider not implemented yet')
      
      default:
        throw new Error(`Unknown storage provider: ${config.provider}`)
    }
  }
}