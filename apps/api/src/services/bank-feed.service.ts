import { eq, and, desc, sql } from 'drizzle-orm'
import { getDatabase } from '../database/connection'
import { bankStatements, type BankStatement } from '../database/schema/bank-statements'
import { reconciliations } from '../database/schema/reconciliations'
import log from '../config/logger'

export interface BankStatementWithReconciliation extends BankStatement {
  isReconciled: boolean
  reconciliationId?: string
}

export class BankFeedService {
  private db = getDatabase()

  async listByAccount(
    accountIdentifier: string, 
    tenantId: string,
    limit = 100,
    offset = 0
  ): Promise<BankStatementWithReconciliation[]> {
    if (!this.db) return []

    try {
      // Get bank statements with reconciliation status
      const result = await this.db
        .select({
          bankStatement: bankStatements,
          reconciliation: reconciliations
        })
        .from(bankStatements)
        .leftJoin(
          reconciliations,
          eq(bankStatements.id, reconciliations.bankStatementId)
        )
        .where(
          and(
            eq(bankStatements.tenantId, tenantId),
            eq(bankStatements.accountIdentifier, accountIdentifier)
          )
        )
        .orderBy(desc(bankStatements.transactionDate))
        .limit(limit)
        .offset(offset)

      // Transform to include reconciliation status
      const statementsWithStatus = result.map(row => {
        const statement: any = {
          ...row.bankStatement,
          isReconciled: !!row.reconciliation,
        }
        if (row.reconciliation?.id) {
          statement.reconciliationId = row.reconciliation.id
        }
        return statement
      })

      log.info({
        accountIdentifier,
        tenantId,
        count: statementsWithStatus.length
      }, 'Retrieved bank statements for account')

      return statementsWithStatus
    } catch (error) {
      log.error({ 
        error, 
        accountIdentifier, 
        tenantId 
      }, 'Failed to list bank statements')
      throw new Error('Failed to retrieve bank statements')
    }
  }

  async getUnreconciledCount(
    accountIdentifier: string,
    tenantId: string
  ): Promise<number> {
    if (!this.db) return 0

    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(bankStatements)
        .leftJoin(
          reconciliations,
          eq(bankStatements.id, reconciliations.bankStatementId)
        )
        .where(
          and(
            eq(bankStatements.tenantId, tenantId),
            eq(bankStatements.accountIdentifier, accountIdentifier),
            sql`${reconciliations.id} IS NULL`
          )
        )

      return result[0]?.count || 0
    } catch (error) {
      log.error({ 
        error, 
        accountIdentifier, 
        tenantId 
      }, 'Failed to count unreconciled statements')
      return 0
    }
  }

  async getDateRange(
    accountIdentifier: string,
    tenantId: string
  ): Promise<{ earliest: Date | null; latest: Date | null }> {
    if (!this.db) return { earliest: null, latest: null }

    try {
      const result = await this.db
        .select({
          earliest: sql<Date>`MIN(transaction_date)`,
          latest: sql<Date>`MAX(transaction_date)`
        })
        .from(bankStatements)
        .where(
          and(
            eq(bankStatements.tenantId, tenantId),
            eq(bankStatements.accountIdentifier, accountIdentifier)
          )
        )

      return {
        earliest: result[0]?.earliest || null,
        latest: result[0]?.latest || null
      }
    } catch (error) {
      log.error({ 
        error, 
        accountIdentifier, 
        tenantId 
      }, 'Failed to get date range')
      return { earliest: null, latest: null }
    }
  }
}