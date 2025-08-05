import { faker } from '@faker-js/faker';
import { ProcessingStatus } from '@figgy/file-manager/src/types';

export interface FileData {
  id?: string;
  tenantId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileSize?: number;
  bucket: string;
  pathTokens: string[];
  processingStatus: ProcessingStatus;
  contentHash?: string;
  publicUrl?: string;
  metadata?: Record<string, any>;
  source: 'user_upload' | 'email_attachment' | 'api' | 'integration';
  createdAt?: Date;
  updatedAt?: Date;
}

export class FileBuilder {
  private data: FileData;

  constructor() {
    const fileName = faker.system.fileName();
    this.data = {
      id: faker.string.uuid(),
      tenantId: faker.string.uuid(),
      uploadedBy: faker.string.uuid(),
      fileName,
      mimeType: this.getMimeType(fileName),
      size: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
      bucket: 'invoices',
      pathTokens: [
        faker.date.recent().getFullYear().toString(),
        (faker.date.recent().getMonth() + 1).toString().padStart(2, '0'),
        fileName,
      ],
      processingStatus: 'pending',
      contentHash: faker.string.alphanumeric(64),
      source: 'user_upload',
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
    };
  }

  static create(): FileBuilder {
    return new FileBuilder();
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withTenant(tenantId: string, userId: string): this {
    this.data.tenantId = tenantId;
    this.data.uploadedBy = userId;
    return this;
  }

  withFileName(fileName: string): this {
    this.data.fileName = fileName;
    this.data.mimeType = this.getMimeType(fileName);
    // Update path tokens with new filename
    this.data.pathTokens[this.data.pathTokens.length - 1] = fileName;
    return this;
  }

  withMimeType(mimeType: string): this {
    this.data.mimeType = mimeType;
    return this;
  }

  withSize(bytes: number): this {
    this.data.size = bytes;
    this.data.fileSize = bytes;
    return this;
  }

  withPath(bucket: string, pathTokens: string[]): this {
    this.data.bucket = bucket;
    this.data.pathTokens = pathTokens;
    return this;
  }

  withStatus(status: ProcessingStatus): this {
    this.data.processingStatus = status;
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.data.metadata = { ...this.data.metadata, ...metadata };
    return this;
  }

  withContentHash(hash: string): this {
    this.data.contentHash = hash;
    return this;
  }

  withSource(source: FileData['source']): this {
    this.data.source = source;
    return this;
  }

  withPublicUrl(url: string): this {
    this.data.publicUrl = url;
    return this;
  }

  asPending(): this {
    this.data.processingStatus = 'pending';
    return this;
  }

  asProcessing(): this {
    this.data.processingStatus = 'processing';
    return this;
  }

  asCompleted(): this {
    this.data.processingStatus = 'completed';
    this.data.metadata = {
      ...this.data.metadata,
      processedAt: new Date().toISOString(),
      processingTime: faker.number.int({ min: 500, max: 3000 }),
    };
    return this;
  }

  asFailed(error: string = 'Processing failed', retryCount: number = 1): this {
    this.data.processingStatus = 'failed';
    this.data.metadata = {
      ...this.data.metadata,
      error,
      retryCount,
      lastFailedAt: new Date().toISOString(),
    };
    return this;
  }

  asDeadLetter(error: string = 'Max retries exceeded'): this {
    this.data.processingStatus = 'dead_letter';
    this.data.metadata = {
      ...this.data.metadata,
      error,
      retryCount: 3,
      finalFailureAt: new Date().toISOString(),
    };
    return this;
  }

  build(): FileData {
    return JSON.parse(JSON.stringify(this.data)); // Deep clone
  }

  buildWithoutId(): Omit<FileData, 'id'> {
    const { id, ...dataWithoutId } = this.data;
    return JSON.parse(JSON.stringify(dataWithoutId));
  }

  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeMap[extension || ''] || 'application/octet-stream';
  }
}

// Preset builders for common test scenarios
export const FilePresets = {
  invoice: () => FileBuilder.create()
    .withFileName('invoice-2024-001.pdf')
    .withMimeType('application/pdf')
    .withSize(150 * 1024), // 150KB

  largeFile: () => FileBuilder.create()
    .withFileName('large-document.pdf')
    .withSize(10 * 1024 * 1024), // 10MB

  emptyFile: () => FileBuilder.create()
    .withFileName('empty.pdf')
    .withSize(0),

  processingFile: () => FileBuilder.create()
    .withFileName('processing.pdf')
    .asProcessing(),

  failedFile: () => FileBuilder.create()
    .withFileName('failed.pdf')
    .asFailed('Extraction failed', 2),

  completedInvoice: () => FileBuilder.create()
    .withFileName('completed-invoice.pdf')
    .asCompleted()
    .withMetadata({
      category: 'invoice',
      extractedData: {
        supplier: { name: 'Test Supplier' },
        totals: { amount: 100.00 },
      },
    }),
};