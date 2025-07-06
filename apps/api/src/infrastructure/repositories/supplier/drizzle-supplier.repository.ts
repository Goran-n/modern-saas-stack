import { SupplierEntity } from '../../../core/domain/supplier/supplier.entity'
import { 
  SupplierRepository, 
  SupplierFilters, 
  SupplierSortOptions 
} from '../../../core/ports/supplier/supplier.repository'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'
import { QueryExecutor, FindByIdQuery, FindManyQuery, InsertQuery, UpdateQuery, ExistsQuery, CountQuery } from '../../persistence/query-executor'
import { SupplierMapper } from '../../mappers/supplier.mapper'
import type { SupplierDatabaseRow } from '../../persistence/types/supplier.types'

export class DrizzleSupplierRepository implements SupplierRepository {
  constructor(private readonly queryExecutor: QueryExecutor) {}

  async save(supplier: SupplierEntity): Promise<SupplierEntity> {
    const row = SupplierMapper.toDatabase(supplier)
    
    // Check if exists
    const exists = await this.exists(supplier.id.toString())
    
    if (exists) {
      // Update
      const query = new UpdateQuery('suppliers', { id: supplier.id.toString() }, row)
      const updated = await this.queryExecutor.executeUpdate<SupplierDatabaseRow>(query)
      if (!updated) {
        throw new Error(`Failed to update supplier ${supplier.id.toString()}`)
      }
      return SupplierMapper.toDomain(updated)
    } else {
      // Insert
      const query = new InsertQuery('suppliers', row)
      const inserted = await this.queryExecutor.executeInsert<SupplierDatabaseRow>(query)
      return SupplierMapper.toDomain(inserted)
    }
  }

  async findById(id: EntityId): Promise<SupplierEntity | null> {
    const query = new FindByIdQuery('suppliers', id.toString())
    const result = await this.queryExecutor.execute<SupplierDatabaseRow>(query)
    return result ? SupplierMapper.toDomain(result) : null
  }

  async findByTenant(
    tenantId: string,
    filters?: SupplierFilters,
    sort?: SupplierSortOptions,
    limit?: number,
    offset?: number
  ): Promise<SupplierEntity[]> {
    const conditions: Record<string, any> = { tenant_id: tenantId }
    
    // Apply filters
    if (filters) {
      if (filters.supplierType && filters.supplierType.length > 0) {
        // For now, handle single type - full implementation would need IN clause
        conditions.supplier_type = filters.supplierType[0]
      }
      
      if (filters.isActive !== undefined) {
        conditions.is_active = filters.isActive
      }
      
      if (filters.contactStatus && filters.contactStatus.length > 0) {
        conditions.contact_status = filters.contactStatus[0]
      }
      
      // Other filters would require more complex query building
    }
    
    const options: any = {}
    if (sort) {
      options.orderBy = {
        field: this.mapSortField(sort.field),
        direction: sort.direction
      }
    }
    if (limit !== undefined) options.limit = limit
    if (offset !== undefined) options.offset = offset
    
    const query = new FindManyQuery('suppliers', conditions, options)
    const results = await this.queryExecutor.executeMany<SupplierDatabaseRow>(query)
    
    return results.map(row => SupplierMapper.toDomain(row))
  }

  async countByTenant(tenantId: string, filters?: SupplierFilters): Promise<number> {
    const conditions: Record<string, any> = { tenant_id: tenantId }
    
    // Apply same filters as findByTenant
    if (filters) {
      if (filters.supplierType && filters.supplierType.length > 0) {
        conditions.supplier_type = filters.supplierType[0]
      }
      
      if (filters.isActive !== undefined) {
        conditions.is_active = filters.isActive
      }
      
      if (filters.contactStatus && filters.contactStatus.length > 0) {
        conditions.contact_status = filters.contactStatus[0]
      }
    }
    
    const query = new CountQuery('suppliers', conditions)
    return this.queryExecutor.executeCount(query)
  }

  async findByExternalId(
    tenantId: string,
    system: string,
    externalId: string
  ): Promise<SupplierEntity | null> {
    // This would require JSON querying support
    // For now, we'll fetch all and filter in memory
    const suppliers = await this.findByTenant(tenantId)
    
    for (const supplier of suppliers) {
      const externalIds = supplier.toDatabase().externalIds
      const match = externalIds.find((ext: any) => ext.system === system && ext.id === externalId)
      if (match) {
        return supplier
      }
    }
    
    return null
  }

  async findByTaxNumber(
    tenantId: string,
    taxNumber: string
  ): Promise<SupplierEntity[]> {
    const query = new FindManyQuery('suppliers', {
      tenant_id: tenantId,
      tax_number: taxNumber
    })
    const results = await this.queryExecutor.executeMany<SupplierDatabaseRow>(query)
    return results.map(row => SupplierMapper.toDomain(row))
  }

  async findByEmail(
    tenantId: string,
    email: string
  ): Promise<SupplierEntity[]> {
    const query = new FindManyQuery('suppliers', {
      tenant_id: tenantId,
      primary_email: email
    })
    const results = await this.queryExecutor.executeMany<SupplierDatabaseRow>(query)
    
    // Also check additional emails
    const allSuppliers = await this.findByTenant(tenantId)
    const additionalMatches = allSuppliers.filter(supplier => {
      const props = supplier.toDatabase()
      return props.additionalEmails.includes(email)
    })
    
    // Combine and deduplicate
    const combined = [...results.map(row => SupplierMapper.toDomain(row)), ...additionalMatches]
    const uniqueIds = new Set<string>()
    return combined.filter(supplier => {
      if (uniqueIds.has(supplier.id.toString())) {
        return false
      }
      uniqueIds.add(supplier.id.toString())
      return true
    })
  }

  async searchByName(
    tenantId: string,
    searchTerm: string,
    limit?: number
  ): Promise<SupplierEntity[]> {
    // Normalize search term
    const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '')
    const searchTokens = searchTerm.toLowerCase().split(/\s+/).filter(token => token.length > 0)
    
    // Fetch all suppliers for the tenant
    const allSuppliers = await this.findByTenant(tenantId)
    
    // Score and filter
    const scoredSuppliers = allSuppliers
      .map(supplier => {
        const props = supplier.toDatabase()
        let score = 0
        
        // Exact normalized name match
        if (props.normalizedName === normalizedSearch) {
          score += 100
        }
        
        // Partial normalized name match
        if (props.normalizedName && props.normalizedName.includes(normalizedSearch)) {
          score += 50
        }
        
        // Token matching
        const nameTokens = props.nameTokens || []
        for (const searchToken of searchTokens) {
          if (nameTokens.some((token: string) => token.includes(searchToken))) {
            score += 20
          }
        }
        
        // Name contains search term
        if (props.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          score += 30
        }
        
        return { supplier, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.supplier)
    
    return limit ? scoredSuppliers.slice(0, limit) : scoredSuppliers
  }

  async findLowQualitySuppliers(
    tenantId: string,
    threshold: number,
    limit?: number
  ): Promise<SupplierEntity[]> {
    // Would need less than comparison in query
    // For now, fetch all and filter
    const allSuppliers = await this.findByTenant(tenantId)
    const lowQuality = allSuppliers
      .filter(supplier => {
        const score = supplier.toDatabase().dataQualityScore
        return score !== null && score < threshold
      })
      .sort((a, b) => {
        const scoreA = a.toDatabase().dataQualityScore || 0
        const scoreB = b.toDatabase().dataQualityScore || 0
        return scoreA - scoreB
      })
    
    return limit ? lowQuality.slice(0, limit) : lowQuality
  }

  async exists(id: string): Promise<boolean> {
    const query = new ExistsQuery('suppliers', { id })
    return this.queryExecutor.executeExists(query)
  }

  async existsByExternalId(
    tenantId: string,
    system: string,
    externalId: string
  ): Promise<boolean> {
    const supplier = await this.findByExternalId(tenantId, system, externalId)
    return supplier !== null
  }

  async delete(id: string): Promise<void> {
    // Soft delete by updating contact status
    const query = new UpdateQuery(
      'suppliers',
      { id },
      { contact_status: 'ARCHIVED', is_active: false, updated_at: new Date() }
    )
    await this.queryExecutor.executeUpdate(query)
  }

  async findByIds(ids: string[]): Promise<SupplierEntity[]> {
    // Would need IN clause support
    // For now, fetch individually
    const suppliers: SupplierEntity[] = []
    for (const id of ids) {
      const supplier = await this.findById(EntityId.from(id))
      if (supplier) {
        suppliers.push(supplier)
      }
    }
    return suppliers
  }

  async findUnverified(
    tenantId: string,
    limit?: number
  ): Promise<SupplierEntity[]> {
    const options: any = {
      orderBy: { field: 'created_at', direction: 'asc' }
    }
    if (limit !== undefined) options.limit = limit
    
    const query = new FindManyQuery(
      'suppliers',
      { tenant_id: tenantId, verified_date: null },
      options
    )
    const results = await this.queryExecutor.executeMany<SupplierDatabaseRow>(query)
    return results.map(row => SupplierMapper.toDomain(row))
  }

  async updateSyncInfo(supplierIds: string[], syncedAt: Date): Promise<void> {
    // Would need batch update support
    // For now, update individually
    for (const id of supplierIds) {
      const query = new UpdateQuery(
        'suppliers',
        { id },
        { 
          last_synced_at: syncedAt,
          sync_version: 0, // Should be incremented
          updated_at: new Date()
        }
      )
      await this.queryExecutor.executeUpdate(query)
    }
  }

  async findByTag(
    tenantId: string,
    tag: string,
    limit?: number
  ): Promise<SupplierEntity[]> {
    // Would need JSON array contains query
    // For now, fetch all and filter
    const allSuppliers = await this.findByTenant(tenantId, undefined, undefined, limit)
    return allSuppliers.filter(supplier => {
      const props = supplier.toDatabase()
      return props.tags.includes(tag)
    })
  }

  async getDistinctTags(tenantId: string): Promise<string[]> {
    // Would need distinct with JSON extraction
    // For now, fetch all and extract
    const allSuppliers = await this.findByTenant(tenantId)
    const tagSet = new Set<string>()
    
    for (const supplier of allSuppliers) {
      const props = supplier.toDatabase()
      for (const tag of props.tags) {
        tagSet.add(tag)
      }
    }
    
    return Array.from(tagSet).sort()
  }

  private mapSortField(field: SupplierSortOptions['field']): string {
    const fieldMap: Record<SupplierSortOptions['field'], string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      dataQualityScore: 'data_quality_score'
    }
    return fieldMap[field]
  }
}