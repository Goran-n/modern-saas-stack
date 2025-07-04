#!/usr/bin/env bun
import { getDatabaseConfig } from '../config/config'
import { TriggerSyncUseCase } from '../core/usecases/sync/trigger-sync.usecase'
import { DrizzleIntegrationRepository } from '../repositories/drizzle/integration.repository'
import { DrizzleSyncJobRepository } from '../repositories/drizzle/sync-job.repository'
import { DrizzleTenantMemberRepository } from '../repositories/drizzle/tenant-member.repository'
import { drizzleClient, pgClient } from '../infrastructure/database/connection'
import { addSyncIntegrationJob } from '../jobs/queue.config'
import logger from '@vepler/logger'

async function main() {
  try {
    logger.info('Starting full sync test...')

    const tenantId = process.argv[2]
    const integrationId = process.argv[3]
    const entities = process.argv[4]?.split(',') || ['all']

    if (!tenantId || !integrationId) {
      logger.error('Usage: bun run test-full-sync.ts <tenantId> <integrationId> [entities]')
      logger.info('Example: bun run test-full-sync.ts tenant123 int456')
      logger.info('Example with specific entities: bun run test-full-sync.ts tenant123 int456 contacts,accounts')
      logger.info('Example with all entities: bun run test-full-sync.ts tenant123 int456 all')
      process.exit(1)
    }

    logger.info({
      message: 'Sync parameters',
      tenantId,
      integrationId,
      entities
    })

    const dbConfig = getDatabaseConfig()
    await drizzleClient.initialize({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database
    })

    const integrationRepository = new DrizzleIntegrationRepository(drizzleClient)
    const syncJobRepository = new DrizzleSyncJobRepository(drizzleClient)
    const tenantMemberRepository = new DrizzleTenantMemberRepository(drizzleClient)

    const triggerSyncUseCase = new TriggerSyncUseCase(
      integrationRepository,
      syncJobRepository,
      tenantMemberRepository,
      addSyncIntegrationJob
    )

    logger.info('Checking if integration exists...')
    const integration = await integrationRepository.getById(integrationId)
    
    if (!integration) {
      logger.error('Integration not found')
      process.exit(1)
    }

    if (integration.tenantId !== tenantId) {
      logger.error('Integration does not belong to the specified tenant')
      process.exit(1)
    }

    logger.info({
      message: 'Integration found',
      integrationType: integration.integrationType,
      status: integration.status
    })

    logger.info('Triggering sync...')
    const result = await triggerSyncUseCase.execute({
      tenantId,
      integrationId,
      entities,
      syncType: 'full',
      userId: 'test-script'
    })

    if (result.status === 'failed') {
      logger.error({
        message: 'Failed to trigger sync',
        error: result.error
      })
      process.exit(1)
    }

    logger.info({
      message: 'Sync triggered successfully',
      syncJobId: result.data?.syncJobId,
      jobId: result.data?.jobId
    })

    logger.info('You can monitor the sync progress using:')
    logger.info(`bun run monitor-sync.ts ${result.data?.syncJobId}`)

    process.exit(0)
  } catch (error) {
    logger.error({
      message: 'Script failed',
      error: error instanceof Error ? error.message : String(error)
    })
    process.exit(1)
  }
}

main()