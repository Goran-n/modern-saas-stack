import type { TransactionEntity } from '../domain/transaction/index'
import { EntityId } from '../domain/shared/value-objects/entity-id'

export interface TransactionSearchFilters {
  status?: string[]
  enrichmentStatus?: string[]
  providerType?: string[]
  accountId?: string
  dateFrom?: Date
  dateTo?: Date
  isReconciled?: boolean
  searchQuery?: string
}

export interface TransactionRepository {
  save(transaction: TransactionEntity): Promise<TransactionEntity>
  saveBatch(transactions: TransactionEntity[]): Promise<TransactionEntity[]>
  findById(id: EntityId): Promise<TransactionEntity | null>
  findByTenantId(tenantId: string, filters?: TransactionSearchFilters, limit?: number, offset?: number): Promise<TransactionEntity[]>
  findByIntegrationId(integrationId: string, limit?: number, offset?: number): Promise<TransactionEntity[]>
  findByProviderTransactionId(tenantId: string, integrationId: string, providerTransactionId: string): Promise<TransactionEntity | null>
  findUnreconciledByTenantId(tenantId: string, limit?: number, offset?: number): Promise<TransactionEntity[]>
  findPendingEnrichment(limit?: number): Promise<TransactionEntity[]>
  countByTenantId(tenantId: string, filters?: TransactionSearchFilters): Promise<number>
  countByIntegrationId(integrationId: string): Promise<number>
  delete(id: string): Promise<void>
  deleteByIntegrationId(integrationId: string): Promise<void>
  getTransactionSummary(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalTransactions: number
    totalAmount: string
    reconciledCount: number
    pendingCount: number
    currencies: Record<string, number>
  }>
}