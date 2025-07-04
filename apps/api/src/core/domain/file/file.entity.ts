import { z } from 'zod'

export const fileSourceSchema = z.enum(['dropbox', 'google_drive', 'onedrive', 'office365', 'whatsapp', 'manual'])
export type FileSource = z.infer<typeof fileSourceSchema>

export const fileStatusSchema = z.enum(['uploaded', 'processing', 'ready', 'failed', 'deleted'])
export type FileStatus = z.infer<typeof fileStatusSchema>

export const reviewStatusSchema = z.enum(['not_reviewed', 'ignored', 'reviewed', 'duplicate', 'processing'])
export type ReviewStatus = z.infer<typeof reviewStatusSchema>

export interface FileEntityProps {
  id: string
  tenantId: string
  integrationId: string | null
  
  // File information
  filename: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  sha256Hash: string
  
  // Storage
  storageKey: string
  storageBucket: string
  
  // Source tracking
  source: FileSource
  sourceId: string | null
  sourcePath: string | null
  sourceModifiedAt: Date | null
  sourceMetadata: Record<string, unknown>
  
  // Status
  status: FileStatus
  reviewStatus: ReviewStatus
  rejectionReason: string | null
  
  // Deduplication
  isDuplicate: boolean
  duplicateOf: string | null
  
  // Metadata
  metadata: Record<string, unknown>
  
  // Security
  virusScanned: boolean
  virusScanResult: Record<string, unknown> | null
  
  // Audit
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string | null
  version: number
}

export class FileEntity {
  private constructor(private props: FileEntityProps) {}

  static create(props: Omit<FileEntityProps, 'id' | 'status' | 'reviewStatus' | 'isDuplicate' | 'duplicateOf' | 'virusScanned' | 'virusScanResult' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>): FileEntity {
    const now = new Date()
    return new FileEntity({
      ...props,
      id: crypto.randomUUID(),
      status: 'uploaded',
      reviewStatus: 'not_reviewed',
      isDuplicate: false,
      duplicateOf: null,
      virusScanned: false,
      virusScanResult: null,
      createdAt: now,
      updatedAt: now,
      updatedBy: null,
      version: 1,
    })
  }

  static fromDatabase(props: FileEntityProps): FileEntity {
    return new FileEntity(props)
  }

  get id(): string { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get integrationId(): string | null { return this.props.integrationId }
  get filename(): string { return this.props.filename }
  get originalFilename(): string { return this.props.originalFilename }
  get mimeType(): string { return this.props.mimeType }
  get sizeBytes(): number { return this.props.sizeBytes }
  get sha256Hash(): string { return this.props.sha256Hash }
  get storageKey(): string { return this.props.storageKey }
  get storageBucket(): string { return this.props.storageBucket }
  get source(): FileSource { return this.props.source }
  get sourceId(): string | null { return this.props.sourceId }
  get sourcePath(): string | null { return this.props.sourcePath }
  get sourceModifiedAt(): Date | null { return this.props.sourceModifiedAt }
  get sourceMetadata(): Record<string, unknown> { return this.props.sourceMetadata }
  get status(): FileStatus { return this.props.status }
  get reviewStatus(): ReviewStatus { return this.props.reviewStatus }
  get rejectionReason(): string | null { return this.props.rejectionReason }
  get isDuplicate(): boolean { return this.props.isDuplicate }
  get duplicateOf(): string | null { return this.props.duplicateOf }
  get metadata(): Record<string, unknown> { return this.props.metadata }
  get virusScanned(): boolean { return this.props.virusScanned }
  get virusScanResult(): Record<string, unknown> | null { return this.props.virusScanResult }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get createdBy(): string { return this.props.createdBy }
  get updatedBy(): string | null { return this.props.updatedBy }
  get version(): number { return this.props.version }

  isReady(): boolean {
    return this.props.status === 'ready'
  }

  isProcessing(): boolean {
    return this.props.status === 'processing'
  }

  isFailed(): boolean {
    return this.props.status === 'failed'
  }

  needsReview(): boolean {
    return this.props.reviewStatus === 'not_reviewed'
  }

  isReviewed(): boolean {
    return this.props.reviewStatus === 'reviewed'
  }

  isPdf(): boolean {
    return this.props.mimeType === 'application/pdf'
  }

  isImage(): boolean {
    return this.props.mimeType.startsWith('image/')
  }

  getStorageUrl(): string {
    return `s3://${this.props.storageBucket}/${this.props.storageKey}`
  }

  markAsProcessing(updatedBy: string): void {
    this.props.status = 'processing'
    this.props.updatedBy = updatedBy
    this.touch()
  }

  markAsReady(updatedBy: string): void {
    this.props.status = 'ready'
    this.props.updatedBy = updatedBy
    this.touch()
  }

  markAsFailed(reason: string, updatedBy: string): void {
    this.props.status = 'failed'
    this.props.rejectionReason = reason
    this.props.updatedBy = updatedBy
    this.touch()
  }

  markAsDuplicate(duplicateOfId: string, updatedBy: string): void {
    this.props.isDuplicate = true
    this.props.duplicateOf = duplicateOfId
    this.props.reviewStatus = 'duplicate'
    this.props.updatedBy = updatedBy
    this.touch()
  }

  updateReviewStatus(status: ReviewStatus, reason: string | null, updatedBy: string): void {
    this.props.reviewStatus = status
    if (reason) {
      this.props.rejectionReason = reason
    }
    this.props.updatedBy = updatedBy
    this.touch()
  }

  updateVirusScanResult(scanned: boolean, result: Record<string, unknown> | null, updatedBy: string): void {
    this.props.virusScanned = scanned
    this.props.virusScanResult = result
    this.props.updatedBy = updatedBy
    this.touch()
  }


  updateMetadata(metadata: Record<string, unknown>, updatedBy: string): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
    this.props.updatedBy = updatedBy
    this.touch()
  }

  updateSourceModifiedAt(modifiedAt: Date, updatedBy: string): void {
    this.props.sourceModifiedAt = modifiedAt
    this.props.updatedBy = updatedBy
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
    this.props.version += 1
  }

  toDatabase(): FileEntityProps {
    return { ...this.props }
  }

  toPublic(): Omit<FileEntityProps, 'tenantId' | 'storageKey' | 'virusScanResult'> {
    const { tenantId, storageKey, virusScanResult, ...publicProps } = this.props
    return publicProps
  }
}