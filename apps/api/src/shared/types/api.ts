/**
 * Platform-wide API and response types
 * Used across multiple domains and services
 */

export interface PaginationParams {
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    timestamp: string
    requestId?: string
    version?: string
  }
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  dateFrom?: Date | string
  dateTo?: Date | string
  status?: string[]
  [key: string]: unknown
}

export interface BulkOperationResult {
  totalRequested: number
  successful: number
  failed: number
  errors: Array<{
    index: number
    error: string
    item?: unknown
  }>
}