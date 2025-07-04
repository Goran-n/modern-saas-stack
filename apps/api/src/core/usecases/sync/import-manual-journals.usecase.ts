import * as crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { getDatabase } from '../../../database/connection'
import { manualJournals, importBatches } from '../../../database/schema'
import { XeroProvider } from '../../../integrations/accounting/xero/xero.provider'
import logger from '../../../config/logger'
import { ManualJournal } from 'xero-node'
import { EntityLookupService } from '../../services/entity-lookup.service'

export interface ImportManualJournalsInput {
  integrationId: string
  tenantId: string
  options?: {
    modifiedSince?: Date
    dryRun?: boolean
  }
}

export interface ImportManualJournalsOutput {
  totalFetched: number
  created: number
  updated: number
  errors: number
  errorDetails: string[]
}

export class ImportManualJournalsUseCase {
  private db = getDatabase()
  private lookupService: EntityLookupService

  constructor(
    private xeroProvider: XeroProvider
  ) {
    this.lookupService = new EntityLookupService()
  }

  async execute(input: ImportManualJournalsInput): Promise<ImportManualJournalsOutput> {
    const startTime = Date.now()
    const errorDetails: string[] = []
    let actualBatchId: string | null = null
    
    try {
      // Create import batch record
      const insertResult = await this.db.insert(importBatches).values({
        tenantId: input.tenantId,
        integrationId: input.integrationId,
        batchType: 'manual_journals',
        importSource: 'xero',
        status: 'processing',
        startedAt: new Date(),
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        duplicateRecords: 0,
        importConfig: {}
      }).returning({ id: importBatches.id })
      
      actualBatchId = insertResult[0].id
      
      // Get entity lookup maps for mapping account codes
      const lookupMaps = await this.lookupService.buildLookupMaps(input.tenantId, 'xero')
      
      // Fetch all manual journals from Xero
      logger.info('Fetching manual journals from Xero...', {
        modifiedSince: input.options?.modifiedSince
      })
      
      const xeroJournals = await this.fetchAllManualJournals(input.options?.modifiedSince)
      const totalFetched = xeroJournals.length
      
      logger.info(`Fetched ${totalFetched} manual journals from Xero`)
      
      // Get existing journals
      const existingJournals = await this.db
        .select({
          id: manualJournals.id,
          journalNumber: manualJournals.journalNumber,
          providerData: manualJournals.providerData
        })
        .from(manualJournals)
        .where(eq(manualJournals.tenantId, input.tenantId))
      
      // Create lookup maps
      const existingByNumber = new Map<string, typeof existingJournals[0]>()
      const existingByXeroId = new Map<string, typeof existingJournals[0]>()
      
      existingJournals.forEach(journal => {
        if (journal.journalNumber) {
          existingByNumber.set(journal.journalNumber, journal)
        }
        const xeroId = journal.providerData?.xero?.manualJournalID
        if (xeroId) {
          existingByXeroId.set(xeroId, journal)
        }
      })
      
      // Process journals in batches
      const batchSize = 50
      let created = 0
      let updated = 0
      let errors = 0
      
      for (let i = 0; i < xeroJournals.length; i += batchSize) {
        const batch = xeroJournals.slice(i, i + batchSize)
        
        try {
          const result = await this.processBatch(
            batch,
            input.tenantId,
            input.integrationId,
            existingByXeroId,
            lookupMaps,
            input.options?.dryRun || false
          )
          
          created += result.created
          updated += result.updated
          errors += result.errors
          errorDetails.push(...result.errorDetails)
          
          // Update progress
          if (!input.options?.dryRun) {
            await this.db
              .update(importBatches)
              .set({
                processedRecords: i + batch.length,
                importResults: {
                  created,
                  updated,
                  errors: errorDetails.length > 0 ? errorDetails.map(e => ({ message: e })) : []
                },
                updatedAt: new Date()
              })
              .where(eq(importBatches.id, actualBatchId))
          }
          
          logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(xeroJournals.length / batchSize)}`)
        } catch (error) {
          logger.error('Error processing batch:', error)
          errors += batch.length
          errorDetails.push(`Batch error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      
      // Finalize import batch
      if (!input.options?.dryRun) {
        await this.db
          .update(importBatches)
          .set({
            status: errors > 0 ? 'completed' : 'completed',
            completedAt: new Date(),
            totalRecords: totalFetched,
            processedRecords: totalFetched,
            importResults: {
              created,
              updated,
              errors: errorDetails.length > 0 ? errorDetails.map(e => ({ message: e })) : []
            },
            errorLog: errorDetails.length > 0 ? errorDetails.map(e => ({ error: e })) : []
          })
          .where(eq(importBatches.id, actualBatchId))
      }
      
      logger.info('Manual journal import completed', {
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
      
    } catch (error) {
      logger.error('Failed to import manual journals:', error)
      
      if (!input.options?.dryRun && actualBatchId) {
        await this.db
          .update(importBatches)
          .set({
            status: 'failed',
            completedAt: new Date(),
            errorLog: [{ error: error instanceof Error ? error.message : String(error) }]
          })
          .where(eq(importBatches.id, actualBatchId))
      }
      
      throw error
    }
  }
  
  private async fetchAllManualJournals(modifiedSince?: Date): Promise<any[]> {
    const allJournals: any[] = []
    let page = 1
    const pageSize = 100
    let hasMore = true
    
    while (hasMore) {
      try {
        const response = await this.xeroProvider.executeApiCall(
          async (api, tenantId) => {
            // Call the official API method
            return await api.getManualJournals(
              tenantId,
              modifiedSince,
              undefined, // where
              undefined, // order
              page,
              pageSize
            )
          }
        )
        
        if (response.body?.manualJournals) {
          allJournals.push(...response.body.manualJournals)
        }
        
        // Check if there are more pages
        hasMore = response.body?.manualJournals?.length === pageSize
        page++
      } catch (error) {
        logger.error('Error fetching manual journals page', { page, error })
        throw error
      }
    }
    
    return allJournals
  }
  
  
  private async processBatch(
    journalsBatch: ManualJournal[],
    tenantId: string,
    integrationId: string,
    existingByXeroId: Map<string, any>,
    lookupMaps: Awaited<ReturnType<EntityLookupService['buildLookupMaps']>>,
    dryRun: boolean
  ): Promise<{ created: number; updated: number; errors: number; errorDetails: string[] }> {
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails: string[] = []
    
    const toCreate: any[] = []
    const toUpdate: { id: string; data: any }[] = []
    
    for (const journal of journalsBatch) {
      try {
        if (!journal.manualJournalID) {
          errors++
          errorDetails.push('Manual journal missing manualJournalID')
          continue
        }
        
        const journalData = await this.mapXeroJournalToManualJournal(
          journal,
          tenantId,
          integrationId,
          lookupMaps
        )
        
        // Check for balance
        if (Math.abs(journalData.totalDebits - journalData.totalCredits) > 0.01) {
          errors++
          errorDetails.push(
            `Journal ${journal.manualJournalID} is unbalanced: ` +
            `debits=${journalData.totalDebits}, credits=${journalData.totalCredits}`
          )
          continue
        }
        
        const existingById = existingByXeroId.get(journal.manualJournalID!)
        const existing = existingById
        
        if (existing) {
          // Update existing journal
          toUpdate.push({
            id: existing.id,
            data: {
              ...journalData,
              // Preserve provider data
              providerData: {
                ...(existing.providerData || {}),
                xero: {
                  manualJournalID: journal.manualJournalID,
                  status: journal.status,
                  updatedDateUTC: journal.updatedDateUTC,
                  hasAttachments: journal.hasAttachments || false
                }
              },
              updatedAt: new Date()
            }
          })
        } else {
          // Create new journal
          toCreate.push({
            ...journalData,
            id: crypto.randomUUID(),
            providerData: {
              xero: {
                manualJournalID: journal.manualJournalID,
                status: journal.status,
                updatedDateUTC: journal.updatedDateUTC,
                hasAttachments: journal.hasAttachments || false
              }
            }
          })
        }
      } catch (error) {
        errors++
        errorDetails.push(
          `Journal ${journal.manualJournalID}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
    
    if (!dryRun) {
      // Bulk insert new journals
      if (toCreate.length > 0) {
        await this.db.insert(manualJournals).values(toCreate)
        created = toCreate.length
      }
      
      // Update existing journals
      for (const update of toUpdate) {
        await this.db
          .update(manualJournals)
          .set(update.data)
          .where(eq(manualJournals.id, update.id))
      }
      updated = toUpdate.length
    } else {
      created = toCreate.length
      updated = toUpdate.length
    }
    
    return { created, updated, errors, errorDetails }
  }
  
  private async mapXeroJournalToManualJournal(
    journal: ManualJournal,
    tenantId: string,
    integrationId: string,
    lookupMaps: Awaited<ReturnType<EntityLookupService['buildLookupMaps']>>
  ): Promise<any> {
    // Map journal lines
    const journalLines = await Promise.all((journal.journalLines || []).map(async (line, index) => {
      const isDebit = (line.lineAmount || 0) >= 0
      const amount = Math.abs(line.lineAmount || 0)
      
      const accountId = line.accountCode 
        ? await this.lookupService.findAccountId(lookupMaps, undefined, line.accountCode)
        : undefined
      
      if (line.accountCode && !accountId) {
        logger.warn('Account not found for manual journal line', {
          journalId: journal.manualJournalID,
          accountCode: line.accountCode,
          lineDescription: line.description
        })
      }
      
      return {
        lineNumber: index + 1,
        accountCode: line.accountCode,
        accountId,
        description: line.description || '',
        debitAmount: isDebit ? amount : 0,
        creditAmount: isDebit ? 0 : amount,
        taxType: line.taxType,
        taxAmount: line.taxAmount || 0,
        trackingCategories: line.tracking || [],
        isDebit
      }
    }))
    
    // Calculate totals
    const totalDebits = journalLines.reduce((sum, line) => sum + line.debitAmount, 0)
    const totalCredits = journalLines.reduce((sum, line) => sum + line.creditAmount, 0)
    
    // Map status
    let status = 'draft'
    switch (journal.status) {
      case ManualJournal.StatusEnum.DRAFT:
        status = 'draft'
        break
      case ManualJournal.StatusEnum.POSTED:
        status = 'posted'
        break
      case ManualJournal.StatusEnum.DELETED:
        status = 'draft' // Keep as draft since we don't have deleted status
        break
      case ManualJournal.StatusEnum.VOIDED:
        status = 'posted' // Keep as posted but note in metadata
        break
    }
    
    return {
      tenantId,
      integrationId,
      journalNumber: journal.manualJournalID, // Use manualJournalID as journal number
      journalDate: journal.date ? new Date(journal.date) : new Date(),
      narration: journal.narration || '',
      status,
      journalLines,
      totalDebits: totalDebits.toFixed(6),
      totalCredits: totalCredits.toFixed(6),
      currencyCode: 'USD', // Xero doesn't provide currency on manual journals
      
      // Post information
      postedDate: journal.status === ManualJournal.StatusEnum.POSTED && journal.date 
        ? new Date(journal.date) 
        : null,
      
      // Attachments
      hasAttachments: journal.hasAttachments || false,
      attachmentIds: [],
      
      metadata: {
        xeroStatus: journal.status,
        showOnCashBasisReports: journal.showOnCashBasisReports,
        hasValidationErrors: !!journal.validationErrors && journal.validationErrors.length > 0,
        validationErrors: journal.validationErrors,
        warnings: journal.warnings,
        lineItems: journal.journalLines, // Keep original for reference
        originalManualJournalID: journal.manualJournalID
      },
      
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncedAt: new Date()
    }
  }
}