#!/usr/bin/env bun
import logger from '@vepler/logger'
import { connectDatabase } from '../database/connection'
import { bootstrapDependencies, getImportTransactionsUseCase } from '../infrastructure/bootstrap'
import { RequestContextManager } from '../core/context/request-context'

async function executeFullSync() {
  const integrationId = process.argv[2] || '548c018e-d49a-4474-974d-f5bd40a273a7'
  const tenantId = process.argv[3] || '02c24a6e-7e7a-4c1e-812d-0febd140efa2'
  
  try {
    logger.info('Starting direct full sync execution', { integrationId, tenantId })
    
    // Connect to database
    await connectDatabase()
    logger.info('Database connected')
    
    // Bootstrap dependencies
    bootstrapDependencies()
    
    // Create request context
    const context = RequestContextManager.createContext({
      tenantId,
      integrationId,
      correlationId: `direct-sync-${Date.now()}`
    })
    
    await RequestContextManager.run(context, async () => {
      // Use a valid UUID for sync job ID
      const syncJobId = crypto.randomUUID()
      logger.info('Using sync job ID', { syncJobId })
      
      // This is what the sync processor would do - execute imports in order
      const results: Record<string, any> = {}
      
      // 1. Import Accounts (Chart of Accounts) - NOT IMPLEMENTED YET
      logger.info('Would import accounts, but ImportAccountsUseCase not yet in DI container')
      results.accounts = { skipped: true, reason: 'Not implemented' }
      
      // 2. Import Suppliers/Contacts - NOT IMPLEMENTED YET  
      logger.info('Would import suppliers, but ImportSuppliersUseCase not yet in DI container')
      results.suppliers = { skipped: true, reason: 'Not implemented' }
      
      // 3. Import Invoices - NOT IMPLEMENTED YET
      logger.info('Would import invoices, but ImportInvoicesUseCase not yet in DI container')
      results.invoices = { skipped: true, reason: 'Not implemented' }
      
      // 4. Import Transactions - THIS IS IMPLEMENTED
      logger.info('Importing transactions...')
      try {
        const importTransactionsUseCase = getImportTransactionsUseCase()
        
        // Set date range - last 30 days
        const dateTo = new Date()
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - 30)
        
        results.transactions = await importTransactionsUseCase.execute({
          integrationId,
          tenantId,
          syncJobId: syncJobId,
          dateFrom,
          dateTo
        })
        
        logger.info('✅ Transactions imported', {
          imported: results.transactions.transactionsImported,
          updated: results.transactions.transactionsUpdated,
          skipped: results.transactions.transactionsSkipped,
          errors: results.transactions.errors.length
        })
      } catch (error) {
        logger.error('❌ Failed to import transactions', error)
        results.transactions = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
      
      // 5. Import Manual Journals - NOT IMPLEMENTED YET
      logger.info('Would import manual journals, but ImportManualJournalsUseCase not yet in DI container')
      results.manualJournals = { skipped: true, reason: 'Not implemented' }
      
      // 6. Import Bank Statements - NOT IMPLEMENTED YET
      logger.info('Would import bank statements, but ImportBankStatementsUseCase not yet in DI container')
      results.bankStatements = { skipped: true, reason: 'Not implemented' }
      
      // Summary
      logger.info('=== FULL SYNC EXECUTION SUMMARY ===')
      logger.info('Sync Job ID:', syncJobId)
      logger.info('Results:', JSON.stringify(results, null, 2))
      
      logger.info('Note: Currently only transactions import is implemented. Other entities show as "Not implemented".')
    })
    
    process.exit(0)
  } catch (error) {
    logger.error('Failed to execute full sync', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

executeFullSync().catch(error => {
  logger.error('Unhandled error', { error })
  process.exit(1)
})