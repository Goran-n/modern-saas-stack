/**
 * Shared type definitions for the frontend application
 * These types are used across multiple components and stores
 */

import type { 
  Tenant, 
  TenantMember, 
  User,
  Integration,
  IntegrationProvider,
  IntegrationType,
  IntegrationStatus,
  SyncJob,
  SyncJobStatus,
  Role,
  MemberPermissions,
  TestConnectionResponse,
  TriggerSyncResponse,
  OAuthUrlResponse,
  ApiResponse
} from '@kibly/shared-types'

// Re-export commonly used types from shared-types
export type {
  Tenant,
  TenantMember,
  User,
  Integration,
  IntegrationProvider,
  IntegrationType,
  IntegrationStatus,
  SyncJob,
  SyncJobStatus,
  Role,
  MemberPermissions,
  TestConnectionResponse,
  TriggerSyncResponse,
  OAuthUrlResponse,
  ApiResponse
}

/**
 * Tenant with membership information
 * Used when displaying workspaces for the current user
 */
export interface TenantWithMembership extends Tenant {
  membership: TenantMember
}

/**
 * OAuth state stored in localStorage
 */
export interface OAuthState {
  provider: string
  redirectUri: string
  timestamp: number
  code?: string
  state?: string
  integrationName?: string
  availableOrganisations?: any[]
}

/**
 * Organisation option from OAuth providers
 */
export interface OrganisationOption {
  id: string
  name: string
  isPrimary?: boolean
}

/**
 * Common loading state interface
 */
export interface LoadingState {
  loading: boolean
  error: string | null
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit: number
  offset: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

/**
 * Sort parameters
 */
export interface SortParams {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

/**
 * Common filter parameters
 */
export interface FilterParams extends PaginationParams, Partial<SortParams> {
  search?: string
}

/**
 * API Error response
 */
export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  errors?: Array<{
    field: string
    message: string
  }>
}

/**
 * Form field error
 */
export interface FieldError {
  field: string
  message: string
}

/**
 * Modal state
 */
export interface ModalState {
  isOpen: boolean
  data?: any
}

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Notification item
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  actions?: Array<{
    label: string
    handler: () => void
  }>
}