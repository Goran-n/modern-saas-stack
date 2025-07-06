import { TransactionEntity } from '../../domain/transaction/index'
import { SyncJobEntity } from '../../domain/sync-job/index'
import { IntegrationEntity } from '../../domain/integration/index'
import { EntityId } from '../../domain/shared/value-objects/entity-id'
import { RequestContextManager } from '../../context/request-context'
import { TokenManagementService } from '../../services/token-management.service'
import { EntityLookupService, type EntityLookupMaps } from '../../services/entity-lookup.service'
import { getXeroSyncConfig, getBatchConfig } from '../../../config/sync.config'
import { telemetry } from '../../../shared/monitoring/telemetry'
import { ErrorHandler, wrapWithRetry } from '../../errors/error-handler'
import { 
  ProviderApiError, 
  RateLimitError,
  DataValidationError 
} from '../../errors/sync-errors'
import { NotFoundError } from '../../../shared/errors/domain.errors'
import type { 
  TransactionRepository,
  SyncJobRepository,
  IntegrationRepository
} from '../../ports/index'
import logger from '@vepler/logger'
import { XeroProvider } from '../../../integrations/accounting/xero/xero.provider'
import type { BankTransaction } from 'xero-node'

export interface ProviderTransaction {
  providerTransactionId: string
  transactionDate: Date
  postedDate?: Date
  amount: string
  currency: string
  description?: string
  reference?: string
  accountId?: string
  accountName?: string
  accountType?: string
  balanceAfter?: string
  providerData: Record<string, unknown>
}

export interface ImportTransactionsInput {
  integrationId: string
  tenantId: string
  syncJobId: string
  accountIds?: string[]
  dateFrom?: Date
  dateTo?: Date
}

export interface ImportTransactionsOutput {
  transactionsImported: number
  transactionsUpdated: number
  transactionsSkipped: number
  errors: string[]
}

/**
 * Import Transactions Use Case with proper architecture
 * - Uses request context for state isolation
 * - Unified token management
 * - Standardized error handling
 * - Entity linking service for relationships
 */
export class ImportTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly syncJobRepository: SyncJobRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly tokenManagementService: TokenManagementService,
    private readonly entityLookupService: EntityLookupService,
    private readonly xeroProvider: XeroProvider,
    private readonly errorHandler: ErrorHandler
  ) {}

  async execute(input: ImportTransactionsInput): Promise<ImportTransactionsOutput> {
    // Create request context
    const context = RequestContextManager.createContext({
      tenantId: input.tenantId,
      integrationId: input.integrationId
    })

    return RequestContextManager.run(context, async () => {
      const syncJob = await this.getSyncJob(input.syncJobId)
      const integration = await this.getIntegration(input.integrationId, input.tenantId)

      try {
        // Start or restart the sync job
        this.prepareSyncJob(syncJob)
        await this.syncJobRepository.save(syncJob)

        // Validate and refresh tokens if needed
        await this.tokenManagementService.validateAuthData(integration)
        const refreshResult = await this.tokenManagementService.refreshTokensIfNeeded(integration)
        
        if (!refreshResult.success) {
          throw new ProviderApiError(
            integration.provider,
            'token_refresh',
            'TOKEN_REFRESH_FAILED',
            refreshResult.error
          )
        }

        // Build entity lookup maps for linking
        const lookupMaps = await this.entityLookupService.buildLookupMaps(
          input.tenantId,
          integration.provider
        )

        // Fetch and import transactions
        const providerTransactions = await this.fetchProviderTransactions(
          integration,
          input.accountIds,
          input.dateFrom,
          input.dateTo
        )

        // Check if we have any transactions to process
        if (providerTransactions.length === 0) {
          logger.warn('No transactions to import', {
            integrationId: integration.id,
            tenantId: integration.tenantId,
            dateFrom: input.dateFrom?.toISOString(),
            dateTo: input.dateTo?.toISOString(),
            reason: 'No transactions returned from provider API'
          })
          
          // Track empty result telemetry
          telemetry.trackSync({
            integrationId: input.integrationId,
            tenantId: input.tenantId,
            provider: integration.provider,
            operation: 'import_transactions',
            status: 'completed',
            metrics: {
              recordsProcessed: 0,
              recordsImported: 0,
              recordsUpdated: 0,
              recordsSkipped: 0,
              errorCount: 0
            },
            context: {
              requestId: context.requestId,
              syncJobId: input.syncJobId,
              reason: 'no_data_available'
            }
          })
        }

        const result = await this.importTransactions(
          integration,
          providerTransactions,
          syncJob,
          lookupMaps
        )

        // Complete the sync job
        this.completeSyncJob(syncJob, result)
        await this.syncJobRepository.save(syncJob)

        // Update integration status
        integration.recordSuccessfulSync()
        await this.integrationRepository.save(integration)

        logger.info('Transaction import completed', {
          requestId: context.requestId,
          syncJobId: input.syncJobId,
          integrationId: input.integrationId,
          result
        })

        // Track successful sync telemetry
        telemetry.trackSync({
          integrationId: input.integrationId,
          tenantId: input.tenantId,
          provider: integration.provider,
          operation: 'import_transactions',
          status: 'completed',
          metrics: {
            recordsProcessed: result.transactionsImported + result.transactionsUpdated + result.transactionsSkipped,
            recordsImported: result.transactionsImported,
            recordsUpdated: result.transactionsUpdated,
            recordsSkipped: result.transactionsSkipped,
            errorCount: result.errors.length
          },
          context: {
            requestId: context.requestId,
            syncJobId: input.syncJobId
          }
        })

        return result
      } catch (error) {
        await this.handleSyncError(error, syncJob, integration)
        throw error
      }
    })
  }

  private async getSyncJob(syncJobId: string): Promise<SyncJobEntity> {
    const syncJob = await this.syncJobRepository.findById(syncJobId)
    if (!syncJob) {
      throw new NotFoundError('SyncJob', syncJobId)
    }
    return syncJob
  }

  private async getIntegration(
    integrationId: string,
    tenantId: string
  ): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findById(EntityId.from(integrationId))
    if (!integration || integration.tenantId !== tenantId) {
      throw new NotFoundError('Integration', integrationId)
    }
    return integration
  }

  private prepareSyncJob(syncJob: SyncJobEntity): void {
    if (syncJob.isFailed() || syncJob.isCancelled()) {
      syncJob.restart()
    } else {
      syncJob.start()
    }
  }

  private async fetchProviderTransactions(
    integration: IntegrationEntity,
    accountIds?: string[],
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ProviderTransaction[]> {
    switch (integration.provider) {
      case 'xero':
        return this.fetchXeroTransactions(integration, accountIds, dateFrom, dateTo)
      default:
        throw new ProviderApiError(
          integration.provider,
          'fetch_transactions',
          'PROVIDER_NOT_SUPPORTED',
          `Provider ${integration.provider} not supported`
        )
    }
  }

  private async fetchXeroTransactions(
    integration: IntegrationEntity,
    accountIds?: string[],
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ProviderTransaction[]> {
    const context = RequestContextManager.createXeroContext(integration)
    
    return RequestContextManager.run(context, async () => {
      logger.info('Fetching Xero transactions', {
        requestId: context.requestId,
        integrationId: integration.id,
        accountIds,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString()
      })

      const whereClause = this.buildXeroWhereClause(accountIds, dateFrom, dateTo)
      const allTransactions: BankTransaction[] = []
      const xeroConfig = getXeroSyncConfig()
      
      // Debug logging for transaction fetch
      logger.info('Xero transaction fetch details', {
        whereClause,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        accountIds,
        pageSize: xeroConfig.pageSize,
        maxPages: xeroConfig.maxPages
      })
      
      // Wrapped API call with retry logic
      const fetchPage = wrapWithRetry(async (page: number) => {
        return this.xeroProvider.executeApiCall(async (api, tenantId) => {
          return api.getBankTransactions(
            tenantId,
            undefined,
            whereClause,
            undefined,
            page,
            undefined,
            xeroConfig.pageSize
          )
        })
      }, { provider: 'xero', operation: 'getBankTransactions' })

      // Fetch all pages
      let page = 1
      let hasMorePages = true
      
      while (hasMorePages && page <= xeroConfig.maxPages) {
        try {
          logger.debug(`Fetching Xero transactions page ${page}`)
          const response = await fetchPage(page)
          const transactions = response.body?.bankTransactions || []
          
          logger.info(`Xero page ${page} results`, {
            transactionCount: transactions.length,
            hasMorePages: transactions.length === xeroConfig.pageSize,
            totalSoFar: allTransactions.length + transactions.length
          })
          
          allTransactions.push(...transactions)
          
          if (transactions.length < xeroConfig.pageSize) {
            hasMorePages = false
          } else {
            page++
            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, xeroConfig.rateLimitDelay))
          }
        } catch (error) {
          // Check if it's a rate limit error
          const standardError = this.errorHandler.handle(error, {
            provider: 'xero',
            operation: 'getBankTransactions',
            page
          })
          
          if (standardError instanceof RateLimitError) {
            logger.warn('Rate limit hit, waiting before retry', {
              retryAfter: standardError.retryAfter,
              page
            })
            await new Promise(resolve => 
              setTimeout(resolve, standardError.retryAfter * 1000)
            )
            continue
          }
          
          throw standardError
        }
      }

      // Log final results
      logger.info('Xero transaction fetch completed', {
        totalTransactionsFetched: allTransactions.length,
        pagesProcessed: page - 1,
        dateRange: {
          from: dateFrom?.toISOString(),
          to: dateTo?.toISOString()
        }
      })

      if (allTransactions.length === 0) {
        logger.warn('No transactions found in Xero', {
          whereClause,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
          message: 'This could be due to: 1) No transactions in date range, 2) Wrong account IDs, 3) Permission issues'
        })
      }

      return this.transformXeroTransactions(allTransactions)
    })
  }

  private buildXeroWhereClause(
    accountIds?: string[],
    dateFrom?: Date,
    dateTo?: Date
  ): string | undefined {
    const conditions: string[] = []

    if (accountIds && accountIds.length > 0) {
      const accountConditions = accountIds
        .map(id => `BankAccount.AccountID="${id}"`)
        .join(' OR ')
      conditions.push(`(${accountConditions})`)
    }

    if (dateFrom) {
      const year = dateFrom.getFullYear()
      const month = dateFrom.getMonth() + 1
      const day = dateFrom.getDate()
      conditions.push(`Date >= DateTime(${year}, ${month}, ${day})`)
    }

    if (dateTo) {
      const year = dateTo.getFullYear()
      const month = dateTo.getMonth() + 1
      const day = dateTo.getDate()
      conditions.push(`Date <= DateTime(${year}, ${month}, ${day})`)
    }

    return conditions.length > 0 ? conditions.join(' AND ') : undefined
  }

  private transformXeroTransactions(
    bankTransactions: BankTransaction[]
  ): ProviderTransaction[] {
    const transformed: ProviderTransaction[] = []

    for (const txn of bankTransactions) {
      if (!txn.bankTransactionID) {
        logger.warn('Skipping transaction without ID', { transaction: txn })
        continue
      }

      try {
        const providerTransaction = this.transformXeroTransaction(txn)
        transformed.push(providerTransaction)
      } catch (error) {
        logger.error('Failed to transform transaction', {
          bankTransactionID: txn.bankTransactionID,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return transformed
  }

  private transformXeroTransaction(txn: BankTransaction): ProviderTransaction {
    if (!txn.date) {
      throw new DataValidationError(
        'BankTransaction',
        'date',
        null,
        'is required'
      )
    }

    const amount = txn.total || txn.lineItems?.[0]?.lineAmount || 0

    const providerTransaction: ProviderTransaction = {
      providerTransactionId: txn.bankTransactionID!,
      transactionDate: new Date(txn.date),
      amount: amount.toString(),
      currency: txn.currencyCode?.toString() || 'GBP',
      providerData: {
        bankTransactionID: txn.bankTransactionID,
        type: txn.type,
        status: txn.status,
        lineItems: txn.lineItems || [],
        bankAccount: txn.bankAccount,
        contact: txn.contact,
        isReconciled: txn.isReconciled,
        hasAttachments: txn.hasAttachments
      }
    }

    if (txn.updatedDateUTC) {
      providerTransaction.postedDate = new Date(txn.updatedDateUTC)
    }
    if (txn.reference) {
      providerTransaction.reference = txn.reference
    }
    if (txn.bankAccount?.accountID) {
      providerTransaction.accountId = txn.bankAccount.accountID
    }
    if (txn.bankAccount?.name) {
      providerTransaction.accountName = txn.bankAccount.name
    }
    if (txn.bankAccount?.type?.toString()) {
      providerTransaction.accountType = this.mapXeroAccountType(txn.bankAccount.type.toString())
    }

    return providerTransaction
  }

  private mapXeroAccountType(xeroType?: string): string {
    const typeMap: Record<string, string> = {
      'bank': 'checking',
      'creditcard': 'credit',
      'paypal': 'paypal'
    }
    return typeMap[xeroType?.toLowerCase() || ''] || 'checking'
  }

  private async importTransactions(
    integration: IntegrationEntity,
    providerTransactions: ProviderTransaction[],
    syncJob: SyncJobEntity,
    lookupMaps: EntityLookupMaps
  ): Promise<ImportTransactionsOutput> {
    let imported = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    const batchConfig = getBatchConfig()
    const totalBatches = Math.ceil(providerTransactions.length / batchConfig.transactionBatchSize)

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchConfig.transactionBatchSize
      const batch = providerTransactions.slice(start, start + batchConfig.transactionBatchSize)
      
      // Update progress
      const progress = Math.round(((i + 1) / totalBatches) * 100)
      syncJob.updateProgress(progress)
      await this.syncJobRepository.save(syncJob)

      const batchResult = await this.processBatch(integration, batch, lookupMaps)
      imported += batchResult.imported
      updated += batchResult.updated
      skipped += batchResult.skipped
      errors.push(...batchResult.errors)
    }

    return {
      transactionsImported: imported,
      transactionsUpdated: updated,
      transactionsSkipped: skipped,
      errors
    }
  }

  private async processBatch(
    integration: IntegrationEntity,
    batch: ProviderTransaction[],
    lookupMaps: EntityLookupMaps
  ): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> {
    let imported = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const providerTxn of batch) {
      try {
        const result = await this.processTransaction(integration, providerTxn, lookupMaps)
        
        switch (result) {
          case 'imported':
            imported++
            break
          case 'updated':
            updated++
            break
          case 'skipped':
            skipped++
            break
        }
      } catch (error) {
        const standardError = this.errorHandler.handle(error, {
          provider: integration.provider,
          operation: 'processTransaction',
          transactionId: providerTxn.providerTransactionId
        })
        
        errors.push(
          `Transaction ${providerTxn.providerTransactionId}: ${standardError.message}`
        )
      }
    }

    return { imported, updated, skipped, errors }
  }

  private async processTransaction(
    integration: IntegrationEntity,
    providerTxn: ProviderTransaction,
    lookupMaps: EntityLookupMaps
  ): Promise<'imported' | 'updated' | 'skipped'> {
    // Check for existing transaction
    const existing = await this.transactionRepository.findByProviderTransactionId(
      integration.tenantId,
      integration.id.toString(),
      providerTxn.providerTransactionId
    )

    if (existing) {
      if (this.shouldUpdateTransaction(existing, providerTxn)) {
        existing.updateProviderData(providerTxn.providerData)
        existing.markAsImported(integration.id.toString())
        await this.transactionRepository.save(existing)
        return 'updated'
      }
      return 'skipped'
    }

    // Create new transaction with entity linking
    const transaction = await this.createTransactionWithLinking(
      integration,
      providerTxn,
      lookupMaps
    )

    await this.transactionRepository.save(transaction)
    return 'imported'
  }

  private async createTransactionWithLinking(
    integration: IntegrationEntity,
    providerTxn: ProviderTransaction,
    lookupMaps: EntityLookupMaps
  ): Promise<TransactionEntity> {
    // Find linked entities
    const accountId = providerTxn.accountId 
      ? await this.entityLookupService.findAccountId(lookupMaps, providerTxn.accountId)
      : undefined

    // Entity matching removed for now

    // Invoice matching removed for now

    // Validate provider type - use proper type validation
    const validProviders = ['xero', 'quickbooks', 'bank_direct', 'manual', 'csv_import'] as const
    type ValidProviderType = typeof validProviders[number]
    
    const providerType: ValidProviderType = validProviders.includes(integration.provider as ValidProviderType) 
      ? integration.provider as ValidProviderType
      : 'manual'

    return TransactionEntity.create({
      tenantId: integration.tenantId,
      integrationId: integration.id.toString(),
      providerTransactionId: providerTxn.providerTransactionId,
      providerType,
      transactionDate: providerTxn.transactionDate,
      postedDate: providerTxn.postedDate || null,
      amount: providerTxn.amount,
      currency: providerTxn.currency,
      exchangeRate: null,
      baseCurrencyAmount: null,
      sourceAccountId: accountId || null,
      sourceAccountName: providerTxn.accountName || null,
      sourceAccountType: providerTxn.accountType || null,
      balanceAfter: providerTxn.balanceAfter || null,
      transactionFee: null,
      rawDescription: providerTxn.description || null,
      transactionReference: providerTxn.reference || null,
      memo: null,
      providerData: providerTxn.providerData,
      // Entity linking removed - not part of current schema
      aiCategory: null,
      aiConfidence: null,
      aiSupplierMatch: null,
      createdBy: 'system',
      updatedBy: 'system'
    })
  }

  private shouldUpdateTransaction(
    existing: TransactionEntity,
    providerTxn: ProviderTransaction
  ): boolean {
    const existingData = JSON.stringify(existing.providerData)
    const newData = JSON.stringify(providerTxn.providerData)
    
    return existingData !== newData ||
           existing.rawDescription !== providerTxn.description ||
           existing.postedDate?.getTime() !== providerTxn.postedDate?.getTime()
  }

  private completeSyncJob(
    syncJob: SyncJobEntity,
    result: ImportTransactionsOutput
  ): void {
    syncJob.updateMetadata({
      transactionsProcessed: result.transactionsImported + 
                            result.transactionsUpdated + 
                            result.transactionsSkipped,
      completedAt: new Date().toISOString()
    })

    syncJob.complete({
      transactionsImported: result.transactionsImported,
      transactionsUpdated: result.transactionsUpdated,
      transactionsSkipped: result.transactionsSkipped,
      errors: result.errors,
      warnings: []
    })
  }

  private async handleSyncError(
    error: unknown,
    syncJob: SyncJobEntity,
    integration: IntegrationEntity
  ): Promise<void> {
    const standardError = this.errorHandler.handle(error, {
      provider: integration.provider,
      operation: 'import_transactions',
      integrationId: integration.id.toString(),
      syncJobId: syncJob.id
    })

    // Update sync job
    syncJob.fail(standardError.message)
    await this.syncJobRepository.save(syncJob)

    // Update integration
    integration.recordSyncError(standardError.message)
    await this.integrationRepository.save(integration)

    // Track failed sync telemetry
    telemetry.trackSync({
      integrationId: integration.id.toString(),
      tenantId: integration.tenantId,
      provider: integration.provider,
      operation: 'import_transactions',
      status: 'failed',
      context: {
        syncJobId: syncJob.id,
        errorCode: standardError.code,
        errorMessage: standardError.message
      }
    })

    logger.error('Transaction import failed', {
      syncJobId: syncJob.id,
      integrationId: integration.id,
      error: standardError.message,
      code: standardError.code
    })
  }
}