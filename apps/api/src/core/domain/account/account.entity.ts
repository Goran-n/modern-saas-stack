import { z } from 'zod'
import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'
import { Money } from '../shared/value-objects/money'

// Value Objects and Types
export const accountTypeSchema = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])
export type AccountType = z.infer<typeof accountTypeSchema>

export const accountSubtypeSchema = z.enum([
  'CURRENT_ASSET', 'FIXED_ASSET', 'NON_CURRENT_ASSET',
  'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY',
  'BANK', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'INVENTORY',
  'DIRECT_COSTS', 'OVERHEAD', 'OTHER_EXPENSE',
  'SALES', 'OTHER_INCOME'
])
export type AccountSubtype = z.infer<typeof accountSubtypeSchema>

export const bankAccountTypeSchema = z.enum(['CHECKING', 'SAVINGS', 'CREDITCARD', 'LOAN', 'OTHER'])
export type BankAccountType = z.infer<typeof bankAccountTypeSchema>

export const taxTypeSchema = z.enum(['NONE', 'INPUT', 'OUTPUT', 'BASEXCLUDED'])
export type TaxType = z.infer<typeof taxTypeSchema>

export interface SpendingPatterns {
  averageMonthly?: number
  seasonality?: Record<string, any>
  commonAmounts?: number[]
}

export interface AccountEntityProps {
  id: EntityId
  tenantId: string
  
  // Account identification
  code: string
  name: string
  displayName: string | null
  description: string | null
  
  // Classification
  accountType: AccountType
  accountSubtype: AccountSubtype | null
  accountClass: string | null
  
  // Hierarchy
  parentAccountId: string | null
  hierarchyLevel: number
  hierarchyPath: string | null
  isParent: boolean
  
  // Tax configuration
  defaultTaxCode: string | null
  taxType: TaxType | null
  taxLocked: boolean
  
  // Properties
  isActive: boolean
  isSystemAccount: boolean
  isBankAccount: boolean
  bankAccountType: BankAccountType | null
  currencyCode: string | null
  
  // Xero-specific
  enablePaymentsToAccount: boolean
  showInExpenseClaims: boolean
  addToWatchlist: boolean
  
  // Reporting
  reportingCode: string | null
  reportingCategory: string | null
  excludeFromReports: boolean
  
  // AI categorization
  categoryKeywords: string[]
  typicalVendors: string[]
  spendingPatterns: SpendingPatterns
  
  // Usage tracking
  transactionCount: number
  lastUsedDate: Date | null
  totalDebits: Money | null
  totalCredits: Money | null
  
  // Budget
  budgetTracking: boolean
  budgetOwner: string | null
  
  // Metadata
  customFields: Record<string, any>
  notes: string | null
  metadata: Record<string, any>
  
  // Audit
  createdAt: Date
  updatedAt: Date
  createdBy: string
  lastSyncedAt: Date | null
}

export class AccountEntity extends BaseEntity<AccountEntityProps> {
  private constructor(props: AccountEntityProps) {
    super(props)
  }

  static create(props: Omit<AccountEntityProps, 'id' | 'hierarchyLevel' | 'hierarchyPath' | 'isParent' | 'transactionCount' | 'lastUsedDate' | 'totalDebits' | 'totalCredits' | 'createdAt' | 'updatedAt' | 'createdBy'>): AccountEntity {
    const now = new Date()
    
    // Calculate hierarchy level based on parent
    const hierarchyLevel = props.parentAccountId ? 1 : 0 // This would need adjustment based on actual parent's level
    
    // Generate hierarchy path
    const hierarchyPath = props.parentAccountId 
      ? `${props.parentAccountId}/${EntityId.generate()}`
      : EntityId.generate().toString()
    
    return new AccountEntity({
      ...props,
      id: EntityId.generate(),
      hierarchyLevel,
      hierarchyPath,
      isParent: false,
      transactionCount: 0,
      lastUsedDate: null,
      totalDebits: props.currencyCode ? Money.zero(props.currencyCode) : null,
      totalCredits: props.currencyCode ? Money.zero(props.currencyCode) : null,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    })
  }

  static fromDatabase(props: AccountEntityProps): AccountEntity {
    return new AccountEntity(props)
  }

  // Getters
  get id(): EntityId { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get code(): string { return this.props.code }
  get name(): string { return this.props.name }
  get displayName(): string { return this.props.displayName || this.props.name }
  get accountType(): AccountType { return this.props.accountType }
  get accountSubtype(): AccountSubtype | null { return this.props.accountSubtype }
  get isActive(): boolean { return this.props.isActive }
  get isBankAccount(): boolean { return this.props.isBankAccount }
  get currencyCode(): string | null { return this.props.currencyCode }
  get balance(): Money | null {
    if (!this.props.totalDebits || !this.props.totalCredits) {
      return null
    }
    
    // Calculate balance based on account type
    switch (this.props.accountType) {
      case 'ASSET':
      case 'EXPENSE':
        // Debit accounts: balance = debits - credits
        return this.props.totalDebits.subtract(this.props.totalCredits)
      case 'LIABILITY':
      case 'EQUITY':
      case 'REVENUE':
        // Credit accounts: balance = credits - debits
        return this.props.totalCredits.subtract(this.props.totalDebits)
      default:
        return null
    }
  }

  // Domain logic
  canBeDeleted(): boolean {
    return !this.props.isSystemAccount && 
           this.props.transactionCount === 0 && 
           !this.props.isParent
  }

  canBeDeactivated(): boolean {
    return !this.props.isSystemAccount && this.props.isActive
  }

  canHaveTransactions(): boolean {
    return this.props.isActive && !this.props.isParent
  }

  isDebitAccount(): boolean {
    return ['ASSET', 'EXPENSE'].includes(this.props.accountType)
  }

  isCreditAccount(): boolean {
    return ['LIABILITY', 'EQUITY', 'REVENUE'].includes(this.props.accountType)
  }

  requiresTaxCode(): boolean {
    return this.props.taxType !== 'NONE' && !this.props.taxLocked
  }

  // Mutations
  updateDetails(updates: {
    name?: string
    displayName?: string | null
    description?: string | null
    reportingCode?: string | null
    reportingCategory?: string | null
  }): void {
    if (updates.name !== undefined) {
      this.props.name = updates.name
    }
    if (updates.displayName !== undefined) {
      this.props.displayName = updates.displayName
    }
    if (updates.description !== undefined) {
      this.props.description = updates.description
    }
    if (updates.reportingCode !== undefined) {
      this.props.reportingCode = updates.reportingCode
    }
    if (updates.reportingCategory !== undefined) {
      this.props.reportingCategory = updates.reportingCategory
    }
    this.touch()
  }

  updateTaxSettings(settings: {
    defaultTaxCode?: string | null
    taxType?: TaxType | null
    taxLocked?: boolean
  }): void {
    if (settings.defaultTaxCode !== undefined) {
      this.props.defaultTaxCode = settings.defaultTaxCode
    }
    if (settings.taxType !== undefined) {
      this.props.taxType = settings.taxType
    }
    if (settings.taxLocked !== undefined) {
      this.props.taxLocked = settings.taxLocked
    }
    this.touch()
  }

  updateBankSettings(settings: {
    isBankAccount?: boolean
    bankAccountType?: BankAccountType | null
    currencyCode?: string | null
    enablePaymentsToAccount?: boolean
  }): void {
    if (settings.isBankAccount !== undefined) {
      this.props.isBankAccount = settings.isBankAccount
    }
    if (settings.bankAccountType !== undefined) {
      this.props.bankAccountType = settings.bankAccountType
    }
    if (settings.currencyCode !== undefined) {
      this.props.currencyCode = settings.currencyCode
      // Reset totals with new currency
      if (settings.currencyCode) {
        this.props.totalDebits = Money.zero(settings.currencyCode)
        this.props.totalCredits = Money.zero(settings.currencyCode)
      }
    }
    if (settings.enablePaymentsToAccount !== undefined) {
      this.props.enablePaymentsToAccount = settings.enablePaymentsToAccount
    }
    this.touch()
  }

  recordTransaction(amount: Money, isDebit: boolean): void {
    if (!this.canHaveTransactions()) {
      throw new Error('Account cannot have transactions')
    }
    
    if (this.props.currencyCode && amount.getCurrency() !== this.props.currencyCode) {
      throw new Error('Transaction currency does not match account currency')
    }
    
    // Update totals
    if (isDebit) {
      this.props.totalDebits = this.props.totalDebits 
        ? this.props.totalDebits.add(amount)
        : amount
    } else {
      this.props.totalCredits = this.props.totalCredits
        ? this.props.totalCredits.add(amount)
        : amount
    }
    
    // Update usage tracking
    this.props.transactionCount += 1
    this.props.lastUsedDate = new Date()
    
    this.touch()
  }

  activate(): void {
    if (this.props.isSystemAccount) {
      throw new Error('Cannot modify system account status')
    }
    this.props.isActive = true
    this.touch()
  }

  deactivate(): void {
    if (!this.canBeDeactivated()) {
      throw new Error('Account cannot be deactivated')
    }
    this.props.isActive = false
    this.touch()
  }

  setParent(parentAccountId: string | null, parentLevel: number = 0): void {
    this.props.parentAccountId = parentAccountId
    this.props.hierarchyLevel = parentAccountId ? parentLevel + 1 : 0
    
    // Update hierarchy path
    if (parentAccountId) {
      this.props.hierarchyPath = `${parentAccountId}/${this.props.id.toString()}`
    } else {
      this.props.hierarchyPath = this.props.id.toString()
    }
    
    this.touch()
  }

  markAsParent(): void {
    this.props.isParent = true
    this.touch()
  }

  addToWatchlist(): void {
    this.props.addToWatchlist = true
    this.touch()
  }

  removeFromWatchlist(): void {
    this.props.addToWatchlist = false
    this.touch()
  }

  updateReportingSettings(settings: {
    excludeFromReports?: boolean
    showInExpenseClaims?: boolean
  }): void {
    if (settings.excludeFromReports !== undefined) {
      this.props.excludeFromReports = settings.excludeFromReports
    }
    if (settings.showInExpenseClaims !== undefined) {
      this.props.showInExpenseClaims = settings.showInExpenseClaims
    }
    this.touch()
  }

  addCategoryKeyword(keyword: string): void {
    if (!this.props.categoryKeywords.includes(keyword)) {
      this.props.categoryKeywords.push(keyword)
      this.touch()
    }
  }

  addTypicalVendor(vendor: string): void {
    if (!this.props.typicalVendors.includes(vendor)) {
      this.props.typicalVendors.push(vendor)
      this.touch()
    }
  }

  updateSpendingPatterns(patterns: Partial<SpendingPatterns>): void {
    this.props.spendingPatterns = {
      ...this.props.spendingPatterns,
      ...patterns
    }
    this.touch()
  }

  enableBudgetTracking(owner: string): void {
    this.props.budgetTracking = true
    this.props.budgetOwner = owner
    this.touch()
  }

  disableBudgetTracking(): void {
    this.props.budgetTracking = false
    this.props.budgetOwner = null
    this.touch()
  }

  updateSyncInfo(syncedAt: Date): void {
    this.props.lastSyncedAt = syncedAt
    this.touch()
  }

  toDatabase(): AccountEntityProps {
    return { ...this.props }
  }
}