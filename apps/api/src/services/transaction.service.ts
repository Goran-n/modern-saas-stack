import { eq, and, desc, sql } from 'drizzle-orm'
import { getDatabase } from '../database/connection'
import { transactions, type Transaction, type TransactionLineItem, transactionLineItems } from '../database/schema/transactions'
import { reconciliations } from '../database/schema/reconciliations'
import { accounts } from '../database/schema/accounts'
import type { TransactionRepository } from '../core/ports/transaction.repository'
import type { TransactionEntity } from '../core/domain/transaction'
import type { Logger } from 'pino'

export interface TransactionWithReconciliation extends Transaction {
  isReconciled: boolean
  lineItems?: TransactionLineItem[]
}

export class TransactionService {
  private db = getDatabase()

  constructor(
    private transactionRepository: TransactionRepository,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<TransactionEntity | null> {
    return this.transactionRepository.findById(id)
  }

  async findByIntegration(integrationId: string): Promise<TransactionEntity[]> {
    return this.transactionRepository.findByIntegrationId(integrationId)
  }

  async listByAccount(
    accountId: string, 
    tenantId: string,
    limit = 100,
    offset = 0
  ): Promise<TransactionWithReconciliation[]> {
    if (!this.db) return []

    try {
      // First, get the account details to determine if it's a bank account
      const [account] = await this.db
        .select({
          isBankAccount: accounts.isBankAccount,
          code: accounts.code
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.id, accountId),
            eq(accounts.tenantId, tenantId)
          )
        )
        .limit(1)

      if (!account) {
        this.logger.warn({ accountId, tenantId }, 'Account not found')
        return []
      }

      // Determine filtering logic based on account type
      let whereCondition
      if (account.isBankAccount) {
        // For bank accounts, filter by sourceAccountId using the account code
        this.logger.info({ accountId, tenantId, code: account.code }, 'Filtering transactions by bank account identifier')
        whereCondition = and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.sourceAccountId, account.code)
        )
      } else {
        // For GL accounts, filter by accountId as before
        this.logger.info({ accountId, tenantId }, 'Filtering transactions by GL account ID')
        whereCondition = and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.accountId, accountId)
        )
      }

      // Get transactions with reconciliation status
      const result = await this.db
        .select({
          transaction: transactions,
          reconciliation: reconciliations
        })
        .from(transactions)
        .leftJoin(
          reconciliations,
          eq(transactions.id, reconciliations.transactionId)
        )
        .where(whereCondition)
        .orderBy(desc(transactions.transactionDate))
        .limit(limit)
        .offset(offset)

      // Get line items for reconciled transactions
      const transactionIds = result
        .filter(row => row.reconciliation)
        .map(row => row.transaction.id)

      let lineItemsMap: Map<string, TransactionLineItem[]> = new Map()
      
      if (transactionIds.length > 0) {
        const lineItemsResult = await this.db
          .select()
          .from(transactionLineItems)
          .where(
            and(
              eq(transactionLineItems.tenantId, tenantId),
              // Check if transactionId is in the array
              sql`${transactionLineItems.transactionId} = ANY(${transactionIds})`
            )
          )

        // Group line items by transaction
        lineItemsResult.forEach(lineItem => {
          const transactionId = lineItem.transactionId
          if (!lineItemsMap.has(transactionId)) {
            lineItemsMap.set(transactionId, [])
          }
          lineItemsMap.get(transactionId)!.push(lineItem)
        })
      }

      // Transform to include reconciliation status and line items
      const transactionsWithStatus = result.map(row => ({
        ...row.transaction,
        isReconciled: !!row.reconciliation,
        lineItems: lineItemsMap.get(row.transaction.id) || []
      }))

      this.logger.info({
        accountId,
        tenantId,
        count: transactionsWithStatus.length
      }, 'Retrieved transactions for account')

      return transactionsWithStatus
    } catch (error) {
      this.logger.error({ 
        error, 
        accountId, 
        tenantId 
      }, 'Failed to list transactions by account')
      throw new Error('Failed to retrieve transactions')
    }
  }

  async create(_data: any): Promise<TransactionEntity> {
    // Implementation needed
    throw new Error('Not implemented')
  }

  async update(_id: string, _data: any): Promise<TransactionEntity> {
    // Implementation needed
    throw new Error('Not implemented')
  }
}