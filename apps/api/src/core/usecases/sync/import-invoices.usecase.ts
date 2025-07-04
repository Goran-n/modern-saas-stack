import { eq } from 'drizzle-orm'
import { invoices, importBatches, INVOICE_STATUS } from '../../../database/schema'
import { getDatabase } from '../../../database/connection'
import { XeroProvider } from '../../../integrations/accounting/xero/xero.provider'
import logger from '../../../config/logger'
import { Invoice } from 'xero-node'
import * as crypto from 'crypto'
import { EntityLookupService } from '../../services/entity-lookup.service'

export interface ImportInvoicesInput {
  integrationId: string
  tenantId: string
  options?: {
    modifiedSince?: Date
    invoiceTypes?: ('ACCPAY' | 'ACCREC')[]
    statuses?: string[]
    dryRun?: boolean
  }
}

export interface ImportInvoicesOutput {
  totalFetched: number
  created: number
  updated: number
  errors: number
  errorDetails: string[]
}

export class ImportInvoicesUseCase {
  private db = getDatabase()
  private lookupService: EntityLookupService

  constructor(
    private xeroProvider: XeroProvider
  ) {
    this.lookupService = new EntityLookupService()
  }

  async execute(input: ImportInvoicesInput): Promise<ImportInvoicesOutput> {
    const batchId = crypto.randomUUID()
    const startTime = Date.now()
    const errorDetails: string[] = []
    
    try {
      // Create import batch record
      await this.db.insert(importBatches).values({
        id: batchId,
        tenantId: input.tenantId,
        integrationId: input.integrationId,
        batchType: 'invoices',
        importSource: 'xero',
        status: 'processing',
        startedAt: new Date(),
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        duplicateRecords: 0,
          // metadata removed as it's not in the schema
        })
      
      // Get comprehensive lookup maps
      const lookupMaps = await this.lookupService.buildLookupMaps(input.tenantId, 'xero')
      logger.info('Loaded entity lookup maps for invoices', {
        accounts: lookupMaps.accounts.byCode.size,
        suppliers: lookupMaps.suppliers.byProviderId.size
      })
      
      // Fetch invoices from Xero
      const invoiceTypes = input.options?.invoiceTypes || ['ACCPAY', 'ACCREC']
      const allInvoices: Invoice[] = []
      
      for (const invoiceType of invoiceTypes) {
        logger.info(`Fetching ${invoiceType} invoices from Xero...`)
        const typeInvoices = await this.fetchAllInvoices(
          invoiceType,
          input.options?.modifiedSince,
          input.options?.statuses
        )
        allInvoices.push(...typeInvoices)
      }
      
      const totalFetched = allInvoices.length
      logger.info(`Fetched ${totalFetched} invoices from Xero`)
      
      // Get existing invoices
      const existingInvoices = await this.db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          providerInvoiceId: invoices.providerInvoiceId
        })
        .from(invoices)
        .where(eq(invoices.tenantId, input.tenantId))
      
      // Create lookup maps
      const existingByNumber = new Map<string, typeof existingInvoices[0]>()
      const existingByXeroId = new Map<string, typeof existingInvoices[0]>()
      
      existingInvoices.forEach(invoice => {
        if (invoice.invoiceNumber) {
          existingByNumber.set(invoice.invoiceNumber, invoice)
        }
        // providerInvoiceId is a simple string in the schema
        if (invoice.providerInvoiceId) {
          existingByXeroId.set(invoice.providerInvoiceId, invoice)
        }
      })
      
      // Process invoices in batches
      const batchSize = 50
      let created = 0
      let updated = 0
      let errors = 0
      
      for (let i = 0; i < allInvoices.length; i += batchSize) {
        const batch = allInvoices.slice(i, i + batchSize)
        
        try {
          const result = await this.processBatch(
            batch,
            input.tenantId,
            input.integrationId,
            existingByNumber,
            existingByXeroId,
            lookupMaps
          )
          
          created += result.created
          updated += result.updated
          errors += result.errors
          errorDetails.push(...result.errorDetails)
          
          // Update progress
          await this.db
            .update(importBatches)
            .set({
              processedRecords: i + batch.length,
              failedRecords: errors,
              updatedAt: new Date()
            })
            .where(eq(importBatches.id, batchId))
          
          logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allInvoices.length / batchSize)}`)
        } catch (error) {
          logger.error('Error processing batch:', error)
          errors += batch.length
          errorDetails.push(`Batch error: ${error instanceof Error ? error.message : String(error)}`)
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
      
      logger.info('Invoice import completed', {
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
      logger.error('Failed to import invoices:', error)
      
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
  
  private async fetchAllInvoices(
    invoiceType: 'ACCPAY' | 'ACCREC',
    modifiedSince?: Date,
    statuses?: string[]
  ): Promise<Invoice[]> {
    const allInvoices: Invoice[] = []
    let page = 1
    let hasMore = true
    
    while (hasMore) {
      try {
        const response = await this.xeroProvider.executeApiCall(
          async (api, tenantId) => {
            // Build where clause for invoice type
            const where = invoiceType === 'ACCPAY' ? 'Type=="ACCPAY"' : undefined
            
            // Call the official API method
            return await api.getInvoices(
              tenantId,
              modifiedSince,
              where,
              undefined, // order
              undefined, // iDs
              undefined, // invoiceNumbers
              undefined, // contactIDs
              statuses,
              page,
              true, // includeArchived
              undefined, // createdByMyApp
              undefined, // unitdp
              undefined, // summaryOnly
              100 // pageSize
            )
          }
        )
        
        if (response.body?.invoices) {
          allInvoices.push(...response.body.invoices)
        }
        
        // Check if there are more pages
        hasMore = response.body?.invoices?.length === 100
        page++
      } catch (error) {
        logger.error('Error fetching invoices page', { page, error })
        throw error
      }
    }
    
    return allInvoices
  }
  
  
  private async processBatch(
    invoicesBatch: Invoice[],
    tenantId: string,
    integrationId: string,
    existingByNumber: Map<string, any>,
    existingByXeroId: Map<string, any>,
    lookupMaps: Awaited<ReturnType<EntityLookupService['buildLookupMaps']>>
  ): Promise<{ created: number; updated: number; errors: number; errorDetails: string[] }> {
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails: string[] = []
    
    const toCreate: any[] = []
    const toUpdate: { id: string; data: any }[] = []
    
    for (const invoice of invoicesBatch) {
      try {
        if (!invoice.invoiceID) {
          errors++
          errorDetails.push('Invoice missing invoiceID')
          continue
        }
        
        const invoiceData = await this.mapXeroInvoiceToInvoice(
          invoice,
          tenantId,
          integrationId,
          lookupMaps
        )
        
        const existingByNum = invoice.invoiceNumber ? existingByNumber.get(invoice.invoiceNumber) : null
        const existingById = existingByXeroId.get(invoice.invoiceID)
        const existing = existingByNum || existingById
        
        if (existing) {
          // Update existing invoice
          toUpdate.push({
            id: existing.id,
            data: {
              ...invoiceData,
              // Set provider invoice ID
              providerInvoiceId: invoice.invoiceID,
              updatedAt: new Date()
            }
          })
        } else {
          // Create new invoice
          toCreate.push({
            ...invoiceData,
            id: crypto.randomUUID(),
            providerInvoiceId: invoice.invoiceID
          })
        }
      } catch (error) {
        errors++
        errorDetails.push(
          `Invoice ${invoice.invoiceNumber || invoice.invoiceID}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
    
    // Bulk insert new invoices
    if (toCreate.length > 0) {
      await this.db.insert(invoices).values(toCreate)
      created = toCreate.length
    }
    
    // Update existing invoices
    if (toUpdate.length > 0) {
      for (const update of toUpdate) {
        await this.db
          .update(invoices)
          .set(update.data)
          .where(eq(invoices.id, update.id))
      }
      updated = toUpdate.length
    }
    
    return { created, updated, errors, errorDetails }
  }
  
  private async mapXeroInvoiceToInvoice(
    invoice: Invoice,
    tenantId: string,
    integrationId: string,
    lookupMaps: Awaited<ReturnType<EntityLookupService['buildLookupMaps']>>
  ): Promise<any> {
    // Map invoice type
    const isSupplierInvoice = invoice.type?.toString() === 'ACCPAY'
    const invoiceType = isSupplierInvoice ? 'bill' : 'invoice'
    
    // Map status
    let status: string = INVOICE_STATUS.DRAFT
    switch (invoice.status?.toString()) {
      case 'DRAFT':
        status = INVOICE_STATUS.DRAFT
        break
      case 'SUBMITTED':
        status = INVOICE_STATUS.SUBMITTED
        break
      case 'AUTHORISED':
        status = INVOICE_STATUS.APPROVED
        break
      case 'PAID':
        status = INVOICE_STATUS.PAID
        break
      case 'VOIDED':
        status = INVOICE_STATUS.VOID
        break
      case 'DELETED':
        status = INVOICE_STATUS.DELETED
        break
    }
    
    // Find supplier
    const supplierId = invoice.contact?.contactID 
      ? await this.lookupService.findSupplierId(lookupMaps, invoice.contact.contactID, invoice.contact.name)
      : undefined
    
    if (invoice.contact?.contactID && !supplierId) {
      logger.warn('Supplier not found for invoice', {
        invoiceId: invoice.invoiceID,
        contactId: invoice.contact.contactID,
        contactName: invoice.contact.name
      })
    }
    
    // Process line items with account linking
    const lineItems = await Promise.all((invoice.lineItems || []).map(async (item, index) => {
      // Find account ID for the line item
      const accountId = item.accountCode 
        ? await this.lookupService.findAccountId(lookupMaps, undefined, item.accountCode)
        : undefined
      
      if (item.accountCode && !accountId) {
        logger.warn('Account not found for invoice line item', {
          invoiceId: invoice.invoiceID,
          accountCode: item.accountCode,
          lineDescription: item.description
        })
      }
      
      return {
        lineNumber: index + 1,
        description: item.description || '',
        quantity: item.quantity || 0,
        unitPrice: item.unitAmount || 0,
        discountPercentage: item.discountRate,
        taxRate: item.taxAmount ? (item.taxAmount / (item.lineAmount || 1)) * 100 : 0,
        taxAmount: item.taxAmount || 0,
        totalAmount: item.lineAmount || 0,
        accountCode: item.accountCode,
        trackingCategories: item.tracking || {},
        customFields: {
          itemCode: item.itemCode,
          taxType: item.taxType,
          accountId // Added account ID to custom fields
        }
      }
    }))
    
    return {
      tenantId,
      integrationId,
      invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      reference: invoice.reference,
      supplierId,
      status,
      
      // Dates
      invoiceDate: invoice.date ? new Date(invoice.date) : new Date(),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
      periodStartDate: invoice.plannedPaymentDate ? new Date(invoice.plannedPaymentDate) : null,
      
      // Amounts
      subtotalAmount: invoice.subTotal?.toString() || '0',
      taxAmount: invoice.totalTax?.toString() || '0',
      totalAmount: invoice.total?.toString() || '0',
      currencyCode: invoice.currencyCode || 'USD',
      exchangeRate: invoice.currencyRate?.toString(),
      baseCurrencyCode: 'USD', // Xero org base currency
      baseTotalAmount: invoice.total && invoice.currencyRate 
        ? (parseFloat(invoice.total.toString()) * parseFloat(invoice.currencyRate.toString())).toFixed(2)
        : invoice.total?.toString(),
      
      // Payment tracking
      amountPaid: invoice.amountPaid?.toString() || '0',
      amountCredited: invoice.amountCredited?.toString() || '0',
      amountDue: invoice.amountDue?.toString() || '0',
      fullyPaid: invoice.status?.toString() === 'PAID',
      
      // Line items
      lineItems,
      lineItemsCount: lineItems.length,
      
      // Tax details
      taxInclusive: invoice.lineAmountTypes?.toString() === 'Inclusive',
      lineAmountTypes: invoice.lineAmountTypes?.toString() || 'Exclusive',
      
      // Xero-specific fields
      brandingThemeId: invoice.brandingThemeID,
      invoiceUrl: invoice.url,
      repeatingInvoiceId: invoice.repeatingInvoiceID,
      hasAttachments: invoice.hasAttachments || false,
      sentToContact: invoice.sentToContact || false,
      
      // Provider sync data
      providerData: {
        xero: {
          invoiceID: invoice.invoiceID,
          status: invoice.status,
          updatedDateUTC: invoice.updatedDateUTC,
          hasErrors: invoice.hasErrors || false,
          validationErrors: invoice.validationErrors,
          warnings: invoice.warnings,
          statusAttributeString: invoice.statusAttributeString,
          cISDeduction: invoice.cISDeduction
        }
      },
      
      metadata: {
        contact: invoice.contact,
        payments: invoice.payments,
        creditNotes: invoice.creditNotes,
        prepayments: invoice.prepayments,
        overpayments: invoice.overpayments,
        attachments: invoice.attachments?.length || 0
      },
      
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncedAt: new Date()
    }
  }
}