import { XeroClient, AccountingApi, Account, Contact, Invoice, BankTransaction, ManualJournal, CreditNote, Prepayment, Overpayment } from 'xero-node'
import logger from '../../../config/logger'
import { safeXeroApiCall } from './xero-error-handler'
import { RequestContextManager } from '../../../core/context/request-context'
import { getTokenConfig } from '../../../config/sync.config'

export interface XeroConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface XeroCredentials {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

/**
 * Xero provider that relies on request context for all state
 * Uses request-scoped isolation to prevent state leakage between requests
 */
export class XeroProvider {
  private readonly config: XeroConfig

  constructor(config: XeroConfig) {
    this.config = config
  }

  /**
   * Creates a new XeroClient instance configured with the current request context
   * Each request gets its own isolated client instance
   */
  private createClient(): XeroClient {
    const context = RequestContextManager.getXeroContext()
    
    const client = new XeroClient({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUris: [this.config.redirectUri],
      scopes: this.config.scopes
    })

    // Set the token from context
    client.setTokenSet({
      access_token: context.credentials.accessToken,
      refresh_token: context.credentials.refreshToken,
      expires_in: context.credentials.expiresIn,
      token_type: context.credentials.tokenType,
      id_token: '',
      scope: this.config.scopes.join(' ')
    })

    return client
  }

  /**
   * Get tenant info using the current context credentials
   */
  async getTenantInfo(): Promise<any> {
    const client = this.createClient()
    
    const tenants = await safeXeroApiCall(
      () => client.updateTenants(),
      'updateTenants'
    )
    
    if (!tenants || tenants.length === 0) {
      throw new Error('No Xero tenants found')
    }
    
    return tenants[0]
  }

  /**
   * Get the accounting API configured for the current context
   */
  getAccountingApi(): AccountingApi {
    const context = RequestContextManager.getXeroContext()
    const client = this.createClient()
    
    const api = client.accountingApi
    api.accessToken = context.credentials.accessToken
    
    return api
  }

  /**
   * Get the tenant ID from the current context
   */
  getTenantId(): string {
    const context = RequestContextManager.getXeroContext()
    return context.xeroTenantId
  }

  /**
   * Refresh the access token and return new credentials
   * This does NOT update any state - caller is responsible for persisting
   */
  async refreshAccessToken(currentRefreshToken: string): Promise<XeroCredentials> {
    try {
      logger.info('Attempting to refresh Xero access token')
      
      // Create a minimal client just for refresh
      const client = new XeroClient({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        redirectUris: [this.config.redirectUri],
        scopes: this.config.scopes
      })
      
      const tokenSet = await safeXeroApiCall(
        () => client.refreshWithRefreshToken(
          this.config.clientId,
          this.config.clientSecret,
          currentRefreshToken
        ),
        'refreshAccessToken'
      )

      if (!tokenSet?.access_token) {
        throw new Error('Refresh response did not contain access token')
      }

      logger.info('Xero access token refreshed successfully', {
        hasAccessToken: !!tokenSet.access_token,
        hasRefreshToken: !!tokenSet.refresh_token,
        expiresIn: tokenSet.expires_in
      })

      return {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token || currentRefreshToken,
        expiresIn: tokenSet.expires_in || getTokenConfig().defaultExpirySeconds,
        tokenType: tokenSet.token_type || 'Bearer'
      }
    } catch (error: any) {
      logger.error('Failed to refresh Xero access token', { 
        error: error?.message,
        code: error?.code,
        statusCode: error?.statusCode 
      })
      
      if (error?.message?.includes('invalid_grant') || error?.message?.includes('refresh_token')) {
        throw new Error('Refresh token is invalid or expired. Re-authentication required.')
      }
      
      throw error
    }
  }

  /**
   * Check if the current context's token needs refresh
   * Returns the seconds until expiry (negative if expired)
   */
  getTokenExpirySeconds(): number {
    const context = RequestContextManager.getXeroContext()
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + context.credentials.expiresIn
    
    return expiresAt - now
  }

  /**
   * Check if token needs refresh (with configurable buffer)
   */
  needsTokenRefresh(): boolean {
    const secondsUntilExpiry = this.getTokenExpirySeconds()
    const config = getTokenConfig()
    
    return secondsUntilExpiry <= config.refreshBufferSeconds
  }

  /**
   * Execute an API call with automatic retry and error handling
   */
  async executeApiCall<T>(
    apiCall: (api: AccountingApi, tenantId: string) => Promise<T>
  ): Promise<T> {
    const context = RequestContextManager.getXeroContext()
    
    // Validate required context
    if (!context.credentials?.accessToken) {
      logger.error('Missing required access token in Xero context', {
        hasContext: !!context,
        hasCredentials: !!context.credentials,
        contextKeys: Object.keys(context)
      })
      throw new Error('Required access token not provided in context. Ensure token refresh was successful.')
    }
    
    if (!context.xeroTenantId) {
      logger.error('Missing required Xero tenant ID in context', {
        hasContext: !!context,
        contextKeys: Object.keys(context)
      })
      throw new Error('Required Xero tenant ID not provided in context.')
    }
    
    const api = this.getAccountingApi()
    
    logger.debug('Executing Xero API call', {
      hasToken: !!api.accessToken,
      tenantId: context.xeroTenantId,
      tokenLength: context.credentials.accessToken?.length
    })
    
    return safeXeroApiCall(
      () => apiCall(api, context.xeroTenantId),
      'executeApiCall'
    )
  }

  /**
   * Test connection to Xero by fetching organisation info
   */
  async testConnection(): Promise<any> {
    return this.executeApiCall(async (api, tenantId) => {
      const response = await api.getOrganisations(tenantId)
      if (!response.body?.organisations?.length) {
        throw new Error('No organisations found')
      }
      return response.body.organisations[0]
    })
  }

  /**
   * Fetch accounts (Chart of Accounts) from Xero
   */
  async fetchAccounts(options?: { includeArchived?: boolean }): Promise<Account[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const response = await api.getAccounts(tenantId)
      let accounts = response.body?.accounts || []
      
      // Filter out archived accounts if requested
      if (!options?.includeArchived) {
        accounts = accounts.filter(account => account.status === Account.StatusEnum.ACTIVE)
      }
      
      return accounts
    })
  }

  /**
   * Fetch suppliers/contacts from Xero
   */
  async fetchSuppliers(options?: { includeArchived?: boolean }): Promise<any[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const response = await api.getContacts(tenantId)
      let contacts = response.body?.contacts || []
      
      // Filter out archived contacts if requested
      if (!options?.includeArchived) {
        contacts = contacts.filter(contact => 
          contact.contactStatus === Contact.ContactStatusEnum.ACTIVE
        )
      }
      
      // Add helper properties
      return contacts.map(contact => ({
        ...contact,
        isActive: contact.contactStatus === Contact.ContactStatusEnum.ACTIVE,
        isSupplier: contact.isSupplier || false,
        isCustomer: contact.isCustomer || false
      }))
    })
  }

  /**
   * Fetch invoices from Xero
   */
  async fetchInvoices(options?: { 
    invoiceTypes?: string[], 
    statuses?: string[],
    dateFrom?: Date,
    dateTo?: Date 
  }): Promise<Invoice[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const where: string[] = []
      
      if (options?.invoiceTypes?.length) {
        const types = options.invoiceTypes.map(t => `Type="${t}"`).join(' OR ')
        where.push(`(${types})`)
      }
      
      if (options?.statuses?.length) {
        const statuses = options.statuses.map(s => `Status="${s}"`).join(' OR ')
        where.push(`(${statuses})`)
      }
      
      if (options?.dateFrom) {
        where.push(`Date>=DateTime(${options.dateFrom.getFullYear()},${options.dateFrom.getMonth() + 1},${options.dateFrom.getDate()})`)
      }
      
      if (options?.dateTo) {
        where.push(`Date<=DateTime(${options.dateTo.getFullYear()},${options.dateTo.getMonth() + 1},${options.dateTo.getDate()})`)
      }
      
      const whereClause = where.length > 0 ? where.join(' AND ') : undefined
      
      const response = await api.getInvoices(
        tenantId, 
        undefined, // modifiedAfter
        whereClause,
        undefined, // order
        undefined, // IDs
        undefined, // invoiceNumbers
        undefined, // contactIDs
        undefined, // statuses
        undefined, // page
        undefined, // includeArchived
        undefined, // createdByMyApp
        undefined  // unitdp
      )
      
      return response.body?.invoices || []
    })
  }

  /**
   * Fetch bank transactions from Xero
   */
  async fetchTransactions(options?: { 
    dateFrom?: Date,
    dateTo?: Date,
    bankAccountId?: string 
  }): Promise<BankTransaction[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const where: string[] = []
      
      if (options?.dateFrom) {
        where.push(`Date>=DateTime(${options.dateFrom.getFullYear()},${options.dateFrom.getMonth() + 1},${options.dateFrom.getDate()})`)
      }
      
      if (options?.dateTo) {
        where.push(`Date<=DateTime(${options.dateTo.getFullYear()},${options.dateTo.getMonth() + 1},${options.dateTo.getDate()})`)
      }
      
      if (options?.bankAccountId) {
        where.push(`BankAccount.AccountID=Guid("${options.bankAccountId}")`)
      }
      
      const whereClause = where.length > 0 ? where.join(' AND ') : undefined
      
      const response = await api.getBankTransactions(
        tenantId,
        undefined, // modifiedAfter
        whereClause,
        undefined, // order
        undefined, // page
        undefined  // unitdp
      )
      
      return response.body?.bankTransactions || []
    })
  }

  /**
   * Fetch manual journals from Xero
   */
  async fetchManualJournals(options?: { 
    dateFrom?: Date,
    dateTo?: Date 
  }): Promise<ManualJournal[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const where: string[] = []
      
      if (options?.dateFrom) {
        where.push(`Date>=DateTime(${options.dateFrom.getFullYear()},${options.dateFrom.getMonth() + 1},${options.dateFrom.getDate()})`)
      }
      
      if (options?.dateTo) {
        where.push(`Date<=DateTime(${options.dateTo.getFullYear()},${options.dateTo.getMonth() + 1},${options.dateTo.getDate()})`)
      }
      
      const whereClause = where.length > 0 ? where.join(' AND ') : undefined
      
      const response = await api.getManualJournals(
        tenantId,
        undefined, // modifiedAfter
        whereClause,
        undefined, // order
        undefined  // page
      )
      
      return response.body?.manualJournals || []
    })
  }

  /**
   * Fetch bank statements from Xero
   */
  async fetchBankStatements(options?: { 
    fromDate?: Date,
    toDate?: Date,
    bankAccountId?: string 
  }): Promise<any[]> {
    return this.executeApiCall(async (api, tenantId) => {
      // First get all bank accounts if no specific account requested
      const accountsResponse = await api.getAccounts(
        tenantId,
        undefined, // modifiedAfter
        'Type="BANK"', // where
        undefined // order
      )
      
      const bankAccounts = accountsResponse.body?.accounts || []
      const accountIds = options?.bankAccountId 
        ? [options.bankAccountId] 
        : bankAccounts.map(acc => acc.accountID).filter(Boolean)
      
      // Fetch statements for each bank account
      const allStatements: any[] = []
      
      for (const accountId of accountIds) {
        try {
          // Fetch bank statements using getBankTransactions with account filter
          const where: string[] = []
          where.push(`BankAccount.AccountID=Guid("${accountId}")`)
          
          if (options?.fromDate) {
            where.push(`Date>=DateTime(${options.fromDate.getFullYear()},${options.fromDate.getMonth() + 1},${options.fromDate.getDate()})`)
          }
          
          if (options?.toDate) {
            where.push(`Date<=DateTime(${options.toDate.getFullYear()},${options.toDate.getMonth() + 1},${options.toDate.getDate()})`)
          }
          
          const response = await api.getBankTransactions(
            tenantId,
            undefined, // modifiedAfter
            where.join(' AND '),
            undefined, // order
            undefined, // page
            undefined  // unitdp
          )
          
          if (response.body?.bankTransactions) {
            // Group transactions by account to create statement-like structure
            const statement = {
              statementId: accountId,
              bankAccountId: accountId,
              statementLines: response.body.bankTransactions
            }
            allStatements.push(statement)
          }
        } catch (error) {
          logger.warn(`Failed to fetch statements for account ${accountId}`, { error })
        }
      }
      
      return allStatements
    })
  }

  /**
   * Fetch credit notes from Xero
   */
  async fetchCreditNotes(options?: { 
    dateFrom?: Date,
    dateTo?: Date,
    statuses?: string[] 
  }): Promise<CreditNote[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const where: string[] = []
      
      if (options?.dateFrom) {
        where.push(`Date>=DateTime(${options.dateFrom.getFullYear()},${options.dateFrom.getMonth() + 1},${options.dateFrom.getDate()})`)
      }
      
      if (options?.dateTo) {
        where.push(`Date<=DateTime(${options.dateTo.getFullYear()},${options.dateTo.getMonth() + 1},${options.dateTo.getDate()})`)
      }
      
      if (options?.statuses?.length) {
        const statuses = options.statuses.map(s => `Status="${s}"`).join(' OR ')
        where.push(`(${statuses})`)
      }
      
      const whereClause = where.length > 0 ? where.join(' AND ') : undefined
      
      const response = await api.getCreditNotes(
        tenantId,
        undefined, // modifiedAfter
        whereClause,
        undefined, // order
        undefined, // page
        undefined  // unitdp
      )
      
      return response.body?.creditNotes || []
    })
  }

  /**
   * Fetch prepayments from Xero
   */
  async fetchPrepayments(options?: { 
    dateFrom?: Date,
    dateTo?: Date 
  }): Promise<Prepayment[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const where: string[] = []
      
      if (options?.dateFrom) {
        where.push(`Date>=DateTime(${options.dateFrom.getFullYear()},${options.dateFrom.getMonth() + 1},${options.dateFrom.getDate()})`)
      }
      
      if (options?.dateTo) {
        where.push(`Date<=DateTime(${options.dateTo.getFullYear()},${options.dateTo.getMonth() + 1},${options.dateTo.getDate()})`)
      }
      
      const whereClause = where.length > 0 ? where.join(' AND ') : undefined
      
      const response = await api.getPrepayments(
        tenantId,
        undefined, // modifiedAfter
        whereClause,
        undefined, // order
        undefined, // page
        undefined  // unitdp
      )
      
      return response.body?.prepayments || []
    })
  }

  /**
   * Fetch overpayments from Xero
   */
  async fetchOverpayments(options?: { 
    dateFrom?: Date,
    dateTo?: Date 
  }): Promise<Overpayment[]> {
    return this.executeApiCall(async (api, tenantId) => {
      const where: string[] = []
      
      if (options?.dateFrom) {
        where.push(`Date>=DateTime(${options.dateFrom.getFullYear()},${options.dateFrom.getMonth() + 1},${options.dateFrom.getDate()})`)
      }
      
      if (options?.dateTo) {
        where.push(`Date<=DateTime(${options.dateTo.getFullYear()},${options.dateTo.getMonth() + 1},${options.dateTo.getDate()})`)
      }
      
      const whereClause = where.length > 0 ? where.join(' AND ') : undefined
      
      const response = await api.getOverpayments(
        tenantId,
        undefined, // modifiedAfter
        whereClause,
        undefined, // order
        undefined, // page
        undefined  // unitdp
      )
      
      return response.body?.overpayments || []
    })
  }
}