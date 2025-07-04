import { eq, and, or, sql } from 'drizzle-orm'
import { getDatabase } from '../database/connection'
import { suppliers, type Supplier } from '../database/schema/suppliers'
import log from '../config/logger'

export interface SupplierFilters {
  type?: 'supplier' | 'customer' | 'employee' | 'other'
  search?: string
  isActive?: boolean
}

export class SupplierService {
  private db = getDatabase()

  async listSuppliers(
    tenantId: string, 
    filters?: SupplierFilters,
    limit = 100,
    offset = 0
  ): Promise<Supplier[]> {
    if (!this.db) return []

    try {
      // Apply filters
      const conditions = [eq(suppliers.tenantId, tenantId)]

      if (filters?.type) {
        conditions.push(eq(suppliers.supplierType, filters.type))
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(suppliers.isActive, filters.isActive))
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`
        const searchCondition = or(
          sql`LOWER(${suppliers.name}) LIKE ${searchTerm}`,
          sql`LOWER(${suppliers.primaryEmail}) LIKE ${searchTerm}`,
          sql`LOWER(${suppliers.primaryPhone}) LIKE ${searchTerm}`
        )
        if (searchCondition) {
          conditions.push(searchCondition)
        }
      }

      const result = await this.db
        .select()
        .from(suppliers)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(suppliers.name)
        .limit(limit)
        .offset(offset)

      log.info({
        tenantId,
        count: result.length,
        filters
      }, 'Retrieved suppliers')

      return result
    } catch (error) {
      log.error({ 
        error, 
        tenantId,
        filters 
      }, 'Failed to list suppliers')
      throw new Error('Failed to retrieve suppliers')
    }
  }

  async getSupplier(id: string, tenantId: string): Promise<Supplier | null> {
    if (!this.db) return null

    try {
      const [supplier] = await this.db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, id),
            eq(suppliers.tenantId, tenantId)
          )
        )

      if (!supplier) {
        log.warn({ id, tenantId }, 'Supplier not found')
        return null
      }

      log.info({ id, tenantId }, 'Retrieved supplier details')
      return supplier
    } catch (error) {
      log.error({ error, id, tenantId }, 'Failed to get supplier')
      throw new Error('Failed to retrieve supplier')
    }
  }

  async getSuppliersByType(
    type: 'supplier' | 'customer' | 'employee' | 'other',
    tenantId: string
  ): Promise<Supplier[]> {
    if (!this.db) return []

    try {
      const result = await this.db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.tenantId, tenantId),
            eq(suppliers.supplierType, type),
            eq(suppliers.isActive, true)
          )
        )
        .orderBy(suppliers.name)

      log.info({
        type,
        tenantId,
        count: result.length
      }, 'Retrieved suppliers by type')

      return result
    } catch (error) {
      log.error({ error, type, tenantId }, 'Failed to list suppliers by type')
      throw new Error('Failed to retrieve suppliers by type')
    }
  }

  async getSupplierStats(tenantId: string): Promise<{
    total: number
    byType: Record<string, number>
    active: number
    inactive: number
  }> {
    if (!this.db) return {
      total: 0,
      byType: {},
      active: 0,
      inactive: 0
    }

    try {
      // Get counts by type
      const typeCountsResult = await this.db
        .select({
          contactType: suppliers.supplierType,
          count: sql<number>`count(*)::int`
        })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tenantId))
        .groupBy(suppliers.supplierType)

      const byType: Record<string, number> = {}
      let total = 0
      
      typeCountsResult.forEach(row => {
        if (row.contactType) {
          byType[row.contactType] = row.count
          total += row.count
        }
      })

      // Get active/inactive counts
      const [activeResult] = await this.db
        .select({
          count: sql<number>`count(*)::int`
        })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.tenantId, tenantId),
            eq(suppliers.isActive, true)
          )
        )

      const active = activeResult?.count || 0
      const inactive = total - active

      return {
        total,
        byType,
        active,
        inactive
      }
    } catch (error) {
      log.error({ error, tenantId }, 'Failed to get supplier stats')
      return {
        total: 0,
        byType: {},
        active: 0,
        inactive: 0
      }
    }
  }
}