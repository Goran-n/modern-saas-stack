import * as crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { accounts, importBatches } from '../../../database/schema'
import { getDatabase } from '../../../database/connection'
import { XeroProvider } from '../../../integrations/accounting/xero/xero.provider'
import logger from '../../../config/logger'
import { Account, AccountType } from 'xero-node'

export interface ImportAccountsInput {
  integrationId: string
  tenantId: string
  xeroTenantId?: string
}

export interface ImportAccountsOutput {
  totalFetched: number
  created: number
  updated: number
  errors: number
  errorDetails: string[]
}

export class ImportAccountsUseCase {
  private db = getDatabase()
  
  constructor(
    private xeroProvider: XeroProvider
  ) {}

  async execute(input: ImportAccountsInput): Promise<ImportAccountsOutput> {
    const batchId = crypto.randomUUID()
    const startTime = Date.now()
    const errorDetails: string[] = []
    
    try {
      // Create import batch record
      await this.db.insert(importBatches).values({
          id: batchId,
          tenantId: input.tenantId,
          integrationId: input.integrationId,
          batchType: 'accounts',
          importSource: 'xero',
          status: 'processing',
          startedAt: new Date(),
          totalRecords: 0,
          processedRecords: 0,
          failedRecords: 0,
          duplicateRecords: 0
      })
      
      // Fetch all accounts from Xero
      logger.info('Fetching chart of accounts from Xero...')
      
      // Get tenant ID from provider or use provided one
      logger.info('Getting Xero tenant ID, current provider state:', {
        hasProvider: !!this.xeroProvider,
        providerType: this.xeroProvider?.constructor?.name
      })
      
      let xeroTenantId: string
      
      // Use provided xeroTenantId if available, otherwise try to get from provider
      if (input.xeroTenantId) {
        xeroTenantId = input.xeroTenantId
        logger.info('Using provided Xero tenant ID:', { xeroTenantId })
      } else {
        try {
          xeroTenantId = this.xeroProvider.getTenantId()
          logger.info('Successfully got tenant ID from provider:', { xeroTenantId })
        } catch (tenantError: any) {
          logger.error('Failed to get tenant ID:', { 
            error: tenantError?.message,
            stack: tenantError?.stack 
          })
          throw new Error(`Tenant ID not available: ${tenantError?.message}`)
        }
      }
      
      logger.info('Using Xero tenant ID:', { xeroTenantId })
      
      let xeroResponse: any
      try {
        // Use the XeroProvider's executeApiCall method
        xeroResponse = await this.xeroProvider.executeApiCall(
          async (api, tenantId) => {
            return await api.getAccounts(
              tenantId,
              undefined, // ifModifiedSince
              undefined, // where
              undefined  // order
            )
          }
        )
      } catch (apiError: any) {
        // Handle API errors
        logger.error('Xero API error when fetching accounts:', {
          message: apiError?.message,
          statusCode: apiError?.statusCode,
          body: apiError?.body,
          name: apiError?.name
        })
        
        throw apiError
      }
      
      try {
        
        const accountsList = xeroResponse.body?.accounts || []
        const totalFetched = accountsList.length
        
        logger.info(`Fetched ${totalFetched} accounts from Xero`)
        
        // Log first account to debug structure
        if (accountsList.length > 0) {
          logger.debug('First account structure:', accountsList[0])
        }
        
        // Get existing accounts
      const existingAccounts = await this.db
        .select({
          id: accounts.id,
          code: accounts.code,
          providerAccountIds: accounts.providerAccountIds
        })
        .from(accounts)
        .where(eq(accounts.tenantId, input.tenantId))
      
      // Create lookup maps
      const existingByCode = new Map<string, typeof existingAccounts[0]>()
      const existingByXeroId = new Map<string, typeof existingAccounts[0]>()
      
      existingAccounts.forEach((account: any) => {
        existingByCode.set(account.code, account)
        const xeroId = account.providerAccountIds?.xero
        if (xeroId) {
          existingByXeroId.set(xeroId, account)
        }
      })
      
      // Note: Hierarchy processing removed - not currently used
      
      // Process accounts in hierarchical order (parents first)
      const sortedAccounts = this.sortAccountsHierarchically(accountsList)
      
      let created = 0
      let updated = 0
      let errors = 0
      
      // Process accounts individually to maintain hierarchy
      for (const xeroAccount of sortedAccounts) {
        try {
          const result = await this.processAccount(
            xeroAccount,
            input.tenantId,
            input.integrationId,
            existingByCode,
            existingByXeroId
          )
          
          if (result.created) created++
          else if (result.updated) updated++
          
        } catch (error) {
          errors++
          const errorMessage = error instanceof Error ? error.message : String(error)
          const code = xeroAccount.code
          const name = xeroAccount.name
          errorDetails.push(
            `Account ${code} (${name}): ${errorMessage}`
          )
          logger.error('Error processing account:', { 
            account: code, 
            accountName: name,
            accountType: xeroAccount.type,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
          })
        }
      }
      
      // Finalize import batch
      await this.db
          .update(importBatches)
          .set({
            status: errors > 0 ? 'completed_with_errors' : 'completed',
            completedAt: new Date(),
            totalRecords: totalFetched,
            processedRecords: totalFetched,
            failedRecords: errors
          })
          .where(eq(importBatches.id, batchId))
      
      logger.info('Account import completed', {
        totalFetched,
        created,
        updated,
        errors,
        duration: Date.now() - startTime
      })
      
        return {
          totalFetched,
          created,
          updated,
          errors,
          errorDetails
        }
      } catch (apiError: any) {
        // Handle xero-node API errors
        logger.error('Xero API error:', {
          status: apiError?.response?.statusCode,
          body: apiError?.body,
          message: apiError?.message
        })
        throw new Error(`Failed to fetch accounts: ${apiError?.message || 'Unknown error'}`)
      }
      
    } catch (error) {
      logger.error('Failed to import accounts:', error)
      
        await this.db
          .update(importBatches)
          .set({
            status: 'failed',
            completedAt: new Date(),
            failedRecords: 1
          })
          .where(eq(importBatches.id, batchId))
      
      throw error
    }
  }
  
  private sortAccountsHierarchically(accountsList: Account[]): Account[] {
    // Separate accounts into system accounts and regular accounts
    const systemAccounts = accountsList.filter(acc => acc.systemAccount)
    const regularAccounts = accountsList.filter(acc => !acc.systemAccount)
    
    // Sort regular accounts by class (to ensure parents come before children)
    regularAccounts.sort((a, b) => {
      const classOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
      const aClass = a._class ? String(a._class) : ''
      const bClass = b._class ? String(b._class) : ''
      const aIndex = classOrder.indexOf(aClass)
      const bIndex = classOrder.indexOf(bClass)
      return aIndex - bIndex
    })
    
    // System accounts first, then regular accounts
    return [...systemAccounts, ...regularAccounts]
  }
  
  private async processAccount(
    xeroAccount: Account,
    tenantId: string,
    _integrationId: string,
    existingByCode: Map<string, any>,
    existingByXeroId: Map<string, any>
  ): Promise<{ created: boolean; updated: boolean }> {
    const accountId = xeroAccount.accountID
    if (!accountId) {
      throw new Error('Account missing AccountID')
    }
    
    // Check if account exists
    const code = xeroAccount.code
    const existingByCodeMatch = code ? existingByCode.get(code) : null
    const existingByIdMatch = existingByXeroId.get(accountId)
    const existing = existingByCodeMatch || existingByIdMatch
    
    const accountData = this.mapXeroAccountToAccount(
      xeroAccount,
      tenantId
    )
    
    if (existing) {
      // Update existing account
      await this.db
          .update(accounts)
          .set({
            ...accountData,
            // Preserve the ID and merge provider IDs
            providerAccountIds: {
              ...(existing.providerAccountIds || {}),
              xero: accountId
            },
            updatedAt: new Date()
          })
          .where(eq(accounts.id, existing.id))
          
        return { created: false, updated: true }
      } else {
      // Create new account
      await this.db.insert(accounts).values({
        ...accountData,
        id: crypto.randomUUID(),
        providerAccountIds: {
          xero: accountId
        }
      })
      
      return { created: true, updated: false }
    }
    
    return { created: !existing, updated: !!existing }
  }
  
  private mapXeroAccountToAccount(xeroAccount: Account, tenantId: string): any {
    // Map Xero account types to our schema
    const accountTypeMap: Record<string, string> = {
      [AccountType.BANK]: 'ASSET',
      [AccountType.CURRENT]: 'ASSET',
      [AccountType.CURRLIAB]: 'LIABILITY',
      [AccountType.DEPRECIATN]: 'EXPENSE',
      [AccountType.DIRECTCOSTS]: 'EXPENSE',
      [AccountType.EQUITY]: 'EQUITY',
      [AccountType.EXPENSE]: 'EXPENSE',
      [AccountType.FIXED]: 'ASSET',
      [AccountType.INVENTORY]: 'ASSET',
      [AccountType.LIABILITY]: 'LIABILITY',
      [AccountType.NONCURRENT]: 'ASSET',
      [AccountType.OTHERINCOME]: 'REVENUE',
      [AccountType.OVERHEADS]: 'EXPENSE',
      [AccountType.PREPAYMENT]: 'ASSET',
      [AccountType.REVENUE]: 'REVENUE',
      [AccountType.SALES]: 'REVENUE',
      [AccountType.TERMLIAB]: 'LIABILITY',
      [AccountType.PAYG]: 'EXPENSE'
    }
    
    // Use proper xero-node properties
    const type = xeroAccount.type
    const accountType = accountTypeMap[type || ''] || 'ASSET'
    
    // Generate a code if not provided (use a combination of type and name)
    const name = xeroAccount.name || ''
    const code = xeroAccount.code || 
                 `${type}-${name}`.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50)
    
    return {
      tenantId,
      code,
      name,
      description: xeroAccount.description,
      accountType,
      accountSubtype: type,
      accountClass: xeroAccount._class,
      
      // Bank account fields
      isBankAccount: type === AccountType.BANK,
      bankAccountType: xeroAccount.bankAccountType,
      currencyCode: xeroAccount.currencyCode,
      
      // Tax fields
      taxType: xeroAccount.taxType,
      defaultTaxCode: xeroAccount.taxType,
      
      // Status fields
      isActive: String(xeroAccount.status) === 'ACTIVE',
      isSystemAccount: xeroAccount.systemAccount || false,
      
      // Xero-specific fields
      enablePaymentsToAccount: xeroAccount.enablePaymentsToAccount,
      showInExpenseClaims: xeroAccount.showInExpenseClaims,
      reportingCode: xeroAccount.reportingCode,
      reportingCategory: xeroAccount.reportingCodeName,
      
      // Sync metadata
      providerSyncData: {
        xero: {
          accountID: xeroAccount.accountID,
          status: xeroAccount.status,
          hasAttachments: xeroAccount.hasAttachments || false,
          updatedDateUTC: xeroAccount.updatedDateUTC,
          addToWatchlist: xeroAccount.addToWatchlist || false
        }
      },
      
      metadata: {
        xeroType: type,
        xeroClass: xeroAccount._class,
        systemAccount: xeroAccount.systemAccount || false
      },
      
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncedAt: new Date()
    }
  }
}