import { eq, and, isNull, sql } from 'drizzle-orm'
import { invoices, transactions } from '../../database/schema'
import { getDatabase } from '../../database/connection'
import logger from '../../config/logger'

export interface DataIntegrityReport {
  tenantId: string
  timestamp: Date
  orphanedRecords: {
    transactionsWithoutSuppliers: number
    transactionsWithoutAccounts: number
    invoicesWithoutSuppliers: number
    invoiceLineItemsWithoutAccounts: number
    transactionsWithoutInvoices: number
  }
  missingRelationships: {
    entity: string
    field: string
    count: number
    examples: string[]
  }[]
  linkingSuccess: {
    transactionSupplierLinkRate: number
    transactionAccountLinkRate: number
    invoiceSupplierLinkRate: number
    transactionInvoiceLinkRate: number
  }
}

export class DataIntegrityService {
  private db = getDatabase()
  
  constructor() {}

  async generateIntegrityReport(tenantId: string): Promise<DataIntegrityReport> {
    logger.info(`Generating data integrity report for tenant ${tenantId}`)

    const [
      transactionStats,
      invoiceStats,
      orphanedTransactions,
      orphanedInvoices,
      unmatchedTransactions
    ] = await Promise.all([
      this.getTransactionStats(tenantId),
      this.getInvoiceStats(tenantId),
      this.getOrphanedTransactions(tenantId),
      this.getOrphanedInvoices(tenantId),
      this.getUnmatchedTransactions(tenantId)
    ])

    const report: DataIntegrityReport = {
      tenantId,
      timestamp: new Date(),
      orphanedRecords: {
        transactionsWithoutSuppliers: orphanedTransactions.withoutSuppliers.length,
        transactionsWithoutAccounts: orphanedTransactions.withoutAccounts.length,
        invoicesWithoutSuppliers: orphanedInvoices.withoutSuppliers.length,
        invoiceLineItemsWithoutAccounts: orphanedInvoices.lineItemsWithoutAccounts,
        transactionsWithoutInvoices: unmatchedTransactions.length
      },
      missingRelationships: [],
      linkingSuccess: {
        transactionSupplierLinkRate: transactionStats.total > 0 
          ? (transactionStats.withSuppliers / transactionStats.total) * 100 
          : 0,
        transactionAccountLinkRate: transactionStats.total > 0 
          ? (transactionStats.withAccounts / transactionStats.total) * 100 
          : 0,
        invoiceSupplierLinkRate: invoiceStats.total > 0 
          ? (invoiceStats.withSuppliers / invoiceStats.total) * 100 
          : 0,
        transactionInvoiceLinkRate: transactionStats.total > 0 
          ? (transactionStats.withInvoices / transactionStats.total) * 100 
          : 0
      }
    }

    // Add missing relationship details
    if (orphanedTransactions.withoutSuppliers.length > 0) {
      report.missingRelationships.push({
        entity: 'transactions',
        field: 'supplierId',
        count: orphanedTransactions.withoutSuppliers.length,
        examples: orphanedTransactions.withoutSuppliers.slice(0, 5).map(t => 
          `Transaction ${t.providerTransactionId} - ${t.merchantName || 'No merchant name'}`
        )
      })
    }

    if (orphanedTransactions.withoutAccounts.length > 0) {
      report.missingRelationships.push({
        entity: 'transactions',
        field: 'accountId',
        count: orphanedTransactions.withoutAccounts.length,
        examples: orphanedTransactions.withoutAccounts.slice(0, 5).map(t => 
          `Transaction ${t.providerTransactionId} - Account ${t.sourceAccountName || 'Unknown'}`
        )
      })
    }

    if (orphanedInvoices.withoutSuppliers.length > 0) {
      report.missingRelationships.push({
        entity: 'invoices',
        field: 'supplierId',
        count: orphanedInvoices.withoutSuppliers.length,
        examples: orphanedInvoices.withoutSuppliers.slice(0, 5).map(i => 
          `Invoice ${i.invoiceNumber} - ${i.supplierName || 'No supplier name'}`
        )
      })
    }

    logger.info(`Data integrity report generated`, {
      tenantId,
      orphanedRecords: report.orphanedRecords,
      linkingSuccessRates: report.linkingSuccess
    })

    return report
  }

  private async getTransactionStats(tenantId: string) {
    const [totalResult, withSuppliersResult, withAccountsResult, withInvoicesResult] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(eq(transactions.tenantId, tenantId)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            sql`${transactions.supplierId} IS NOT NULL`
          )
        ),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            sql`${transactions.accountId} IS NOT NULL`
          )
        ),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            sql`${transactions.sourceInvoiceId} IS NOT NULL`
          )
        )
    ])

    return {
      total: totalResult[0]?.count || 0,
      withSuppliers: withSuppliersResult[0]?.count || 0,
      withAccounts: withAccountsResult[0]?.count || 0,
      withInvoices: withInvoicesResult[0]?.count || 0
    }
  }

  private async getInvoiceStats(tenantId: string) {
    const [totalResult, withSuppliersResult] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            sql`${invoices.supplierId} IS NOT NULL`
          )
        )
    ])

    // Count line items without accounts
    const lineItemsWithoutAccountsResult = await this.db
      .select({ 
        count: sql<number>`
          SUM(
            CASE 
              WHEN line_item->>'accountId' IS NULL 
              AND line_item->>'accountCode' IS NOT NULL 
              THEN 1 
              ELSE 0 
            END
          )::int
        ` 
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))

    return {
      total: totalResult[0]?.count || 0,
      withSuppliers: withSuppliersResult[0]?.count || 0,
      lineItemsWithoutAccounts: lineItemsWithoutAccountsResult[0]?.count || 0
    }
  }

  private async getOrphanedTransactions(tenantId: string) {
    const withoutSuppliers = await this.db
      .select({
        id: transactions.id,
        providerTransactionId: transactions.providerTransactionId,
        merchantName: transactions.merchantName,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          isNull(transactions.supplierId),
          sql`${transactions.merchantName} IS NOT NULL`
        )
      )
      .limit(100)

    const withoutAccounts = await this.db
      .select({
        id: transactions.id,
        providerTransactionId: transactions.providerTransactionId,
        sourceAccountName: transactions.sourceAccountName,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          isNull(transactions.accountId),
          sql`${transactions.sourceAccountId} IS NOT NULL`
        )
      )
      .limit(100)

    return {
      withoutSuppliers,
      withoutAccounts
    }
  }

  private async getOrphanedInvoices(tenantId: string) {
    const withoutSuppliers = await this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        supplierName: invoices.supplierName,
        totalAmount: invoices.totalAmount,
        invoiceDate: invoices.invoiceDate
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          isNull(invoices.supplierId),
          sql`${invoices.supplierName} IS NOT NULL`
        )
      )
      .limit(100)

    // Count line items without accounts across all invoices
    const lineItemStatsResult = await this.db
      .select({ 
        totalLineItems: sql<number>`
          SUM(JSON_ARRAY_LENGTH(${invoices.lineItems}))::int
        `,
        lineItemsWithoutAccounts: sql<number>`
          SUM(
            (SELECT COUNT(*)::int
             FROM JSON_ARRAY_ELEMENTS(${invoices.lineItems}) AS line_item
             WHERE line_item->>'accountId' IS NULL 
             AND line_item->>'accountCode' IS NOT NULL)
          )::int
        ` 
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))

    return {
      withoutSuppliers,
      lineItemsWithoutAccounts: lineItemStatsResult[0]?.lineItemsWithoutAccounts || 0
    }
  }

  private async getUnmatchedTransactions(tenantId: string) {
    // Find transactions that could potentially be matched to invoices
    // (have supplier, similar amounts exist in invoices, but no link)
    return await this.db
      .select({
        id: transactions.id,
        providerTransactionId: transactions.providerTransactionId,
        supplierId: transactions.supplierId,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          sql`${transactions.supplierId} IS NOT NULL`,
          isNull(transactions.sourceInvoiceId),
          sql`${transactions.transactionType} IN ('SPEND', 'RECEIVE')`
        )
      )
      .limit(100)
  }

  async attemptRelinking(tenantId: string): Promise<{
    transactionsLinkedToSuppliers: number
    transactionsLinkedToAccounts: number
    transactionsLinkedToInvoices: number
    invoicesLinkedToSuppliers: number
  }> {
    logger.info(`Attempting to relink orphaned records for tenant ${tenantId}`)

    // This would use the EntityLookupService to attempt to relink orphaned records
    // Implementation would be similar to the import use cases but only updating missing links

    return {
      transactionsLinkedToSuppliers: 0,
      transactionsLinkedToAccounts: 0,
      transactionsLinkedToInvoices: 0,
      invoicesLinkedToSuppliers: 0
    }
  }
}