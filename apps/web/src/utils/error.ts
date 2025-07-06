import type { TRPCClientError } from '@trpc/client'

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  details?: Record<string, any>
}

export function parseApiError(error: unknown): ApiError {
  if (!error) {
    return { message: 'An unknown error occurred' }
  }
  
  // Handle TRPC errors
  if (isTRPCError(error)) {
    return {
      message: error.message,
      code: error.data?.code,
      statusCode: error.data?.httpStatus,
      details: error.data
    }
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    return { message: error.message }
  }
  
  // Handle error-like objects
  if (typeof error === 'object' && 'message' in error) {
    return {
      message: String(error.message),
      code: 'code' in error ? String(error.code) : undefined,
      statusCode: 'statusCode' in error ? Number(error.statusCode) : undefined
    }
  }
  
  // Fallback
  return { message: String(error) }
}

export function isTRPCError(error: unknown): error is TRPCClientError<any> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'data' in error &&
    'shape' in error
  )
}

export function getErrorMessage(error: unknown): string {
  const parsed = parseApiError(error)
  return parsed.message
}

export function isNetworkError(error: unknown): boolean {
  const parsed = parseApiError(error)
  return parsed.code === 'NETWORK_ERROR' || parsed.message.includes('Network')
}

export function isAuthError(error: unknown): boolean {
  const parsed = parseApiError(error)
  return parsed.statusCode === 401 || parsed.code === 'UNAUTHORIZED'
}

export function isValidationError(error: unknown): boolean {
  const parsed = parseApiError(error)
  return parsed.statusCode === 400 || parsed.code === 'BAD_REQUEST'
}

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApplicationError'
  }
}