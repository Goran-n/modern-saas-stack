import { InvoiceEntity, InvoiceStatus, InvoiceType } from '../../domain/invoice/invoice.entity'
import { EntityId } from '../../domain/shared/value-objects/entity-id'

export interface InvoiceFilters {
  status?: InvoiceStatus[]
  type?: InvoiceType[]
  supplierId?: string
  dueDate?: {
    from?: Date
    to?: Date
  }
  invoiceDate?: {
    from?: Date
    to?: Date
  }
  needsReview?: boolean
  fullyPaid?: boolean
  overdue?: boolean
}

export interface InvoiceSortOptions {
  field: 'dueDate' | 'invoiceDate' | 'totalAmount' | 'createdAt' | 'updatedAt'
  direction: 'asc' | 'desc'
}

export interface InvoiceRepository {
  /**
   * Save an invoice (create or update)
   */
  save(invoice: InvoiceEntity): Promise<InvoiceEntity>
  
  /**
   * Find an invoice by ID
   */
  findById(id: EntityId): Promise<InvoiceEntity | null>
  
  /**
   * Find an invoice by provider invoice ID
   */
  findByProviderInvoiceId(
    tenantId: string,
    integrationId: string,
    providerInvoiceId: string
  ): Promise<InvoiceEntity | null>
  
  /**
   * Find invoices by tenant with filters
   */
  findByTenant(
    tenantId: string,
    filters?: InvoiceFilters,
    sort?: InvoiceSortOptions,
    limit?: number,
    offset?: number
  ): Promise<InvoiceEntity[]>
  
  /**
   * Count invoices by tenant with filters
   */
  countByTenant(
    tenantId: string,
    filters?: InvoiceFilters
  ): Promise<number>
  
  /**
   * Find invoices by supplier
   */
  findBySupplier(
    supplierId: string,
    limit?: number,
    offset?: number
  ): Promise<InvoiceEntity[]>
  
  /**
   * Find overdue invoices for a tenant
   */
  findOverdue(
    tenantId: string,
    asOfDate?: Date
  ): Promise<InvoiceEntity[]>
  
  /**
   * Find invoices needing review
   */
  findNeedingReview(
    tenantId: string,
    limit?: number
  ): Promise<InvoiceEntity[]>
  
  /**
   * Calculate total amount by status for a tenant
   */
  getTotalsByStatus(
    tenantId: string,
    currency: string
  ): Promise<Record<InvoiceStatus, { count: number; totalAmount: number }>>
  
  /**
   * Check if an invoice exists
   */
  exists(id: string): Promise<boolean>
  
  /**
   * Delete an invoice (soft delete by marking as deleted)
   */
  delete(id: string): Promise<void>
  
  /**
   * Find invoices by IDs
   */
  findByIds(ids: string[]): Promise<InvoiceEntity[]>
  
  /**
   * Update sync info for multiple invoices
   */
  updateSyncInfo(
    invoiceIds: string[],
    syncedAt: Date
  ): Promise<void>
}