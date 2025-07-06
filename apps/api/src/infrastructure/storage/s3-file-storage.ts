import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'
import path from 'path'
import type { FileStorage, FileMetadata, FileStorageResult, PresignedUrlOptions } from '../../core/ports/storage/file-storage'
import log from '../../config/logger'
import { FileStorageError } from '../../shared/errors/file.errors'

export interface S3Config {
  region: string
  bucket: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string // For S3-compatible services like MinIO
}

export class S3FileStorage implements FileStorage {
  private readonly s3Client: S3Client
  private readonly bucket: string

  constructor(config: S3Config) {
    this.bucket = config.bucket
    
    const clientConfig: any = {
      region: config.region,
    }
    
    // Support for S3-compatible services
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint
      clientConfig.forcePathStyle = true
    }
    
    // Explicit credentials if provided
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    }
    
    this.s3Client = new S3Client(clientConfig)
  }

  async store(
    tenantId: string,
    fileId: string,
    data: Buffer,
    metadata: FileMetadata
  ): Promise<FileStorageResult> {
    const storageKey = this.generateStorageKey(tenantId, fileId, metadata.filename)
    
    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: data,
        ContentType: metadata.mimeType,
        Metadata: {
          tenantId,
          fileId,
          originalFilename: metadata.filename,
          source: metadata.source || 'manual',
        },
        ServerSideEncryption: 'AES256',
      }))
      
      log.info('File stored in S3', { storageKey, tenantId, fileId })
      
      return {
        storageKey,
        storageBucket: this.bucket,
        url: `s3://${this.bucket}/${storageKey}`,
      }
    } catch (error) {
      log.error('Failed to store file in S3', { error, storageKey, tenantId, fileId })
      throw new FileStorageError(`Failed to store file: ${error instanceof Error ? error.message : 'Unknown error'}`, { storageKey, tenantId, fileId })
    }
  }

  async retrieve(storageKey: string): Promise<Buffer> {
    try {
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }))
      
      if (!response.Body) {
        throw new FileStorageError('No body returned from S3', { storageKey })
      }
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk)
      }
      
      return Buffer.concat(chunks)
    } catch (error) {
      log.error('Failed to retrieve file from S3', { error, storageKey })
      throw new FileStorageError(`Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`, { storageKey })
    }
  }

  async stream(storageKey: string): Promise<NodeJS.ReadableStream> {
    try {
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }))
      
      if (!response.Body) {
        throw new FileStorageError('No body returned from S3', { storageKey })
      }
      
      return response.Body as NodeJS.ReadableStream
    } catch (error) {
      log.error('Failed to stream file from S3', { error, storageKey })
      throw new FileStorageError(`Failed to stream file: ${error instanceof Error ? error.message : 'Unknown error'}`, { storageKey })
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }))
      
      log.info('File deleted from S3', { storageKey })
    } catch (error) {
      log.error('Failed to delete file from S3', { error, storageKey })
      throw new FileStorageError(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`, { storageKey })
    }
  }

  async generatePresignedUrl(
    storageKey: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ResponseContentType: options?.contentType,
        ResponseContentDisposition: options?.contentDisposition,
      })
      
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 3600, // Default 1 hour
      })
      
      return url
    } catch (error) {
      log.error('Failed to generate presigned URL', { error, storageKey })
      throw new FileStorageError(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`, { storageKey })
    }
  }

  async generateUploadUrl(
    tenantId: string,
    fileId: string,
    metadata: FileMetadata,
    options?: PresignedUrlOptions
  ): Promise<string> {
    const storageKey = this.generateStorageKey(tenantId, fileId, metadata.filename)
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: options?.contentType || metadata.mimeType,
        Metadata: {
          tenantId,
          fileId,
          originalFilename: metadata.filename,
          source: metadata.source || 'manual',
        },
        ServerSideEncryption: 'AES256',
      })
      
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 3600, // Default 1 hour
      })
      
      return url
    } catch (error) {
      log.error('Failed to generate upload URL', { error, storageKey })
      throw new FileStorageError(`Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`, { storageKey })
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }))
      
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      
      log.error('Failed to check file existence', { error, storageKey })
      throw new Error(`Failed to check file existence: ${error.message}`)
    }
  }

  async getMetadata(storageKey: string): Promise<FileMetadata & { lastModified: Date }> {
    try {
      const response = await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }))
      
      const metadata: FileMetadata & { lastModified: Date } = {
        filename: response.Metadata?.originalFilename || path.basename(storageKey),
        mimeType: response.ContentType || 'application/octet-stream',
        sizeBytes: response.ContentLength || 0,
        tenantId: response.Metadata?.tenantId || '',
        fileId: response.Metadata?.fileId || '',
        lastModified: response.LastModified || new Date(),
      }
      
      if (response.Metadata?.source) {
        metadata.source = response.Metadata.source
      }
      
      return metadata
    } catch (error) {
      log.error('Failed to get file metadata', { error, storageKey })
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.s3Client.send(new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        ServerSideEncryption: 'AES256',
      }))
      
      log.info('File copied in S3', { sourceKey, destinationKey })
    } catch (error) {
      log.error('Failed to copy file in S3', { error, sourceKey, destinationKey })
      throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async healthcheck(): Promise<{ healthy: boolean; message: string; details?: any }> {
    const healthcheckKey = '.healthcheck/test.txt'
    const testData = Buffer.from(`Kibly S3 healthcheck - ${new Date().toISOString()}`)
    
    try {
      // 1. Test write permissions
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: healthcheckKey,
        Body: testData,
        ContentType: 'text/plain',
        ServerSideEncryption: 'AES256',
      }))
      
      // 2. Test read permissions
      const readResponse = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: healthcheckKey,
      }))
      
      if (!readResponse.Body) {
        throw new Error('No body returned from S3 read')
      }
      
      // 3. Test delete permissions
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: healthcheckKey,
      }))
      
      return {
        healthy: true,
        message: 'S3 storage is healthy',
        details: {
          bucket: this.bucket,
          region: this.s3Client.config.region,
          endpoint: this.s3Client.config.endpoint,
          operations: ['write', 'read', 'delete'],
        }
      }
    } catch (error: any) {
      log.error('S3 healthcheck failed', { error, bucket: this.bucket })
      
      return {
        healthy: false,
        message: `S3 storage healthcheck failed: ${error.message || 'Unknown error'}`,
        details: {
          bucket: this.bucket,
          error: error.name,
          code: error.Code || error.$metadata?.httpStatusCode,
          region: this.s3Client.config.region,
          endpoint: this.s3Client.config.endpoint,
        }
      }
    }
  }

  private generateStorageKey(tenantId: string, fileId: string, filename: string): string {
    const ext = path.extname(filename)
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    
    // Structure: tenant-id/year/month/file-id.extension
    return `${tenantId}/${year}/${month}/${fileId}${ext}`
  }
}