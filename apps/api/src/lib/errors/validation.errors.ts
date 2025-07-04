import { BaseError } from './base.error'

export interface ValidationErrorDetail {
  field: string
  message: string
  value?: unknown
  constraint?: string
}

export class ValidationError extends BaseError {
  public readonly errors: ValidationErrorDetail[]

  constructor(errors: ValidationErrorDetail[]) {
    const message = errors.length === 1 
      ? `Validation failed: ${errors[0].message}`
      : `Validation failed: ${errors.length} errors`
    
    super(message, 'VALIDATION_ERROR', 400, true, { errors })
    this.errors = errors
  }

  static fromFieldError(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError([{ field, message, value }])
  }
}

export class InvalidInputError extends BaseError {
  constructor(
    field: string,
    expectedType: string,
    actualValue?: unknown
  ) {
    super(
      `Invalid input for field '${field}': expected ${expectedType}`,
      'INVALID_INPUT',
      400,
      true,
      { field, expectedType, actualValue }
    )
  }
}

export class RequiredFieldError extends BaseError {
  constructor(field: string) {
    super(
      `Required field '${field}' is missing`,
      'REQUIRED_FIELD_MISSING',
      400,
      true,
      { field }
    )
  }
}

export class InvalidFormatError extends BaseError {
  constructor(
    field: string,
    format: string,
    value?: string
  ) {
    super(
      `Invalid format for field '${field}': expected ${format}`,
      'INVALID_FORMAT',
      400,
      true,
      { field, format, value }
    )
  }
}