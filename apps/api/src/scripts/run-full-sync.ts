#!/usr/bin/env bun
import logger from '@vepler/logger'

// This script is currently disabled due to outdated interfaces
// The TriggerSyncUseCase interface has changed and needs to be updated

async function runFullSync() {
  logger.info('Full sync script disabled - needs interface updates')
  logger.info('To re-enable this script:')
  logger.info('1. Update TriggerSyncUseCase interface to match current implementation')
  logger.info('2. Fix queue integration imports')
  logger.info('3. Update input/output types')
  logger.info('4. Use the working execute-full-sync.ts script instead')
  process.exit(0)
}

runFullSync()