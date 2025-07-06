#!/usr/bin/env bun
import logger from '@vepler/logger'
import { bootstrapDependencies } from '../infrastructure/bootstrap'
import { getDatabase } from '../database/connection'
import { integrations, syncJobs } from '../database/schema'
import { eq, and } from 'drizzle-orm'
import { SyncJobEntity } from '../core/domain/sync-job/index'
import { 
  IntegrationEntity, 
  type IntegrationEntityProps,
  type IntegrationProvider,
  type IntegrationType,
  type IntegrationStatus,
  integrationSettingsSchema
} from '../core/domain/integration/index'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'
import { ImportTransactionsUseCase } from '../core/usecases/sync/import-transactions.usecase'
import { container, TOKENS } from '../shared/utils/container'
import { RequestContextManager } from '../core/context/request-context'
import { ErrorHandler } from '../core/errors/error-handler'
import { TokenManagementService } from '../core/services/token-management.service'
import { getBatchConfig } from '../config/sync.config'
import { EntityLookupService } from '../core/services/entity-lookup.service'
import { XeroProvider } from '../integrations/accounting/xero/xero.provider'
import type { TransactionRepository, SyncJobRepository, IntegrationRepository } from '../core/ports/index'

/**
 * Enhanced sync script using the new architecture
 * - Request context isolation
 * - Unified token management
 * - Standardized error handling
 * - Proper dependency injection
 */
async function main() {
  const integrationId = process.argv[2]
  const tenantId = process.argv[3]

  if (!integrationId || !tenantId) {
    logger.error('Usage: npm run sync:xero-enhanced <integrationId> <tenantId>')
    process.exit(1)
  }

  try {
    logger.info('Starting enhanced Xero sync', { integrationId, tenantId })

    // Connect to database first
    const { connectDatabase } = await import('../database/connection')
    await connectDatabase()
    logger.info('Database connected')

    // Bootstrap dependencies
    bootstrapDependencies()

    // Get required services
    const db = getDatabase()
    const errorHandler = container.resolve<ErrorHandler>(TOKENS.ERROR_HANDLER)
    const tokenManagementService = container.resolve<TokenManagementService>(TOKENS.TOKEN_MANAGEMENT_SERVICE)
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)

    // Create request context
    const context = RequestContextManager.createContext({
      tenantId,
      integrationId,
      correlationId: `sync-${Date.now()}`
    })

    await RequestContextManager.run(context, async () => {
      try {
        // 1. Fetch and validate integration
        logger.info('Fetching integration')
        const integrationData = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.id, integrationId),
              eq(integrations.tenantId, tenantId)
            )
          )
          .limit(1)

        if (!integrationData.length) {
          throw new Error(`Integration not found: ${integrationId}`)
        }

        // Map database columns to entity properties with proper typing
        const dbRow = integrationData[0]
        
        // Create properly typed integration properties
        const integrationProps: IntegrationEntityProps = {
          id: EntityId.from(dbRow.id),
          tenantId: dbRow.tenantId,
          provider: dbRow.provider as IntegrationProvider,
          integrationType: dbRow.integrationType as IntegrationType,
          name: dbRow.name,
          status: dbRow.status as IntegrationStatus,
          authData: dbRow.authData as Record<string, unknown>,
          settings: dbRow.settings ? integrationSettingsSchema.parse(dbRow.settings) : {},
          metadata: (dbRow as any).metadata as Record<string, unknown> || {},
          lastSyncAt: dbRow.lastSyncAt || null,
          lastErrorAt: dbRow.lastError ? new Date() : null,
          lastErrorMessage: dbRow.lastError || null,
          nextScheduledSync: dbRow.nextScheduledSync || null,
          syncHealth: (dbRow.syncHealth as 'healthy' | 'warning' | 'error' | 'unknown') || 'unknown',
          syncCount: (dbRow as any).syncCount || 0,
          errorCount: (dbRow as any).errorCount || 0,
          createdAt: dbRow.createdAt,
          updatedAt: dbRow.updatedAt
        }

        const integration = IntegrationEntity.fromDatabase(integrationProps)

        // 2. Check token health
        logger.info('Checking token health')
        const tokenHealth = await tokenManagementService.checkTokenHealth(integration)

        logger.info('Token health status', {
          isValid: tokenHealth.isValid,
          needsRefresh: tokenHealth.needsRefresh,
          secondsUntilExpiry: tokenHealth.secondsUntilExpiry,
          consecutiveFailures: tokenHealth.consecutiveRefreshFailures
        })

        if (!tokenHealth.isValid && tokenHealth.consecutiveRefreshFailures >= 10) {
          logger.error('Token refresh has failed too many times. Re-authentication required.')
          process.exit(1)
        }

        // 3. Refresh tokens if needed
        if (tokenHealth.needsRefresh) {
          logger.info('Refreshing tokens')
          const refreshResult = await tokenManagementService.refreshTokens(integration)

          if (!refreshResult.success) {
            logger.error('Failed to refresh tokens', {
              error: refreshResult.error,
              needsReauth: refreshResult.needsReauth
            })
            process.exit(1)
          }

          logger.info('Tokens refreshed successfully')
        }

        // 4. Create sync job
        logger.info('Creating sync job')
        const syncJobData = {
          id: crypto.randomUUID(),
          tenantId,
          integrationId,
          jobType: 'manual' as const,
          status: 'pending' as const,
          priority: 0,
          progress: 0,
          metadata: {
            source: 'manual-script',
            requestId: context.requestId,
            syncType: 'transactions'
          },
          result: null,
          error: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await db.insert(syncJobs).values(syncJobData)
        const syncJob = SyncJobEntity.fromDatabase(syncJobData)

        // 5. Execute sync with proper architecture
        logger.info('Executing sync with enhanced architecture')

        // Get all required services
        const transactionRepository = container.resolve<TransactionRepository>(TOKENS.TRANSACTION_REPOSITORY)
        const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
        const entityLookupService = container.resolve<EntityLookupService>(TOKENS.ENTITY_LOOKUP_SERVICE)
        const xeroProvider = container.resolve<XeroProvider>(TOKENS.XERO_PROVIDER)

        // Create use case instance
        const importUseCase = new ImportTransactionsUseCase(
          transactionRepository,
          syncJobRepository,
          integrationRepository,
          tokenManagementService,
          entityLookupService,
          xeroProvider,
          errorHandler
        )

        // Set date range for import using configuration
        const batchConfig = getBatchConfig()
        const dateTo = new Date()
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - batchConfig.defaultSyncDaysBack)

        const result = await importUseCase.execute({
          integrationId,
          tenantId,
          syncJobId: syncJob.id,
          dateFrom,
          dateTo
        })

        logger.info('Sync completed successfully', {
          transactionsImported: result.transactionsImported,
          transactionsUpdated: result.transactionsUpdated,
          transactionsSkipped: result.transactionsSkipped,
          errors: result.errors.length
        })

        if (result.errors.length > 0) {
          logger.warn('Sync completed with errors', {
            errorCount: result.errors.length,
            sampleErrors: result.errors.slice(0, 5)
          })
        }

        process.exit(0)
      } catch (error) {
        const standardError = errorHandler.handle(error, {
          integrationId,
          tenantId,
          operation: 'sync_xero_enhanced'
        })

        logger.error('Sync failed', {
          error: standardError.message,
          code: standardError.code,
          statusCode: standardError.statusCode
        })

        process.exit(1)
      }
    })
  } catch (error) {
    logger.error('Fatal error during sync', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

// Run the sync
main().catch(error => {
  logger.error('Unhandled error', { error })
  process.exit(1)
})
