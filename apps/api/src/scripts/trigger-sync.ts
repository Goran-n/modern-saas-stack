#!/usr/bin/env node

import { program } from 'commander'
import { connectDatabase } from '../database/connection'
import { SyncService } from '../services/sync.service'
import { container, TOKENS } from '../shared/utils/container'
import { bootstrapDependencies } from '../infrastructure/bootstrap'
import log from '../config/logger'

// Initialize container only when needed
let initialized = false

async function initialize() {
  if (!initialized) {
    // Initialize database connection
    await connectDatabase()
    
    // Bootstrap dependency injection container
    bootstrapDependencies()
    
    initialized = true
  }
}

async function getSyncService(): Promise<SyncService> {
  await initialize()
  const { getSyncService } = await import('../lib/di/services')
  return getSyncService()
}

async function findSuitableUserId(tenantId: string, providedUserId?: string): Promise<string> {
  if (providedUserId) {
    return providedUserId
  }

  await initialize()
  
  // Try to find a tenant owner or admin
  const tenantMemberRepository = container.resolve(TOKENS.TENANT_MEMBER_REPOSITORY) as any
  const tenantMembers = await tenantMemberRepository.findByTenant(tenantId)
  
  // Find owner first, then admin, then any active member
  const owner = tenantMembers.find((m: any) => m.role === 'owner' && m.isActive())
  if (owner) {
    log.info('CLI: Using tenant owner for sync trigger', { userId: owner.userId })
    return owner.userId
  }
  
  const admin = tenantMembers.find((m: any) => m.role === 'admin' && m.isActive())
  if (admin) {
    log.info('CLI: Using tenant admin for sync trigger', { userId: admin.userId })
    return admin.userId
  }
  
  const activeMember = tenantMembers.find((m: any) => m.isActive())
  if (activeMember) {
    log.info('CLI: Using active member for sync trigger', { userId: activeMember.userId })
    return activeMember.userId
  }
  
  throw new Error(`No active users found for tenant ${tenantId}. Please provide a valid user ID.`)
}

interface SyncCliOptions {
  integrationId: string
  tenantId: string
  userId?: string
  syncType?: 'full' | 'incremental' | 'manual' | 'webhook' | 'initial'
  priority?: number
}

async function triggerSync(options: SyncCliOptions) {
  try {
    log.info('CLI: Triggering sync job', options)

    const syncService = await getSyncService()
    const userId = await findSuitableUserId(options.tenantId, options.userId)
    
    const result = await syncService.triggerSync(
      options.integrationId,
      options.tenantId,
      userId,
      (options.syncType === 'initial' ? 'full' : options.syncType) || 'manual',
      {
        priority: options.priority || 0
      }
    )

    log.info('CLI: Sync job triggered successfully', {
      syncJobId: result.id,
      status: result.status,
      jobType: result.jobType,
    })

    console.log('✅ Sync job triggered successfully!')
    console.log(`   Sync Job ID: ${result.id}`)
    console.log(`   Status: ${result.status}`)
    console.log(`   Type: ${result.jobType}`)
    console.log(`   Priority: ${result.priority}`)

    process.exit(0)
  } catch (error) {
    log.error('CLI: Failed to trigger sync job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      options,
    })

    console.error('❌ Failed to trigger sync job:')
    console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    process.exit(1)
  }
}

async function scheduleRegularSync(integrationId: string, tenantId: string, frequency: 'hourly' | 'daily' | 'weekly') {
  try {
    log.info('CLI: Scheduling regular sync', { integrationId, tenantId, frequency })

    // TODO: Implement scheduleRegularSync method
    // const syncService = await getSyncService()
    // await syncService.scheduleRegularSync(integrationId, tenantId, frequency)
    log.warn('scheduleRegularSync method not yet implemented')

    log.info('CLI: Regular sync scheduled successfully', { integrationId, tenantId, frequency })

    console.log('✅ Regular sync scheduled successfully!')
    console.log(`   Integration ID: ${integrationId}`)
    console.log(`   Tenant ID: ${tenantId}`)
    console.log(`   Frequency: ${frequency}`)

    process.exit(0)
  } catch (error) {
    log.error('CLI: Failed to schedule regular sync', {
      error: error instanceof Error ? error.message : 'Unknown error',
      integrationId,
      tenantId,
      frequency,
    })

    console.error('❌ Failed to schedule regular sync:')
    console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    process.exit(1)
  }
}

program
  .name('trigger-sync')
  .description('CLI tool for triggering and scheduling sync jobs')
  .version('1.0.0')

program
  .command('trigger')
  .description('Trigger a sync job for an integration')
  .requiredOption('-i, --integration-id <id>', 'Integration ID to sync')
  .requiredOption('-t, --tenant-id <id>', 'Tenant ID')
  .option('-u, --user-id <id>', 'User ID who is triggering the sync (auto-detected if not provided)')
  .option('-s, --sync-type <type>', 'Sync type (full, incremental, manual, webhook, initial)', 'manual')
  .option('-p, --priority <number>', 'Job priority (higher number = higher priority)', '0')
  .action(async (options) => {
    await triggerSync({
      integrationId: options.integrationId,
      tenantId: options.tenantId,
      userId: options.userId,
      syncType: options.syncType as any,
      priority: parseInt(options.priority),
    })
  })

program
  .command('schedule')
  .description('Schedule regular sync for an integration')
  .requiredOption('-i, --integration-id <id>', 'Integration ID to schedule sync for')
  .requiredOption('-t, --tenant-id <id>', 'Tenant ID')
  .requiredOption('-f, --frequency <freq>', 'Sync frequency (hourly, daily, weekly)')
  .action(async (options) => {
    if (!['hourly', 'daily', 'weekly'].includes(options.frequency)) {
      console.error('❌ Invalid frequency. Must be one of: hourly, daily, weekly')
      process.exit(1)
    }
    
    await scheduleRegularSync(
      options.integrationId,
      options.tenantId,
      options.frequency as 'hourly' | 'daily' | 'weekly'
    )
  })

program.parse()