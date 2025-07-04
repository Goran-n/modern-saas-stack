import { eq, and, between, inArray, sql } from 'drizzle-orm'
import { accounts, suppliers, invoices, transactions } from '../../database/schema'
import { getDatabase } from '../../database/connection'
import logger from '../../config/logger'

export interface EntityLookupMaps {
  accounts: {
    byProviderId: Map<string, string>
    byCode: Map<string, string>
    byName: Map<string, string>
  }
  suppliers: {
    byProviderId: Map<string, string>
    byName: Map<string, string>
    byCleanName: Map<string, string>
  }
  invoices: {
    byProviderId: Map<string, string>
    byNumber: Map<string, string>
  }
  transactions: {
    byProviderId: Map<string, string>
  }
}

export class EntityLookupService {
  private cache: Map<string, EntityLookupMaps> = new Map()
  private db = getDatabase()

  constructor() {}

  async buildLookupMaps(tenantId: string, provider: string = 'xero'): Promise<EntityLookupMaps> {
    const cacheKey = `${tenantId}-${provider}`
    
    if (this.cache.has(cacheKey)) {
      logger.debug(`Using cached lookup maps for tenant ${tenantId}`)
      return this.cache.get(cacheKey)!
    }

    logger.info(`Building lookup maps for tenant ${tenantId}, provider ${provider}`)

    const [accountsList, suppliersList, invoicesList, transactionsList] = await Promise.all([
      this.db.select().from(accounts).where(eq(accounts.tenantId, tenantId)),
      this.db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)),
      this.db.select().from(invoices).where(eq(invoices.tenantId, tenantId)),
      this.db.select().from(transactions).where(eq(transactions.tenantId, tenantId))
    ])

    const lookupMaps: EntityLookupMaps = {
      accounts: {
        byProviderId: new Map(),
        byCode: new Map(),
        byName: new Map()
      },
      suppliers: {
        byProviderId: new Map(),
        byName: new Map(),
        byCleanName: new Map()
      },
      invoices: {
        byProviderId: new Map(),
        byNumber: new Map()
      },
      transactions: {
        byProviderId: new Map()
      }
    }

    // Build account lookups
    accountsList.forEach(account => {
      const providerAccountIds = account.providerAccountIds as Record<string, string> | null
      const providerId = providerAccountIds?.[provider]
      if (providerId && typeof providerId === 'string') {
        lookupMaps.accounts.byProviderId.set(providerId, account.id as string)
      }
      if (account.code && typeof account.code === 'string') {
        lookupMaps.accounts.byCode.set(account.code, account.id as string)
      }
      if (account.name && typeof account.name === 'string') {
        lookupMaps.accounts.byName.set(account.name.toLowerCase(), account.id as string)
      }
    })

    // Build supplier lookups
    suppliersList.forEach(supplier => {
      const xeroId = supplier.externalIds?.find((ext: any) => ext.system === provider)?.id
      if (xeroId) {
        lookupMaps.suppliers.byProviderId.set(xeroId, supplier.id)
      }
      if (supplier.name) {
        lookupMaps.suppliers.byName.set(supplier.name.toLowerCase(), supplier.id)
      }
      if (supplier.normalizedName) {
        lookupMaps.suppliers.byCleanName.set(supplier.normalizedName, supplier.id)
      }
    })

    // Build invoice lookups
    invoicesList.forEach(invoice => {
      if (invoice.providerInvoiceId) {
        lookupMaps.invoices.byProviderId.set(invoice.providerInvoiceId, invoice.id)
      }
      if (invoice.invoiceNumber) {
        lookupMaps.invoices.byNumber.set(invoice.invoiceNumber, invoice.id)
      }
    })

    // Build transaction lookups
    transactionsList.forEach(transaction => {
      if (transaction.providerTransactionId) {
        lookupMaps.transactions.byProviderId.set(transaction.providerTransactionId, transaction.id)
      }
    })

    this.cache.set(cacheKey, lookupMaps)
    
    logger.info(`Lookup maps built: ${accountsList.length} accounts, ${suppliersList.length} suppliers, ${invoicesList.length} invoices, ${transactionsList.length} transactions`)

    return lookupMaps
  }

  clearCache(tenantId?: string, provider?: string) {
    if (tenantId && provider) {
      this.cache.delete(`${tenantId}-${provider}`)
    } else if (tenantId) {
      // Clear all providers for a tenant
      Array.from(this.cache.keys())
        .filter(key => key.startsWith(`${tenantId}-`))
        .forEach(key => this.cache.delete(key))
    } else {
      // Clear entire cache
      this.cache.clear()
    }
  }

  async findAccountId(
    lookupMaps: EntityLookupMaps,
    providerId?: string,
    code?: string,
    name?: string
  ): Promise<string | undefined> {
    if (providerId) {
      const id = lookupMaps.accounts.byProviderId.get(providerId)
      if (id) return id
    }
    
    if (code) {
      const id = lookupMaps.accounts.byCode.get(code)
      if (id) return id
    }
    
    if (name) {
      const id = lookupMaps.accounts.byName.get(name.toLowerCase())
      if (id) return id
    }
    
    return undefined
  }

  async findSupplierId(
    lookupMaps: EntityLookupMaps,
    providerId?: string,
    name?: string
  ): Promise<string | undefined> {
    if (providerId) {
      const id = lookupMaps.suppliers.byProviderId.get(providerId)
      if (id) return id
    }
    
    if (name) {
      // Try exact match first
      let id = lookupMaps.suppliers.byName.get(name.toLowerCase())
      if (id) return id
      
      // Try clean name match
      const cleanName = this.cleanSupplierName(name)
      id = lookupMaps.suppliers.byCleanName.get(cleanName)
      if (id) return id
    }
    
    return undefined
  }

  async findInvoiceId(
    lookupMaps: EntityLookupMaps,
    providerId?: string,
    invoiceNumber?: string
  ): Promise<string | undefined> {
    if (providerId) {
      const id = lookupMaps.invoices.byProviderId.get(providerId)
      if (id) return id
    }
    
    if (invoiceNumber) {
      const id = lookupMaps.invoices.byNumber.get(invoiceNumber)
      if (id) return id
    }
    
    return undefined
  }

  async findTransactionId(
    lookupMaps: EntityLookupMaps,
    providerId: string
  ): Promise<string | undefined> {
    return lookupMaps.transactions.byProviderId.get(providerId)
  }

  private cleanSupplierName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
  }

  async matchTransactionToInvoice(
    tenantId: string,
    transaction: {
      supplierId?: string
      amount: number
      transactionDate: Date
    }
  ): Promise<string | undefined> {
    if (!transaction.supplierId) {
      return undefined
    }

    // Find invoices from the same supplier with matching amount
    const dateStart = new Date(transaction.transactionDate)
    dateStart.setDate(dateStart.getDate() - 3)
    
    const dateEnd = new Date(transaction.transactionDate)
    dateEnd.setDate(dateEnd.getDate() + 3)

    const matchingInvoices = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.supplierId, transaction.supplierId),
          sql`${invoices.totalAmount} = ${Math.abs(transaction.amount)}`,
          between(invoices.invoiceDate, dateStart.toISOString().split('T')[0], dateEnd.toISOString().split('T')[0]),
          inArray(invoices.status, ['authorized', 'paid'])
        )
      )

    if (matchingInvoices.length === 1) {
      logger.debug(`Found matching invoice for transaction: ${matchingInvoices[0].id}`)
      return matchingInvoices[0].id
    } else if (matchingInvoices.length > 1) {
      logger.warn(`Found ${matchingInvoices.length} potential invoice matches for transaction`)
    }

    return undefined
  }
}