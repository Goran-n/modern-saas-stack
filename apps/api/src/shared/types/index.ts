/**
 * Shared types index
 * Re-exports all platform-wide types for easy importing
 */

export * from './api'
export * from './database'

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>

// Provider types used across integrations
export type IntegrationProvider = 'xero' | 'quickbooks' | 'sage' | 'freshbooks'
export type IntegrationType = 'accounting' | 'file_storage' | 'communication' | 'banking'
export type IntegrationStatus = 'active' | 'disabled' | 'error' | 'setup_pending'

// Sync operation types
export type SyncJobType = 'full' | 'incremental' | 'manual' | 'webhook'
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// Health status types
export type HealthStatus = 'healthy' | 'warning' | 'error' | 'unknown'

// Common ID patterns
export type UUID = string
export type TenantId = string
export type UserId = string
export type IntegrationId = string