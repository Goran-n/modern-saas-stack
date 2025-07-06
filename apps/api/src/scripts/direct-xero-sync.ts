#!/usr/bin/env bun
import logger from '@vepler/logger'
import { connectDatabase, getDatabase } from '../database/connection'
import { bootstrapDependencies } from '../infrastructure/bootstrap'
import { container, TOKENS } from '../shared/utils/container'
import { XeroProvider } from '../integrations/accounting/xero/xero.provider'
import { integrations } from '../database/schema'
import { eq, and } from 'drizzle-orm'
import { IntegrationEntity } from '../core/domain/integration/index'
import type { IntegrationEntityProps, IntegrationProvider, IntegrationType, IntegrationStatus } from '../core/domain/integration/index'
import { EntityId } from '../core/domain/shared/value-objects/entity-id'
import { integrationSettingsSchema } from '../core/domain/integration/index'
import { RequestContextManager } from '../core/context/request-context'

async function directXeroSync() {
  const integrationId = process.argv[2] || '548c018e-d49a-4474-974d-f5bd40a273a7'
  const tenantId = process.argv[3] || '02c24a6e-7e7a-4c1e-812d-0febd140efa2'
  
  try {
    logger.info('Starting direct Xero sync - showing all entity types', { integrationId, tenantId })
    
    // Connect to database
    await connectDatabase()
    logger.info('Database connected')
    
    // Bootstrap dependencies
    bootstrapDependencies()
    
    const db = getDatabase()
    const xeroProvider = container.resolve<XeroProvider>(TOKENS.XERO_PROVIDER)
    
    // Fetch integration
    logger.info('Fetching integration from database')
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
    
    const dbRow = integrationData[0]
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
    
    // Create Xero request context with credentials
    const context = RequestContextManager.createXeroContext(integration)
    
    await RequestContextManager.run(context, async () => {
      logger.info('=== DIRECT XERO SYNC - ALL ENTITIES ===')
      
      // 1. Fetch Organisation Info
      logger.info('1. Fetching Organisation Info...')
      try {
        const org = await xeroProvider.testConnection()
      logger.info('✅ Organisation:', {
        name: org.name,
        version: org.version,
        orgType: org.organisationType
      })
    } catch (error) {
      logger.error('❌ Failed to fetch organisation', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
    
    // 2. Fetch Accounts (Chart of Accounts)
    logger.info('2. Fetching Accounts (Chart of Accounts)...')
    try {
      const accounts = await xeroProvider.fetchAccounts({ includeArchived: true })
      logger.info('✅ Accounts fetched:', {
        total: accounts.length,
        active: accounts.filter((a: any) => a.status).length,
        archived: accounts.filter((a: any) => !a.status).length,
        types: [...new Set(accounts.map((a: any) => a.type))].sort()
      })
    } catch (error) {
      logger.error('❌ Failed to fetch accounts', error)
    }
    
    // 3. Fetch Contacts (Suppliers/Customers)
    logger.info('3. Fetching Contacts (Suppliers/Customers)...')
    try {
      const contacts = await xeroProvider.fetchSuppliers({ includeArchived: true })
      logger.info('✅ Contacts fetched:', {
        total: contacts.length,
        active: contacts.filter((c: any) => c.isActive).length,
        suppliers: contacts.filter((c: any) => c.isSupplier).length,
        customers: contacts.filter((c: any) => c.isCustomer).length
      })
    } catch (error) {
      logger.error('❌ Failed to fetch contacts', error)
    }
    
    // 4. Fetch Invoices
    logger.info('4. Fetching Invoices (Bills & Sales)...')
    try {
      // Fetch bills (ACCPAY)
      const bills = await xeroProvider.fetchInvoices({ 
        invoiceTypes: ['ACCPAY'],
        statuses: ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID']
      })
      
      // Fetch sales invoices (ACCREC)
      const salesInvoices = await xeroProvider.fetchInvoices({ 
        invoiceTypes: ['ACCREC'],
        statuses: ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID']
      })
      
      logger.info('✅ Invoices fetched:', {
        bills: {
          total: bills.length,
          statuses: bills.reduce((acc: Record<string, number>, inv: any) => {
            if (inv.status) {
              acc[inv.status] = (acc[inv.status] || 0) + 1
            }
            return acc
          }, {} as Record<string, number>)
        },
        salesInvoices: {
          total: salesInvoices.length,
          statuses: salesInvoices.reduce((acc: Record<string, number>, inv: any) => {
            if (inv.status) {
              acc[inv.status] = (acc[inv.status] || 0) + 1
            }
            return acc
          }, {} as Record<string, number>)
        }
      })
    } catch (error) {
      logger.error('❌ Failed to fetch invoices', error)
    }
    
    // 5. Fetch Bank Transactions
    logger.info('5. Fetching Bank Transactions...')
    try {
      const dateTo = new Date()
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - 30) // Last 30 days
      
      const transactions = await xeroProvider.fetchTransactions({
        dateFrom,
        dateTo
      })
      
      logger.info('✅ Transactions fetched:', {
        total: transactions.length,
        dateRange: {
          from: dateFrom.toISOString().split('T')[0],
          to: dateTo.toISOString().split('T')[0]
        },
        types: transactions.reduce((acc: Record<string, number>, tx: any) => {
          if (tx.type) {
            acc[tx.type] = (acc[tx.type] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)
      })
    } catch (error) {
      logger.error('❌ Failed to fetch transactions', error)
    }
    
    // 6. Fetch Manual Journals
    logger.info('6. Fetching Manual Journals...')
    try {
      const journals = await xeroProvider.fetchManualJournals()
      logger.info('✅ Manual Journals fetched:', {
        total: journals.length,
        statuses: journals.reduce((acc: Record<string, number>, j: any) => {
          if (j.status) {
            acc[j.status] = (acc[j.status] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)
      })
    } catch (error) {
      logger.error('❌ Failed to fetch manual journals', error)
    }
    
    // 7. Fetch Bank Statements
    logger.info('7. Fetching Bank Statements...')
    try {
      const statements = await xeroProvider.fetchBankStatements({
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        toDate: new Date()
      })
      logger.info('✅ Bank Statements fetched:', {
        totalStatements: statements.length,
        totalLines: statements.reduce((sum: number, s: any) => sum + s.statementLines.length, 0)
      })
    } catch (error) {
      logger.error('❌ Failed to fetch bank statements', error)
    }
    
    // 8. Fetch Credit Notes
    logger.info('8. Fetching Credit Notes...')
    try {
      const creditNotes = await xeroProvider.fetchCreditNotes()
      logger.info('✅ Credit Notes fetched:', {
        total: creditNotes.length
      })
    } catch (error) {
      logger.error('❌ Failed to fetch credit notes', error)
    }
    
    // 9. Fetch Prepayments
    logger.info('9. Fetching Prepayments...')
    try {
      const prepayments = await xeroProvider.fetchPrepayments()
      logger.info('✅ Prepayments fetched:', {
        total: prepayments.length
      })
    } catch (error) {
      logger.error('❌ Failed to fetch prepayments', error)
    }
    
    // 10. Fetch Overpayments  
    logger.info('10. Fetching Overpayments...')
    try {
      const overpayments = await xeroProvider.fetchOverpayments()
      logger.info('✅ Overpayments fetched:', {
        total: overpayments.length
      })
    } catch (error) {
      logger.error('❌ Failed to fetch overpayments', error)
    }
    
      logger.info('=== SYNC COMPLETE ===')
      logger.info('This shows all entity types that can be synced from Xero')
      logger.info('Note: Only Transactions import is currently implemented in the use cases')
    })
    
    process.exit(0)
  } catch (error) {
    logger.error('Failed to run direct sync', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

directXeroSync().catch(error => {
  logger.error('Unhandled error', { error })
  process.exit(1)
})