import { eq, and, desc, count, inArray, like, gte, lte } from 'drizzle-orm'
import { TransactionEntity } from '../../core/domain/transaction/index'
import type { TransactionRepository, TransactionSearchFilters } from '../../core/ports/transaction.repository'
import { EntityId } from '../../core/domain/shared/value-objects/entity-id'
import { transactions, type Transaction, type NewTransaction } from '../../database/schema/transactions'
import { BaseRepository, type Database } from '../database/types'

export class DrizzleTransactionRepository extends BaseRepository implements TransactionRepository {
  constructor(database: Database) {
    super(database)
  }

  async save(transaction: TransactionEntity): Promise<TransactionEntity> {
    const data = transaction.toDatabase()
    
    // Convert TransactionEntityProps to database format
    const dbData: NewTransaction = {
      id: data.id.toString(),
      tenantId: data.tenantId,
      integrationId: data.integrationId,
      providerTransactionId: data.providerTransactionId,
      providerType: data.providerType,
      transactionDate: data.transactionDate.toISOString().split('T')[0] as any, // Convert to date string
      postedDate: data.postedDate ? data.postedDate.toISOString().split('T')[0] as any : null,
      amount: data.amount,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      baseCurrencyAmount: data.baseCurrencyAmount,
      sourceAccountId: data.sourceAccountId,
      sourceAccountName: data.sourceAccountName,
      sourceAccountType: data.sourceAccountType,
      balanceAfter: data.balanceAfter,
      transactionFee: data.transactionFee,
      rawDescription: data.rawDescription,
      transactionReference: data.transactionReference,
      memo: data.memo,
      isReconciled: data.isReconciled,
      reconciledAt: data.reconciledAt,
      reconciledBy: data.reconciledBy,
      status: data.status,
      providerData: data.providerData,
      enrichmentStatus: data.enrichmentStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      syncedAt: data.syncedAt,
    }

    const [result] = await (this.db as any)
      .insert(transactions)
      .values(dbData)
      .onConflictDoUpdate({
        target: transactions.id,
        set: {
          ...dbData,
          updatedAt: new Date(),
        },
      })
      .returning()

    return this.mapToEntity(result)
  }

  async saveBatch(transactionEntities: TransactionEntity[]): Promise<TransactionEntity[]> {
    if (transactionEntities.length === 0) return []

    const dbData = transactionEntities.map(transaction => {
      const data = transaction.toDatabase()
      return {
        id: data.id.toString(),
        tenantId: data.tenantId,
        integrationId: data.integrationId,
        providerTransactionId: data.providerTransactionId,
        providerType: data.providerType,
        transactionDate: data.transactionDate.toISOString().split('T')[0] as any,
        postedDate: data.postedDate ? data.postedDate.toISOString().split('T')[0] as any : null,
        amount: data.amount,
        currency: data.currency,
        exchangeRate: data.exchangeRate,
        baseCurrencyAmount: data.baseCurrencyAmount,
        sourceAccountId: data.sourceAccountId,
        sourceAccountName: data.sourceAccountName,
        sourceAccountType: data.sourceAccountType,
        balanceAfter: data.balanceAfter,
        transactionFee: data.transactionFee,
        rawDescription: data.rawDescription,
        transactionReference: data.transactionReference,
        memo: data.memo,
        isReconciled: data.isReconciled,
        reconciledAt: data.reconciledAt,
        reconciledBy: data.reconciledBy,
        status: data.status,
        providerData: data.providerData,
        enrichmentStatus: data.enrichmentStatus,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        syncedAt: data.syncedAt,
      } as NewTransaction
    })

    const results = await (this.db as any)
      .insert(transactions)
      .values(dbData)
      .onConflictDoUpdate({
        target: transactions.id,
        set: {
          updatedAt: new Date(),
        },
      })
      .returning()

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findById(id: EntityId): Promise<TransactionEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(transactions)
      .where(eq(transactions.id, id.toString()))

    return result ? this.mapToEntity(result) : null
  }

  async findByTenantId(
    tenantId: string,
    filters?: TransactionSearchFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionEntity[]> {
    let query = (this.db as any)
      .select()
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          inArray(transactions.status, filters.status as any[])
        ))
      }

      if (filters.enrichmentStatus && filters.enrichmentStatus.length > 0) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          inArray(transactions.enrichmentStatus, filters.enrichmentStatus as any[])
        ))
      }

      if (filters.providerType && filters.providerType.length > 0) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          inArray(transactions.providerType, filters.providerType as any[])
        ))
      }

      if (filters.accountId) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.sourceAccountId, filters.accountId)
        ))
      }

      if (filters.dateFrom) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          gte(transactions.transactionDate, filters.dateFrom.toISOString().split('T')[0])
        ))
      }

      if (filters.dateTo) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          lte(transactions.transactionDate, filters.dateTo.toISOString().split('T')[0])
        ))
      }

      if (filters.isReconciled !== undefined) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.isReconciled, filters.isReconciled)
        ))
      }

      if (filters.searchQuery) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          like(transactions.rawDescription, `%${filters.searchQuery}%`)
        ))
      }
    }

    const results = await query
      .orderBy(desc(transactions.transactionDate))
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByIntegrationId(
    integrationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(transactions)
      .where(eq(transactions.integrationId, integrationId))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findByProviderTransactionId(
    tenantId: string,
    integrationId: string,
    providerTransactionId: string
  ): Promise<TransactionEntity | null> {
    const [result] = await (this.db as any)
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.integrationId, integrationId),
        eq(transactions.providerTransactionId, providerTransactionId)
      ))

    return result ? this.mapToEntity(result) : null
  }

  async findUnreconciledByTenantId(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.isReconciled, false)
      ))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit)
      .offset(offset)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async findPendingEnrichment(limit: number = 50): Promise<TransactionEntity[]> {
    const results = await (this.db as any)
      .select()
      .from(transactions)
      .where(eq(transactions.enrichmentStatus, 'pending'))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)

    return results.map((result: any) => this.mapToEntity(result))
  }

  async countByTenantId(
    tenantId: string,
    filters?: TransactionSearchFilters
  ): Promise<number> {
    let query = (this.db as any)
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))

    // Apply same filters as findByTenantId
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.where(and(
          eq(transactions.tenantId, tenantId),
          inArray(transactions.status, filters.status as any[])
        ))
      }
      // ... apply other filters similarly
    }

    const [result] = await query
    return result.count
  }

  async countByIntegrationId(integrationId: string): Promise<number> {
    const [result] = await (this.db as any)
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.integrationId, integrationId))

    return result.count
  }

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(transactions)
      .where(eq(transactions.id, id))
  }

  async deleteByIntegrationId(integrationId: string): Promise<void> {
    await (this.db as any)
      .delete(transactions)
      .where(eq(transactions.integrationId, integrationId))
  }

  async getTransactionSummary(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalTransactions: number
    totalAmount: string
    reconciledCount: number
    pendingCount: number
    currencies: Record<string, number>
  }> {
    let baseCondition = eq(transactions.tenantId, tenantId)
    
    if (dateFrom || dateTo) {
      const conditions = [eq(transactions.tenantId, tenantId)]
      
      if (dateFrom) {
        conditions.push(gte(transactions.transactionDate, dateFrom.toISOString().split('T')[0]))
      }
      
      if (dateTo) {
        conditions.push(lte(transactions.transactionDate, dateTo.toISOString().split('T')[0]))
      }
      
      baseCondition = and(...conditions) as any
    }

    // Get total count
    const [totalResult] = await (this.db as any)
      .select({ count: count() })
      .from(transactions)
      .where(baseCondition)

    // Get reconciled count
    const [reconciledResult] = await (this.db as any)
      .select({ count: count() })
      .from(transactions)
      .where(and(baseCondition, eq(transactions.isReconciled, true)))

    // Get pending count
    const [pendingResult] = await (this.db as any)
      .select({ count: count() })
      .from(transactions)
      .where(and(baseCondition, eq(transactions.status, 'pending')))

    // Get all transactions for currency grouping and total amount
    const allTransactions = await (this.db as any)
      .select({
        amount: transactions.amount,
        currency: transactions.currency,
      })
      .from(transactions)
      .where(baseCondition)

    // Calculate totals
    const currencies: Record<string, number> = {}
    let totalAmount = 0

    for (const txn of allTransactions) {
      const amount = parseFloat(txn.amount)
      totalAmount += amount
      
      if (!currencies[txn.currency]) {
        currencies[txn.currency] = 0
      }
      currencies[txn.currency] += amount
    }

    return {
      totalTransactions: totalResult.count,
      totalAmount: totalAmount.toString(),
      reconciledCount: reconciledResult.count,
      pendingCount: pendingResult.count,
      currencies,
    }
  }

  private mapToEntity(dbTransaction: Transaction): TransactionEntity {
    return TransactionEntity.fromDatabase({
      id: EntityId.from(dbTransaction.id),
      tenantId: dbTransaction.tenantId,
      integrationId: dbTransaction.integrationId,
      providerTransactionId: dbTransaction.providerTransactionId,
      providerType: dbTransaction.providerType,
      transactionDate: new Date(dbTransaction.transactionDate),
      postedDate: dbTransaction.postedDate ? new Date(dbTransaction.postedDate) : null,
      amount: dbTransaction.amount,
      currency: dbTransaction.currency,
      exchangeRate: dbTransaction.exchangeRate,
      baseCurrencyAmount: dbTransaction.baseCurrencyAmount,
      sourceAccountId: dbTransaction.sourceAccountId,
      sourceAccountName: dbTransaction.sourceAccountName,
      sourceAccountType: dbTransaction.sourceAccountType,
      balanceAfter: dbTransaction.balanceAfter,
      transactionFee: dbTransaction.transactionFee,
      rawDescription: dbTransaction.rawDescription,
      transactionReference: dbTransaction.transactionReference,
      memo: dbTransaction.memo,
      isReconciled: dbTransaction.isReconciled,
      reconciledAt: dbTransaction.reconciledAt,
      reconciledBy: dbTransaction.reconciledBy,
      status: dbTransaction.status,
      providerData: dbTransaction.providerData as Record<string, unknown>,
      enrichmentStatus: dbTransaction.enrichmentStatus,
      aiCategory: null, // These are not in current schema yet
      aiConfidence: null,
      aiTags: [],
      aiSupplierMatch: null,
      createdAt: dbTransaction.createdAt,
      updatedAt: dbTransaction.updatedAt,
      syncedAt: dbTransaction.syncedAt,
      createdBy: null, // These are not in current schema yet
      updatedBy: null,
      version: 1, // Default version
    })
  }
}