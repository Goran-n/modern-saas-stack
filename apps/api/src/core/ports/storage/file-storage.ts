export interface FileMetadata {
  filename: string
  mimeType: string
  sizeBytes: number
  tenantId: string
  fileId: string
  source?: string
}

export interface FileStorageResult {
  storageKey: string
  storageBucket: string
  url: string
}

export interface PresignedUrlOptions {
  expiresIn?: number // seconds
  contentType?: string
  contentDisposition?: string
}

export interface FileStorage {
  /**
   * Store a file in the storage backend
   */
  store(
    tenantId: string,
    fileId: string,
    data: Buffer,
    metadata: FileMetadata
  ): Promise<FileStorageResult>

  /**
   * Retrieve a file from storage
   */
  retrieve(storageKey: string): Promise<Buffer>

  /**
   * Stream a file from storage
   */
  stream(storageKey: string): Promise<NodeJS.ReadableStream>

  /**
   * Delete a file from storage
   */
  delete(storageKey: string): Promise<void>

  /**
   * Generate a presigned URL for direct access
   */
  generatePresignedUrl(
    storageKey: string,
    options?: PresignedUrlOptions
  ): Promise<string>

  /**
   * Generate a presigned URL for upload
   */
  generateUploadUrl(
    tenantId: string,
    fileId: string,
    metadata: FileMetadata,
    options?: PresignedUrlOptions
  ): Promise<string>

  /**
   * Check if a file exists
   */
  exists(storageKey: string): Promise<boolean>

  /**
   * Get file metadata
   */
  getMetadata(storageKey: string): Promise<FileMetadata & { lastModified: Date }>

  /**
   * Copy a file to a new location
   */
  copy(sourceKey: string, destinationKey: string): Promise<void>

  /**
   * Perform a healthcheck on the storage backend
   */
  healthcheck(): Promise<{ healthy: boolean; message: string; details?: any }>
}