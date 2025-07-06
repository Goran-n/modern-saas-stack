import { z } from 'zod'
import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'
import { Money } from '../shared/value-objects/money'

// Value Objects and Types
export const supplierTypeSchema = z.enum(['supplier', 'customer', 'both', 'employee', 'other'])
export type SupplierType = z.infer<typeof supplierTypeSchema>

export const contactStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'GDPR_ERASED'])
export type ContactStatus = z.infer<typeof contactStatusSchema>

export const paymentTermsTypeSchema = z.enum(['NET', 'EOM', 'COD', 'CIA', 'DUEDATE'])
export type PaymentTermsType = z.infer<typeof paymentTermsTypeSchema>

export interface Address {
  type?: string
  line1: string
  line2?: string
  line3?: string
  line4?: string
  city: string
  stateProvince: string
  postalCode: string
  countryCode: string
  countryName?: string
}

export interface BankAccount {
  accountName: string
  accountNumber: string
  accountType?: string
  bankName: string
  bankBranch?: string
  swiftCode?: string
  routingNumber?: string
}

export interface ExternalId {
  system: string
  id: string
}

export interface SupplierEntityProps {
  id: EntityId
  tenantId: string
  
  // Core identification
  name: string
  displayName: string | null
  legalName: string | null
  tradingNames: string[]
  
  // Individual names (for Xero compatibility)
  firstName: string | null
  lastName: string | null
  
  // External identifiers
  externalIds: ExternalId[]
  companyNumber: string | null
  
  // Contact information
  primaryEmail: string | null
  additionalEmails: string[]
  primaryPhone: string | null
  additionalPhones: string[]
  website: string | null
  
  // Main address
  mainAddress: Address | null
  shippingAddresses: Address[]
  billingAddresses: Address[]
  
  // Tax information
  taxNumber: string | null
  taxNumberType: string | null
  secondaryTaxNumbers: Record<string, string>
  taxExempt: boolean
  taxExemptionReason: string | null
  
  // Banking
  defaultCurrency: string | null
  mainBankAccount: BankAccount | null
  additionalBankAccounts: BankAccount[]
  
  // Payment terms
  paymentTermsDays: number | null
  paymentTermsType: PaymentTermsType | null
  paymentTermsDescription: string | null
  creditLimit: Money | null
  
  // Classification
  supplierType: SupplierType
  isActive: boolean
  isIndividual: boolean
  contactStatus: ContactStatus
  
  // AI/Enhancement
  normalizedName: string | null
  nameTokens: string[]
  industryCode: string | null
  supplierSize: string | null
  
  // Metadata
  tags: string[]
  customFields: Record<string, any>
  notes: string | null
  metadata: Record<string, any>
  
  // Quality
  dataQualityScore: number | null
  verifiedDate: Date | null
  verificationSource: string | null
  
  // Audit
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  lastSyncedAt: Date | null
  syncVersion: number
}

export class SupplierEntity extends BaseEntity<SupplierEntityProps> {
  private constructor(props: SupplierEntityProps) {
    super(props)
  }

  static create(props: Omit<SupplierEntityProps, 'id' | 'normalizedName' | 'nameTokens' | 'createdAt' | 'updatedAt' | 'syncVersion'> & {
    displayName?: string | null
  }): SupplierEntity {
    const now = new Date()
    
    // Generate display name if not provided
    const displayName = props.displayName || props.name
    
    // Normalize name for searching
    const normalizedName = props.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    // Generate name tokens for search
    const nameTokens = props.name.toLowerCase().split(/\s+/).filter(token => token.length > 0)
    
    return new SupplierEntity({
      ...props,
      id: EntityId.generate(),
      displayName,
      normalizedName,
      nameTokens,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
    })
  }

  static fromDatabase(props: SupplierEntityProps): SupplierEntity {
    return new SupplierEntity(props)
  }

  // Getters
  get id(): EntityId { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get name(): string { return this.props.name }
  get displayName(): string { return this.props.displayName || this.props.name }
  get primaryEmail(): string | null { return this.props.primaryEmail }
  get primaryPhone(): string | null { return this.props.primaryPhone }
  get supplierType(): SupplierType { return this.props.supplierType }
  get isActive(): boolean { return this.props.isActive }
  get contactStatus(): ContactStatus { return this.props.contactStatus }
  get taxNumber(): string | null { return this.props.taxNumber }
  get creditLimit(): Money | null { return this.props.creditLimit }

  // Domain logic
  canReceivePayments(): boolean {
    return this.props.isActive && this.props.contactStatus === 'ACTIVE'
  }

  hasValidBankAccount(): boolean {
    return !!this.props.mainBankAccount && 
           !!this.props.mainBankAccount.accountNumber &&
           !!this.props.mainBankAccount.bankName
  }

  isOverCreditLimit(currentBalance: Money): boolean {
    if (!this.props.creditLimit) {
      return false // No limit set
    }
    return currentBalance.greaterThan(this.props.creditLimit)
  }

  getPaymentDueDays(): number {
    return this.props.paymentTermsDays || 30 // Default to 30 days
  }

  // Mutations
  updateContactInfo(updates: {
    primaryEmail?: string | null
    primaryPhone?: string | null
    website?: string | null
  }): void {
    if (updates.primaryEmail !== undefined) {
      this.props.primaryEmail = updates.primaryEmail
    }
    if (updates.primaryPhone !== undefined) {
      this.props.primaryPhone = updates.primaryPhone
    }
    if (updates.website !== undefined) {
      this.props.website = updates.website
    }
    this.touch()
  }

  updateMainAddress(address: Address): void {
    this.props.mainAddress = address
    this.touch()
  }

  addShippingAddress(address: Address): void {
    this.props.shippingAddresses.push(address)
    this.touch()
  }

  addBillingAddress(address: Address): void {
    this.props.billingAddresses.push(address)
    this.touch()
  }

  updateTaxInfo(taxInfo: {
    taxNumber?: string | null
    taxNumberType?: string | null
    taxExempt?: boolean
    taxExemptionReason?: string | null
  }): void {
    if (taxInfo.taxNumber !== undefined) {
      this.props.taxNumber = taxInfo.taxNumber
    }
    if (taxInfo.taxNumberType !== undefined) {
      this.props.taxNumberType = taxInfo.taxNumberType
    }
    if (taxInfo.taxExempt !== undefined) {
      this.props.taxExempt = taxInfo.taxExempt
    }
    if (taxInfo.taxExemptionReason !== undefined) {
      this.props.taxExemptionReason = taxInfo.taxExemptionReason
    }
    this.touch()
  }

  updateBankAccount(bankAccount: BankAccount): void {
    this.props.mainBankAccount = bankAccount
    this.touch()
  }

  addAdditionalBankAccount(bankAccount: BankAccount): void {
    this.props.additionalBankAccounts.push(bankAccount)
    this.touch()
  }

  updatePaymentTerms(terms: {
    paymentTermsDays?: number | null
    paymentTermsType?: PaymentTermsType | null
    paymentTermsDescription?: string | null
    creditLimit?: Money | null
  }): void {
    if (terms.paymentTermsDays !== undefined) {
      this.props.paymentTermsDays = terms.paymentTermsDays
    }
    if (terms.paymentTermsType !== undefined) {
      this.props.paymentTermsType = terms.paymentTermsType
    }
    if (terms.paymentTermsDescription !== undefined) {
      this.props.paymentTermsDescription = terms.paymentTermsDescription
    }
    if (terms.creditLimit !== undefined) {
      this.props.creditLimit = terms.creditLimit
    }
    this.touch()
  }

  activate(): void {
    this.props.isActive = true
    this.props.contactStatus = 'ACTIVE'
    this.touch()
  }

  deactivate(): void {
    this.props.isActive = false
    this.touch()
  }

  archive(): void {
    this.props.contactStatus = 'ARCHIVED'
    this.props.isActive = false
    this.touch()
  }

  eraseForGDPR(): void {
    // Clear personal information
    this.props.contactStatus = 'GDPR_ERASED'
    this.props.isActive = false
    this.props.primaryEmail = null
    this.props.additionalEmails = []
    this.props.primaryPhone = null
    this.props.additionalPhones = []
    this.props.firstName = null
    this.props.lastName = null
    this.props.mainAddress = null
    this.props.shippingAddresses = []
    this.props.billingAddresses = []
    this.props.notes = null
    
    // Keep business-critical data
    this.props.metadata = {
      ...this.props.metadata,
      gdprErasedAt: new Date().toISOString()
    }
    
    this.touch()
  }

  addTag(tag: string): void {
    if (!this.props.tags.includes(tag)) {
      this.props.tags.push(tag)
      this.touch()
    }
  }

  removeTag(tag: string): void {
    const index = this.props.tags.indexOf(tag)
    if (index > -1) {
      this.props.tags.splice(index, 1)
      this.touch()
    }
  }

  addExternalId(system: string, id: string): void {
    // Check if already exists
    const existing = this.props.externalIds.find(ext => ext.system === system)
    if (existing) {
      existing.id = id
    } else {
      this.props.externalIds.push({ system, id })
    }
    this.touch()
  }

  verify(source: string): void {
    this.props.verifiedDate = new Date()
    this.props.verificationSource = source
    
    // Calculate data quality score based on completeness
    let score = 0
    let fields = 0
    
    // Required fields
    if (this.props.name) { score += 20; fields += 20; }
    if (this.props.primaryEmail || this.props.primaryPhone) { score += 20; fields += 20; }
    if (this.props.mainAddress) { score += 20; fields += 20; }
    if (this.props.taxNumber) { score += 20; fields += 20; }
    if (this.props.mainBankAccount) { score += 20; fields += 20; }
    
    this.props.dataQualityScore = (score / fields) * 100
    this.touch()
  }

  updateSyncInfo(syncedAt: Date): void {
    this.props.lastSyncedAt = syncedAt
    this.props.syncVersion += 1
    this.touch()
  }

  toDatabase(): SupplierEntityProps {
    return { ...this.props }
  }
}