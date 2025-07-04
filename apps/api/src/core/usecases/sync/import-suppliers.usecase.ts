import * as crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { suppliers, importBatches } from '../../../database/schema'
import { getDatabase } from '../../../database/connection'
import { XeroProvider } from '../../../integrations/accounting/xero/xero.provider'
import logger from '../../../config/logger'
import { Contact } from 'xero-node'

export interface ImportSuppliersInput {
  integrationId: string
  tenantId: string
  options?: {
    modifiedSince?: Date
    includeArchived?: boolean
    dryRun?: boolean
  }
}

export interface ImportSuppliersOutput {
  totalFetched: number
  created: number
  updated: number
  errors: number
  errorDetails: string[]
}

export class ImportSuppliersUseCase {
  private db = getDatabase()

  constructor(
    private xeroProvider: XeroProvider
  ) {}

  async execute(input: ImportSuppliersInput): Promise<ImportSuppliersOutput> {
    const batchId = crypto.randomUUID()
    const startTime = Date.now()
    const errorDetails: string[] = []
    
    try {
      // Create import batch record
      await this.db.insert(importBatches).values({
          id: batchId,
          tenantId: input.tenantId,
          integrationId: input.integrationId,
          batchType: 'suppliers',
          importSource: 'xero',
          status: 'processing',
          startedAt: new Date(),
          totalRecords: 0,
          processedRecords: 0,
          failedRecords: 0,
          duplicateRecords: 0
        })
      
      // Fetch all contacts from Xero
      logger.info('Fetching contacts from Xero...', {
        modifiedSince: input.options?.modifiedSince,
        includeArchived: input.options?.includeArchived
      })
      
      const xeroContacts = await this.fetchAllContacts(input.options?.modifiedSince)
      const totalFetched = xeroContacts.length
      
      logger.info(`Fetched ${totalFetched} contacts from Xero`)
      
      // Get existing suppliers to determine updates vs creates
      const existingSuppliers = await this.db
        .select({
          id: suppliers.id,
          externalIds: suppliers.externalIds
        })
        .from(suppliers)
        .where(eq(suppliers.tenantId, input.tenantId))
      
      // Create lookup map
      const existingByXeroId = new Map<string, { id: string; externalIds: any[] }>()
      existingSuppliers.forEach(supplier => {
        const xeroExtId = supplier.externalIds?.find((ext: any) => ext.system === 'xero')
        if (xeroExtId) {
          existingByXeroId.set(xeroExtId.id, { id: supplier.id, externalIds: supplier.externalIds || [] })
        }
      })
      
      // Process contacts in batches
      const batchSize = 100
      let created = 0
      let updated = 0
      let errors = 0
      
      for (let i = 0; i < xeroContacts.length; i += batchSize) {
        const batch = xeroContacts.slice(i, i + batchSize)
        
        try {
          const result = await this.processBatch(
            batch,
            input.tenantId,
            input.integrationId,
            existingByXeroId
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
          
          logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(xeroContacts.length / batchSize)}`)
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
            status: errors > 0 ? 'completed_with_errors' : 'completed',
            completedAt: new Date(),
            totalRecords: totalFetched,
            processedRecords: totalFetched,
            importResults: {
              created: created,
              updated: updated,
              errors: errorDetails.length > 0 ? errorDetails.map(e => ({ message: e })) : []
            }
          })
          .where(eq(importBatches.id, batchId))
      }
      
      logger.info('Supplier import completed', {
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
      logger.error('Failed to import suppliers:', error)
      
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
  
  private async fetchAllContacts(modifiedSince?: Date): Promise<Contact[]> {
    const allContacts: Contact[] = []
    let page = 1
    let hasMore = true
    
    while (hasMore) {
      try {
        const response = await this.xeroProvider.executeApiCall(
          async (api, tenantId) => {
            return await api.getContacts(
              tenantId,
              modifiedSince,
              undefined, // where
              undefined, // order
              undefined, // iDs
              page,
              true, // includeArchived
              undefined, // summaryOnly
              undefined, // searchTerm
              100 // pageSize
            )
          }
        )
        
        if (response.body?.contacts) {
          allContacts.push(...response.body.contacts)
        }
        
        // Check if there are more pages
        hasMore = response.body?.contacts?.length === 100
        page++
      } catch (error) {
        logger.error('Error fetching contacts page', { page, error })
        throw error
      }
    }
    
    return allContacts
  }
  
  private async processBatch(
    contacts: Contact[],
    tenantId: string,
    integrationId: string,
    existingByXeroId: Map<string, { id: string; externalIds: any[] }>
  ): Promise<{ created: number; updated: number; errors: number; errorDetails: string[] }> {
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails: string[] = []
    
    const toCreate: any[] = []
    const toUpdate: { id: string; data: any }[] = []
    
    for (const contact of contacts) {
      try {
        // Use proper xero-node property
        const contactId = contact.contactID
        
        if (!contactId) {
          errors++
          errorDetails.push('Contact missing contactID')
          continue
        }
        
        const supplierData = this.mapXeroContactToSupplier(contact, tenantId, integrationId)
        const existing = existingByXeroId.get(contactId)
        
        if (existing) {
          // Update existing supplier
          toUpdate.push({
            id: existing.id,
            data: {
              ...supplierData,
              // Preserve existing external IDs and add/update Xero
              externalIds: this.mergeExternalIds(existing.externalIds, contactId),
              updatedAt: new Date()
            }
          })
        } else {
          // Create new supplier
          toCreate.push({
            ...supplierData,
            id: crypto.randomUUID(),
            externalIds: [{ system: 'xero', id: contactId }]
          })
        }
      } catch (error) {
        errors++
        const name = contact.name || 'unknown'
        errorDetails.push(`Contact ${name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    
    // Bulk insert new suppliers
    if (toCreate.length > 0) {
      await this.db.insert(suppliers).values(toCreate)
      created = toCreate.length
    }
    
    // Bulk update existing suppliers
    if (toUpdate.length > 0) {
      // Update each supplier individually (Drizzle doesn't support bulk updates well)
      for (const update of toUpdate) {
        await this.db
          .update(suppliers)
          .set(update.data)
          .where(eq(suppliers.id, update.id))
      }
      updated = toUpdate.length
    }
    
    return { created, updated, errors, errorDetails }
  }
  
  private mapXeroContactToSupplier(contact: Contact, tenantId: string, integrationId: string): any {
    // Use proper xero-node properties
    const addresses = contact.addresses || []
    const phones = contact.phones || []
    
    // Find primary addresses and phones
    const postalAddress = addresses.find(a => a.addressType?.toString() === 'POBOX') || addresses[0]
    const streetAddress = addresses.find(a => a.addressType?.toString() === 'STREET') || addresses[0]
    const primaryPhone = phones.find(p => p.phoneType?.toString() === 'DEFAULT') || phones[0]
    const mobilePhone = phones.find(p => p.phoneType?.toString() === 'MOBILE')
    
    return {
      tenantId,
      integrationId,
      name: contact.name || '',
      displayName: contact.name,
      firstName: contact.firstName,
      lastName: contact.lastName,
      emailAddress: contact.emailAddress,
      contactStatus: contact.contactStatus?.toString() === 'ACTIVE' ? 'active' : 'inactive',
      isSupplier: contact.isSupplier,
      isCustomer: contact.isCustomer,
      
      // Address fields
      addressLine1: streetAddress?.addressLine1,
      addressLine2: streetAddress?.addressLine2,
      addressLine3: streetAddress?.addressLine3,
      addressLine4: streetAddress?.addressLine4,
      city: streetAddress?.city,
      region: streetAddress?.region,
      postalCode: streetAddress?.postalCode || postalAddress?.postalCode,
      country: streetAddress?.country || postalAddress?.country,
      
      // Phone fields
      phone: primaryPhone?.phoneNumber,
      mobilePhone: mobilePhone?.phoneNumber,
      
      // Financial fields
      taxIdentifier: contact.taxNumber,
      defaultCurrency: contact.defaultCurrency,
      bankAccountDetails: contact.bankAccountDetails,
      
      // Xero-specific fields
      contactGroups: contact.contactGroups?.map(g => g.name),
      xeroNetworkKey: contact.xeroNetworkKey,
      salesDefaultAccountCode: contact.salesDefaultAccountCode,
      purchasesDefaultAccountCode: contact.purchasesDefaultAccountCode,
      salesTrackingCategories: contact.salesTrackingCategories,
      purchasesTrackingCategories: contact.purchasesTrackingCategories,
      trackingCategoryName: contact.trackingCategoryName,
      trackingCategoryOption: contact.trackingCategoryOption,
      paymentTerms: contact.paymentTerms,
      
      // Payment details
      accountNumber: contact.accountNumber,
      accountsReceivableTaxType: contact.accountsReceivableTaxType,
      accountsPayableTaxType: contact.accountsPayableTaxType,
      
      // Discount
      defaultDiscountRate: contact.discount,
      
      // Provider sync data
      providerSyncData: {
        lastSyncedAt: new Date().toISOString(),
        xeroUpdatedDateUTC: contact.updatedDateUTC,
        hasValidationErrors: contact.hasValidationErrors || false,
        validationErrors: contact.validationErrors
      },
      
      // All addresses and phones as metadata
      addresses: contact.addresses,
      phoneNumbers: contact.phones,
      contactPersons: contact.contactPersons,
      
      // Additional metadata
      metadata: {
        isArchived: contact.contactStatus?.toString() === 'ARCHIVED',
        brandingTheme: contact.brandingTheme,
        website: contact.website,
        batchPayments: contact.batchPayments,
        balances: contact.balances,
        attachments: contact.attachments?.length || 0
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  private mergeExternalIds(existing: any[], xeroContactId: string): any[] {
    const result = [...(existing || [])]
    const xeroIndex = result.findIndex(ext => ext.system === 'xero')
    
    if (xeroIndex >= 0) {
      result[xeroIndex] = { system: 'xero', id: xeroContactId }
    } else {
      result.push({ system: 'xero', id: xeroContactId })
    }
    
    return result
  }
}