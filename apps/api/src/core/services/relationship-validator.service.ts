import { eq, and, isNull, sql } from 'drizzle-orm'
import { 
  transactions, 
  invoices, 
  suppliers, 
  accounts,
  manualJournals 
} from '../../database/schema'
import { getDatabase } from '../../database/connection'
import logger from '../../config/logger'

export interface ValidationResult {
  entity: string
  totalRecords: number
  orphanedRecords: number
  missingReferences: Array<{
    id: string
    field: string
    missingId: string
    description?: string
  }>
}

export interface ValidationSummary {
  tenantId: string
  validatedAt: Date
  results: ValidationResult[]
  totalOrphans: number
  healthScore: number // 0-100
}

export class RelationshipValidatorService {
  private db = getDatabase()
  
  constructor() {}

  /**
   * Validate all relationships for a tenant
   */
  async validateTenant(tenantId: string): Promise<ValidationSummary> {
    logger.info('Starting relationship validation', { tenantId })
    
    const results: ValidationResult[] = []
    const validatedAt = new Date()
    
    // Validate each entity type
    results.push(await this.validateTransactions(tenantId))
    results.push(await this.validateInvoices(tenantId))
    results.push(await this.validateManualJournals(tenantId))
    
    // Calculate summary
    const totalOrphans = results.reduce((sum, r) => sum + r.orphanedRecords, 0)
    const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0)
    const healthScore = totalRecords > 0 
      ? Math.round(((totalRecords - totalOrphans) / totalRecords) * 100)
      : 100
    
    logger.info('Validation complete', { 
      tenantId, 
      totalOrphans, 
      healthScore,
      results: results.map(r => ({ 
        entity: r.entity, 
        orphans: r.orphanedRecords,
        total: r.totalRecords 
      }))
    })
    
    return {
      tenantId,
      validatedAt,
      results,
      totalOrphans,
      healthScore
    }
  }

  /**
   * Validate transaction relationships
   */
  private async validateTransactions(tenantId: string): Promise<ValidationResult> {
    const missingReferences: ValidationResult['missingReferences'] = []
    
    // Get all transactions with potential orphaned relationships
    const transactionsData = await this.db
      .select({
        id: transactions.id,
        supplierId: transactions.supplierId,
        accountId: transactions.accountId,
        sourceInvoiceId: transactions.sourceInvoiceId,
        rawDescription: transactions.rawDescription,
        merchantName: transactions.merchantName,
        amount: transactions.amount
      })
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))
    
    // Get valid IDs for validation
    const [validSuppliers, validAccounts, validInvoices] = await Promise.all([
      this.getValidIds(tenantId, suppliers, 'id'),
      this.getValidIds(tenantId, accounts, 'id'),
      this.getValidIds(tenantId, invoices, 'id')
    ])
    
    // Check each transaction
    for (const txn of transactionsData) {
      // Check supplier reference
      if (txn.supplierId && !validSuppliers.has(txn.supplierId)) {
        missingReferences.push({
          id: txn.id,
          field: 'supplierId',
          missingId: txn.supplierId,
          description: `Transaction "${txn.rawDescription}" references missing supplier`
        })
      }
      
      // Check account reference
      if (txn.accountId && !validAccounts.has(txn.accountId)) {
        missingReferences.push({
          id: txn.id,
          field: 'accountId',
          missingId: txn.accountId,
          description: `Transaction "${txn.rawDescription}" references missing account`
        })
      }
      
      // Check invoice reference
      if (txn.sourceInvoiceId && !validInvoices.has(txn.sourceInvoiceId)) {
        missingReferences.push({
          id: txn.id,
          field: 'sourceInvoiceId',
          missingId: txn.sourceInvoiceId,
          description: `Transaction "${txn.rawDescription}" references missing invoice`
        })
      }
    }
    
    return {
      entity: 'transactions',
      totalRecords: transactionsData.length,
      orphanedRecords: missingReferences.length,
      missingReferences
    }
  }

  /**
   * Validate invoice relationships
   */
  private async validateInvoices(tenantId: string): Promise<ValidationResult> {
    const missingReferences: ValidationResult['missingReferences'] = []
    
    // Get all invoices
    const invoicesData = await this.db
      .select({
        id: invoices.id,
        supplierId: invoices.supplierId,
        invoiceNumber: invoices.invoiceNumber,
        lineItems: invoices.lineItems
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
    
    // Get valid IDs
    const [validSuppliers, validAccounts] = await Promise.all([
      this.getValidIds(tenantId, suppliers, 'id'),
      this.getValidIds(tenantId, accounts, 'id')
    ])
    
    // Check each invoice
    for (const invoice of invoicesData) {
      // Check supplier reference
      if (invoice.supplierId && !validSuppliers.has(invoice.supplierId)) {
        missingReferences.push({
          id: invoice.id,
          field: 'supplierId',
          missingId: invoice.supplierId,
          description: `Invoice "${invoice.invoiceNumber}" references missing supplier`
        })
      }
      
      // Check line item account references
      if (invoice.lineItems && Array.isArray(invoice.lineItems)) {
        invoice.lineItems.forEach((item: any, index: number) => {
          if (item.accountId && !validAccounts.has(item.accountId)) {
            missingReferences.push({
              id: invoice.id,
              field: `lineItems[${index}].accountId`,
              missingId: item.accountId,
              description: `Invoice "${invoice.invoiceNumber}" line ${index + 1} references missing account`
            })
          }
        })
      }
    }
    
    return {
      entity: 'invoices',
      totalRecords: invoicesData.length,
      orphanedRecords: missingReferences.length,
      missingReferences
    }
  }

  /**
   * Validate manual journal relationships
   */
  private async validateManualJournals(tenantId: string): Promise<ValidationResult> {
    const missingReferences: ValidationResult['missingReferences'] = []
    
    // Get all manual journals
    const journalsData = await this.db
      .select({
        id: manualJournals.id,
        journalNumber: manualJournals.journalNumber,
        journalLines: manualJournals.journalLines
      })
      .from(manualJournals)
      .where(eq(manualJournals.tenantId, tenantId))
    
    // Get valid accounts
    const validAccounts = await this.getValidIds(tenantId, accounts, 'id')
    
    // Check each journal
    for (const journal of journalsData) {
      // Check journal line account references
      if (journal.journalLines && Array.isArray(journal.journalLines)) {
        journal.journalLines.forEach((line: any, index: number) => {
          if (line.accountId && !validAccounts.has(line.accountId)) {
            missingReferences.push({
              id: journal.id,
              field: `journalLines[${index}].accountId`,
              missingId: line.accountId,
              description: `Journal "${journal.journalNumber}" line ${index + 1} references missing account`
            })
          }
        })
      }
    }
    
    return {
      entity: 'manualJournals',
      totalRecords: journalsData.length,
      orphanedRecords: missingReferences.length,
      missingReferences
    }
  }

  /**
   * Get valid IDs for a given table
   */
  private async getValidIds(
    tenantId: string, 
    table: any, 
    idField: string
  ): Promise<Set<string>> {
    const results = await this.db
      .select({ id: (table as any)[idField] })
      .from(table)
      .where(eq((table as any).tenantId, tenantId))
    
    return new Set(results.map(r => r.id))
  }

  /**
   * Fix orphaned references by setting them to null
   */
  async fixOrphanedReferences(
    tenantId: string,
    dryRun = true
  ): Promise<{ entity: string; fixed: number }[]> {
    const results: { entity: string; fixed: number }[] = []
    
    logger.info('Starting orphan fix', { tenantId, dryRun })
    
    // Fix orphaned transaction references
    const txnResult = await this.fixOrphanedTransactions(tenantId, dryRun)
    results.push({ entity: 'transactions', fixed: txnResult })
    
    // Fix orphaned invoice references
    const invResult = await this.fixOrphanedInvoices(tenantId, dryRun)
    results.push({ entity: 'invoices', fixed: invResult })
    
    logger.info('Orphan fix complete', { tenantId, dryRun, results })
    
    return results
  }

  /**
   * Fix orphaned transaction references
   */
  private async fixOrphanedTransactions(
    tenantId: string,
    dryRun: boolean
  ): Promise<number> {
    // Find transactions with invalid supplier references
    const orphanedSuppliers = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .leftJoin(suppliers, eq(transactions.supplierId, suppliers.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          isNull(suppliers.id),
          sql`${transactions.supplierId} IS NOT NULL`
        )
      )
    
    // Find transactions with invalid account references
    const orphanedAccounts = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          isNull(accounts.id),
          sql`${transactions.accountId} IS NOT NULL`
        )
      )
    
    // Find transactions with invalid invoice references
    const orphanedInvoices = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .leftJoin(invoices, eq(transactions.sourceInvoiceId, invoices.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          isNull(invoices.id),
          sql`${transactions.sourceInvoiceId} IS NOT NULL`
        )
      )
    
    const allOrphaned = new Set([
      ...orphanedSuppliers.map(r => r.id),
      ...orphanedAccounts.map(r => r.id),
      ...orphanedInvoices.map(r => r.id)
    ])
    
    if (!dryRun && allOrphaned.size > 0) {
      // Fix by setting invalid references to null
      for (const txnId of allOrphaned) {
        await this.db
          .update(transactions)
          .set({
            supplierId: sql`
              CASE 
                WHEN ${transactions.supplierId} IN (
                  SELECT ${transactions.supplierId} 
                  FROM ${transactions} t
                  LEFT JOIN ${suppliers} s ON t.supplier_id = s.id
                  WHERE t.id = ${txnId} AND s.id IS NULL
                ) THEN NULL 
                ELSE ${transactions.supplierId}
              END
            `,
            accountId: sql`
              CASE 
                WHEN ${transactions.accountId} IN (
                  SELECT ${transactions.accountId} 
                  FROM ${transactions} t
                  LEFT JOIN ${accounts} a ON t.account_id = a.id
                  WHERE t.id = ${txnId} AND a.id IS NULL
                ) THEN NULL 
                ELSE ${transactions.accountId}
              END
            `,
            sourceInvoiceId: sql`
              CASE 
                WHEN ${transactions.sourceInvoiceId} IN (
                  SELECT ${transactions.sourceInvoiceId} 
                  FROM ${transactions} t
                  LEFT JOIN ${invoices} i ON t.source_invoice_id = i.id
                  WHERE t.id = ${txnId} AND i.id IS NULL
                ) THEN NULL 
                ELSE ${transactions.sourceInvoiceId}
              END
            `,
            updatedAt: new Date()
          })
          .where(eq(transactions.id, txnId))
      }
    }
    
    return allOrphaned.size
  }

  /**
   * Fix orphaned invoice references
   */
  private async fixOrphanedInvoices(
    tenantId: string,
    dryRun: boolean
  ): Promise<number> {
    // Find invoices with invalid supplier references
    const orphanedSuppliers = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .leftJoin(suppliers, eq(invoices.supplierId, suppliers.id))
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          isNull(suppliers.id),
          sql`${invoices.supplierId} IS NOT NULL`
        )
      )
    
    if (!dryRun && orphanedSuppliers.length > 0) {
      // Fix by setting invalid references to null
      for (const invoice of orphanedSuppliers) {
        await this.db
          .update(invoices)
          .set({
            supplierId: null,
            updatedAt: new Date()
          })
          .where(eq(invoices.id, invoice.id))
      }
    }
    
    return orphanedSuppliers.length
  }
}