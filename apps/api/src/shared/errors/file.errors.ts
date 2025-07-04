import { ApplicationError } from './application.errors'

export class FileValidationError extends ApplicationError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super('FILE_VALIDATION_ERROR', 400, message, context)
  }
}

export class FileTypeNotAllowedError extends FileValidationError {
  constructor(
    mimeType: string,
    allowedTypes: string[] = ['application/pdf']
  ) {
    super(
      `File type '${mimeType}' is not allowed. Only ${allowedTypes.join(', ')} files are permitted.`,
      { mimeType, allowedTypes }
    )
  }
}

export class FileSizeExceededError extends FileValidationError {
  constructor(
    fileSize: number,
    maxSize: number
  ) {
    super(
      `File size (${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB) exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
      { fileSize, maxSize }
    )
  }
}

export class FileNotFoundError extends ApplicationError {
  constructor(
    fileId: string,
    context?: Record<string, unknown>
  ) {
    super('FILE_NOT_FOUND', 404, `File with ID '${fileId}' not found`, { fileId, ...context })
  }
}

export class FileStorageError extends ApplicationError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super('FILE_STORAGE_ERROR', 500, message, context)
  }
}

export class FileAccessDeniedError extends ApplicationError {
  constructor(
    fileId: string,
    tenantId: string
  ) {
    super(
      'FILE_ACCESS_DENIED', 
      403, 
      'You do not have permission to access this file', 
      { fileId, tenantId }
    )
  }
}