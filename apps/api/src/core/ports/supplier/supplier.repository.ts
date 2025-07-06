import { SupplierEntity, SupplierType, ContactStatus } from '../../domain/supplier/supplier.entity'
import { EntityId } from '../../domain/shared/value-objects/entity-id'

export interface SupplierFilters {
  supplierType?: SupplierType[]
  isActive?: boolean
  contactStatus?: ContactStatus[]
  hasValidBankAccount?: boolean
  searchText?: string // For searching by name/normalized name
  tags?: string[] // Must have ALL specified tags
}

export interface SupplierSortOptions {
  field: 'name' | 'createdAt' | 'updatedAt' | 'dataQualityScore'
  direction: 'asc' | 'desc'
}

export interface SupplierRepository {
  /**
   * Save a supplier (create or update)
   */
  save(supplier: SupplierEntity): Promise<SupplierEntity>
  
  /**
   * Find a supplier by ID
   */
  findById(id: EntityId): Promise<SupplierEntity | null>
  
  /**
   * Find suppliers by tenant with filters
   */
  findByTenant(
    tenantId: string,
    filters?: SupplierFilters,
    sort?: SupplierSortOptions,
    limit?: number,
    offset?: number
  ): Promise<SupplierEntity[]>
  
  /**
   * Count suppliers by tenant with filters
   */
  countByTenant(
    tenantId: string,
    filters?: SupplierFilters
  ): Promise<number>
  
  /**
   * Find supplier by external ID
   */
  findByExternalId(
    tenantId: string,
    system: string,
    externalId: string
  ): Promise<SupplierEntity | null>
  
  /**
   * Find suppliers by tax number
   */
  findByTaxNumber(
    tenantId: string,
    taxNumber: string
  ): Promise<SupplierEntity[]>
  
  /**
   * Find suppliers by email
   */
  findByEmail(
    tenantId: string,
    email: string
  ): Promise<SupplierEntity[]>
  
  /**
   * Search suppliers by name (uses normalized name and name tokens)
   */
  searchByName(
    tenantId: string,
    searchTerm: string,
    limit?: number
  ): Promise<SupplierEntity[]>
  
  /**
   * Find suppliers with low data quality scores
   */
  findLowQualitySuppliers(
    tenantId: string,
    threshold: number,
    limit?: number
  ): Promise<SupplierEntity[]>
  
  /**
   * Check if a supplier exists
   */
  exists(id: string): Promise<boolean>
  
  /**
   * Check if a supplier with external ID exists
   */
  existsByExternalId(
    tenantId: string,
    system: string,
    externalId: string
  ): Promise<boolean>
  
  /**
   * Delete a supplier (soft delete by marking as deleted)
   */
  delete(id: string): Promise<void>
  
  /**
   * Find suppliers by IDs
   */
  findByIds(ids: string[]): Promise<SupplierEntity[]>
  
  /**
   * Find suppliers needing verification
   */
  findUnverified(
    tenantId: string,
    limit?: number
  ): Promise<SupplierEntity[]>
  
  /**
   * Update sync info for multiple suppliers
   */
  updateSyncInfo(
    supplierIds: string[],
    syncedAt: Date
  ): Promise<void>
  
  /**
   * Find suppliers by tag
   */
  findByTag(
    tenantId: string,
    tag: string,
    limit?: number
  ): Promise<SupplierEntity[]>
  
  /**
   * Get distinct tags used by suppliers in a tenant
   */
  getDistinctTags(tenantId: string): Promise<string[]>
}