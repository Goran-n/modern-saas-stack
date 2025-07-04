/**
 * Platform-wide database and entity types
 * Used across multiple domains and repositories
 */

export interface BaseEntityProps {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface TenantScopedEntityProps extends BaseEntityProps {
  tenantId: string
}

export interface SoftDeletableEntityProps extends BaseEntityProps {
  deletedAt: Date | null
}

export interface AuditableEntityProps extends BaseEntityProps {
  createdBy: string
  updatedBy: string
}

export interface TimestampedEntityProps {
  createdAt: Date
  updatedAt: Date
}

export interface DatabaseConnectionConfig {
  url: string
  maxConnections?: number
  connectionTimeout?: number
  idleTimeout?: number
  ssl?: boolean | {
    rejectUnauthorized?: boolean
    ca?: string
    cert?: string
    key?: string
  }
}

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  include?: string[]
  select?: string[]
}

export interface DatabaseQueryResult<T> {
  data: T[]
  total: number
  hasMore: boolean
}