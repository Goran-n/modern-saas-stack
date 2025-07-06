import { eq, and, inArray } from 'drizzle-orm'
import { bankStatements, importBatches, accounts, suppliers } from '../../../database/schema'
import { getDatabase } from '../../../database/connection'
import { XeroProvider } from '../../../integrations/accounting/xero/xero.provider'
import logger from '../../../config/logger'
import { BankTransaction } from 'xero-node'
import * as crypto from 'crypto'

export interface ImportBankStatementsInput {
  integrationId: string
  tenantId: string
  options?: {
    accountIds?: string[]
    modifiedSince?: Date
    fromDate?: Date
    toDate?: Date
    dryRun?: boolean
  }
}

export interface ImportBankStatementsOutput {
  totalFetched: number
  created: number
  updated: number
  skipped: number
  errors: number
  errorDetails: string[]
}

export class ImportBankStatementsUseCase {
  private db = getDatabase()
  
  constructor(
    private xeroProvider: XeroProvider
  ) {}

  async execute(input: ImportBankStatementsInput): Promise<ImportBankStatementsOutput> {
    const startTime = Date.now()
    const errorDetails: string[] = []
    let actualBatchId: string | undefined
    
    try {
      // Create import batch record
      const [importBatch] = await this.db.insert(importBatches).values({
        tenantId: input.tenantId,
        integrationId: input.integrationId,
        batchType: 'bank_statements',
        importSource: 'xero',
        status: 'processing',
        startedAt: new Date(),
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        duplicateRecords: 0,
        importConfig: {}
      }).returning({ id: importBatches.id })
      
      actualBatchId = importBatch.id
      
      // Get bank accounts
      const bankAccounts = await this.getBankAccounts(input.tenantId, input.options?.accountIds)
      
      if (bankAccounts.length === 0) {
        logger.warn('No bank accounts found to import statements for')
        return {
          totalFetched: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
          errorDetails: []
        }
      }
      
      logger.info(`Found ${bankAccounts.length} bank accounts to process`)
      
      // Get supplier lookup for matching
      const supplierLookup = await this.getSupplierLookup(input.tenantId)
      
      // Process each bank account
      let totalFetched = 0
      let totalCreated = 0
      let totalUpdated = 0
      let totalSkipped = 0
      let totalErrors = 0
      
      for (const account of bankAccounts) {
        try {
          logger.info(`Fetching statements for account: ${account.name} (${account.code})`)
          
          const xeroAccountId = account.providerAccountIds?.xero
          if (!xeroAccountId) {
            logger.warn(`Account ${account.code} has no Xero ID, skipping`)
            continue
          }
          
          // Fetch bank transactions from Xero
          const transactions = await this.fetchBankTransactions(
            xeroAccountId,
            input.options?.modifiedSince,
            input.options?.fromDate,
            input.options?.toDate
          )
          
          totalFetched += transactions.length
          logger.info(`Fetched ${transactions.length} transactions for account ${account.code}`)
          
          // Process transactions in batches
          const batchSize = 100
          for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize)
            
            const result = await this.processBatch(
              batch,
              account,
              input.tenantId,
              input.integrationId,
              supplierLookup,
              input.options?.dryRun || false
            )
            
            totalCreated += result.created
            totalUpdated += result.updated
            totalSkipped += result.skipped
            totalErrors += result.errors
            errorDetails.push(...result.errorDetails)
          }
          
        } catch (error) {
          logger.error(`Error processing account ${account.code}:`, error)
          totalErrors++
          errorDetails.push(
            `Account ${account.code}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }
      
      // Finalize import batch
      if (!input.options?.dryRun) {
        await this.db
          .update(importBatches)
          .set({
            status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
            completedAt: new Date(),
            totalRecords: totalFetched,
            processedRecords: totalFetched,
            failedRecords: totalErrors,
            importResults: {
              created: totalCreated,
              updated: totalUpdated,
              ...(errorDetails.length > 0 && { errors: errorDetails.map(detail => ({ message: detail })) })
            }
          })
          .where(eq(importBatches.id, actualBatchId))
      }
      
      logger.info('Bank statement import completed', {
        totalFetched,
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: totalErrors,
        duration: Date.now() - startTime
      })
      
      return {
        totalFetched,
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: totalErrors,
        errorDetails
      }
      
    } catch (error) {
      logger.error('Failed to import bank statements:', error)
      
      if (!input.options?.dryRun && actualBatchId) {
        await this.db
          .update(importBatches)
          .set({
            status: 'failed',
            completedAt: new Date(),
            errorLog: [{
              error: error instanceof Error ? error.message : String(error)
            }]
          })
          .where(eq(importBatches.id, actualBatchId))
      }
      
      throw error
    }
  }
  
  private async getBankAccounts(tenantId: string, accountIds?: string[]): Promise<any[]> {
    let whereConditions = and(
      eq(accounts.tenantId, tenantId),
      eq(accounts.isBankAccount, true),
      eq(accounts.isActive, true)
    )
    
    if (accountIds && accountIds.length > 0) {
      whereConditions = and(
        whereConditions,
        inArray(accounts.id, accountIds)
      )
    }
    
    return await this.db
      .select()
      .from(accounts)
      .where(whereConditions)
  }
  
  private async fetchBankTransactions(
    accountId: string,
    modifiedSince?: Date,
    _fromDate?: Date,
    _toDate?: Date
  ): Promise<any[]> {
    const allTransactions: any[] = []
    let page = 1
    let hasMore = true
    
    while (hasMore) {
      try {
        // Use the XeroProvider's executeApiCall method
        const response = await this.xeroProvider.executeApiCall(
          async (api, tenantId) => {
            // Build where clause for bank account
            const where = accountId ? `BankAccount.AccountID="${accountId}"` : undefined
            
            // Call the official API method
            return await api.getBankTransactions(
              tenantId,
              modifiedSince,
              where,
              undefined, // order
              page,
              undefined, // unitdp
              100 // pageSize
            )
          }
        )
        
        if (response.body?.bankTransactions) {
          allTransactions.push(...response.body.bankTransactions)
        }
        
        // Check if there are more pages
        hasMore = response.body?.bankTransactions?.length === 100
        page++
      } catch (error) {
        logger.error('Error fetching bank transactions page', { page, error })
        throw error
      }
    }
    
    return allTransactions
  }
  
  private async getSupplierLookup(tenantId: string): Promise<{ byXeroId: Map<string, string>; byName: Map<string, string>; byCleanName: Map<string, string> }> {
    const suppliersList = await this.db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        externalIds: suppliers.externalIds
      })
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
    
    // Create multiple lookups for better matching
    const byXeroId = new Map<string, string>()
    const byName = new Map<string, string>()
    const byCleanName = new Map<string, string>()
    
    suppliersList.forEach(supplier => {
      const xeroId = supplier.externalIds?.find((ext: any) => ext.system === 'xero')?.id
      if (xeroId) {
        byXeroId.set(xeroId, supplier.id)
      }
      
      byName.set(supplier.name.toLowerCase(), supplier.id)
      
      // Clean name for fuzzy matching
      const cleanName = supplier.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
      if (cleanName) {
        byCleanName.set(cleanName, supplier.id)
      }
    })
    
    return { byXeroId, byName, byCleanName }
  }
  
  private async processBatch(
    transactions: BankTransaction[],
    account: any,
    tenantId: string,
    integrationId: string,
    supplierLookup: { byXeroId: Map<string, string>; byName: Map<string, string>; byCleanName: Map<string, string> },
    dryRun: boolean
  ): Promise<{ created: number; updated: number; skipped: number; errors: number; errorDetails: string[] }> {
    let created = 0
    const updated = 0
    let skipped = 0
    let errors = 0
    const errorDetails: string[] = []
    
    // Get existing statements for duplicate detection
    const transactionIds = transactions
      .map(t => t.bankTransactionID)
      .filter((id): id is string => !!id)
    
    const existingStatements = await this.db
      .select({
        id: bankStatements.id,
        transactionId: bankStatements.transactionId,
        dedupKey: bankStatements.dedupKey
      })
      .from(bankStatements)
      .where(
        and(
          eq(bankStatements.tenantId, tenantId),
          inArray(bankStatements.transactionId, transactionIds)
        )
      )
    
    const existingByTransactionId = new Map(
      existingStatements.map(s => [s.transactionId, s])
    )
    
    const toCreate: any[] = []
    // const toUpdate: { id: string; data: any }[] = []
    
    for (const transaction of transactions) {
      try {
        if (!transaction.bankTransactionID) {
          errors++
          errorDetails.push('Transaction missing bankTransactionID')
          continue
        }
        
        const existing = existingByTransactionId.get(transaction.bankTransactionID)
        
        if (existing) {
          // Skip if already exists (we don't update bank statements)
          skipped++
          continue
        }
        
        const statementData = this.mapXeroTransactionToStatement(
          transaction,
          account,
          tenantId,
          integrationId,
          supplierLookup
        )
        
        toCreate.push({
          ...statementData,
          id: crypto.randomUUID()
        })
        
      } catch (error) {
        errors++
        errorDetails.push(
          `Transaction ${transaction.reference || transaction.bankTransactionID}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
    
    if (!dryRun && toCreate.length > 0) {
      await this.db.insert(bankStatements).values(toCreate)
      created = toCreate.length
    } else if (dryRun) {
      created = toCreate.length
    }
    
    return { created, updated, skipped, errors, errorDetails }
  }
  
  private mapXeroTransactionToStatement(
    transaction: BankTransaction,
    account: any,
    tenantId: string,
    integrationId: string,
    supplierLookup: { byXeroId: Map<string, string>; byName: Map<string, string>; byCleanName: Map<string, string> }
  ): any {
    // Create dedup key
    const dedupKey = crypto.createHash('md5')
      .update(`${account.id}-${transaction.date}-${transaction.total}-${transaction.reference || ''}`)
      .digest('hex')
    
    // Try to match supplier
    let suggestedSupplierId: string | undefined
    if (transaction.contact?.contactID) {
      suggestedSupplierId = supplierLookup.byXeroId.get(transaction.contact.contactID)
    }
    
    // Extract merchant information
    const merchantName = transaction.contact?.name || 
                        transaction.reference?.split(/[*#]/)[0]?.trim() ||
                        ''
    
    // Clean merchant name for matching
    const merchantCleanName = merchantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    
    if (!suggestedSupplierId && merchantCleanName) {
      suggestedSupplierId = supplierLookup.byCleanName.get(merchantCleanName) ||
                           supplierLookup.byName.get(merchantName.toLowerCase())
    }
    
    // Determine transaction type
    const isDebit = (transaction.total || 0) < 0
    const transactionType = isDebit ? 'debit' : 'credit'
    
    return {
      tenantId,
      importSource: 'xero',
      integrationId,
      institutionName: account.name,
      accountIdentifier: account.code,
      accountType: account.bankAccountType,
      accountCurrency: transaction.currencyCode || 'USD',
      
      // Transaction details
      transactionDate: transaction.date ? new Date(transaction.date) : new Date(),
      postedDate: transaction.date ? new Date(transaction.date) : new Date(),
      description: this.buildDescription(transaction),
      amount: Math.abs(transaction.total || 0).toFixed(6),
      transactionType,
      
      // Reference information
      referenceNumber: transaction.reference,
      transactionId: transaction.bankTransactionID,
      
      // Merchant information
      merchantName,
      merchantCleanName: merchantCleanName || undefined,
      
      // Categorization hints
      suggestedSupplierId,
      bankCategory: transaction.type,
      
      // Deduplication
      dedupKey,
      isDuplicate: false,
      
      // Raw data
      rawData: {
        xero: {
          bankTransactionID: transaction.bankTransactionID,
          type: transaction.type,
          status: transaction.status,
          lineItems: transaction.lineItems,
          subTotal: transaction.subTotal,
          totalTax: transaction.totalTax,
          total: transaction.total,
          updatedDateUTC: transaction.updatedDateUTC,
          hasAttachments: transaction.hasAttachments || false,
          isReconciled: transaction.isReconciled || false
        }
      },
      
      // Processing metadata
      parsingMetadata: {
        source: 'xero_api',
        importBatchId: integrationId,
        parsedAt: new Date().toISOString()
      },
      
      metadata: {
        currencyRate: transaction.currencyRate,
        bankAccount: transaction.bankAccount,
        prepayment: transaction.prepaymentID ? { id: transaction.prepaymentID } : undefined,
        overpayment: transaction.overpaymentID ? { id: transaction.overpaymentID } : undefined
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  private buildDescription(transaction: BankTransaction): string {
    const parts: string[] = []
    
    // Add contact name if available
    if (transaction.contact?.name) {
      parts.push(transaction.contact.name)
    }
    
    // Add reference if different from contact
    if (transaction.reference && transaction.reference !== transaction.contact?.name) {
      parts.push(transaction.reference)
    }
    
    // Add line item descriptions
    if (transaction.lineItems && transaction.lineItems.length > 0) {
      const descriptions = transaction.lineItems
        .map(item => item.description)
        .filter(desc => desc && desc.trim())
        .join('; ')
      
      if (descriptions) {
        parts.push(descriptions)
      }
    }
    
    return parts.join(' - ') || 'Bank Transaction'
  }
}