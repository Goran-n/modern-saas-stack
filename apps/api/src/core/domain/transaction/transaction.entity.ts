import { z } from 'zod'
import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'

export const providerTypeSchema = z.enum(['xero', 'quickbooks', 'bank_direct', 'manual', 'csv_import'])
export type ProviderType = z.infer<typeof providerTypeSchema>

export const transactionStatusSchema = z.enum(['pending', 'cleared', 'reconciled', 'disputed', 'void'])
export type TransactionStatus = z.infer<typeof transactionStatusSchema>

export const enrichmentStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed'])
export type EnrichmentStatus = z.infer<typeof enrichmentStatusSchema>

export interface TransactionEntityProps {
  id: EntityId
  tenantId: string
  integrationId: string | null
  providerTransactionId: string | null
  providerType: ProviderType
  
  // Core transaction data
  transactionDate: Date
  postedDate: Date | null
  amount: string // Decimal as string for precision
  currency: string
  
  // Multi-currency support
  exchangeRate: string | null
  baseCurrencyAmount: string | null
  
  // Source account information (matches database schema)
  sourceAccountId: string | null
  sourceAccountName: string | null
  sourceAccountType: string | null
  
  // Banking specific fields
  balanceAfter: string | null
  transactionFee: string | null
  
  // Transaction details (matches database schema)
  rawDescription: string | null
  transactionReference: string | null
  memo: string | null
  
  // Reconciliation status
  isReconciled: boolean
  reconciledAt: Date | null
  reconciledBy: string | null
  
  // Status tracking
  status: TransactionStatus
  
  // Provider-specific raw data
  providerData: Record<string, unknown>
  
  // AI/Enrichment pipeline
  enrichmentStatus: EnrichmentStatus
  aiCategory: string | null
  aiConfidence: string | null
  aiTags: string[]
  aiSupplierMatch: string | null
  
  // Audit trail
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  createdBy: string | null
  updatedBy: string | null
  version: number
}

export class TransactionEntity extends BaseEntity<TransactionEntityProps> {
  private constructor(props: TransactionEntityProps) {
    super(props)
  }

  static create(props: Omit<TransactionEntityProps, 'id' | 'isReconciled' | 'reconciledAt' | 'reconciledBy' | 'status' | 'enrichmentStatus' | 'aiTags' | 'createdAt' | 'updatedAt' | 'syncedAt' | 'version'>): TransactionEntity {
    const now = new Date()
    return new TransactionEntity({
      ...props,
      id: EntityId.generate(),
      isReconciled: false,
      reconciledAt: null,
      reconciledBy: null,
      status: 'pending',
      enrichmentStatus: 'pending',
      aiTags: [],
      createdAt: now,
      updatedAt: now,
      syncedAt: now,
      version: 1,
    })
  }

  static fromDatabase(props: TransactionEntityProps): TransactionEntity {
    return new TransactionEntity(props)
  }

  get id(): EntityId { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get integrationId(): string | null { return this.props.integrationId }
  get providerTransactionId(): string | null { return this.props.providerTransactionId }
  get providerType(): ProviderType { return this.props.providerType }
  get transactionDate(): Date { return this.props.transactionDate }
  get postedDate(): Date | null { return this.props.postedDate }
  get amount(): string { return this.props.amount }
  get currency(): string { return this.props.currency }
  get exchangeRate(): string | null { return this.props.exchangeRate }
  get baseCurrencyAmount(): string | null { return this.props.baseCurrencyAmount }
  get sourceAccountId(): string | null { return this.props.sourceAccountId }
  get sourceAccountName(): string | null { return this.props.sourceAccountName }
  get sourceAccountType(): string | null { return this.props.sourceAccountType }
  get balanceAfter(): string | null { return this.props.balanceAfter }
  get transactionFee(): string | null { return this.props.transactionFee }
  get rawDescription(): string | null { return this.props.rawDescription }
  get transactionReference(): string | null { return this.props.transactionReference }
  get memo(): string | null { return this.props.memo }
  get isReconciled(): boolean { return this.props.isReconciled }
  get reconciledAt(): Date | null { return this.props.reconciledAt }
  get reconciledBy(): string | null { return this.props.reconciledBy }
  get status(): TransactionStatus { return this.props.status }
  get providerData(): Record<string, unknown> { return this.props.providerData }
  get enrichmentStatus(): EnrichmentStatus { return this.props.enrichmentStatus }
  get aiCategory(): string | null { return this.props.aiCategory }
  get aiConfidence(): string | null { return this.props.aiConfidence }
  get aiTags(): string[] { return this.props.aiTags }
  get aiSupplierMatch(): string | null { return this.props.aiSupplierMatch }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get syncedAt(): Date | null { return this.props.syncedAt }
  get createdBy(): string | null { return this.props.createdBy }
  get updatedBy(): string | null { return this.props.updatedBy }
  get version(): number { return this.props.version }

  isPending(): boolean {
    return this.props.status === 'pending'
  }

  isCleared(): boolean {
    return this.props.status === 'cleared'
  }

  isDisputed(): boolean {
    return this.props.status === 'disputed'
  }

  isVoid(): boolean {
    return this.props.status === 'void'
  }

  needsEnrichment(): boolean {
    return this.props.enrichmentStatus === 'pending'
  }

  isEnrichmentComplete(): boolean {
    return this.props.enrichmentStatus === 'completed'
  }

  hasAiSuggestions(): boolean {
    return this.props.aiCategory !== null || 
           this.props.aiSupplierMatch !== null || 
           this.props.aiTags.length > 0
  }

  updateStatus(status: TransactionStatus, updatedBy: string): void {
    this.props.status = status
    this.props.updatedBy = updatedBy
    this.touch()
  }

  markAsCleared(postedDate: Date, updatedBy: string): void {
    this.props.status = 'cleared'
    this.props.postedDate = postedDate
    this.props.updatedBy = updatedBy
    this.touch()
  }

  reconcile(userId: string): void {
    if (this.props.isReconciled) {
      throw new Error('Transaction is already reconciled')
    }
    
    this.props.isReconciled = true
    this.props.reconciledAt = new Date()
    this.props.reconciledBy = userId
    this.props.status = 'reconciled'
    this.props.updatedBy = userId
    this.touch()
  }

  unreconcile(userId: string): void {
    if (!this.props.isReconciled) {
      throw new Error('Transaction is not reconciled')
    }
    
    this.props.isReconciled = false
    this.props.reconciledAt = null
    this.props.reconciledBy = null
    this.props.status = this.props.postedDate ? 'cleared' : 'pending'
    this.props.updatedBy = userId
    this.touch()
  }

  startEnrichment(): void {
    if (this.props.enrichmentStatus !== 'pending') {
      throw new Error(`Cannot start enrichment for transaction in ${this.props.enrichmentStatus} status`)
    }
    
    this.props.enrichmentStatus = 'processing'
    this.touch()
  }

  completeEnrichment(enrichmentData: {
    category?: string
    confidence?: string
    tags?: string[]
    supplierMatch?: string
  }): void {
    if (this.props.enrichmentStatus !== 'processing') {
      throw new Error(`Cannot complete enrichment for transaction in ${this.props.enrichmentStatus} status`)
    }
    
    this.props.enrichmentStatus = 'completed'
    
    if (enrichmentData.category) {
      this.props.aiCategory = enrichmentData.category
    }
    
    if (enrichmentData.confidence) {
      this.props.aiConfidence = enrichmentData.confidence
    }
    
    if (enrichmentData.tags) {
      this.props.aiTags = enrichmentData.tags
    }
    
    if (enrichmentData.supplierMatch) {
      this.props.aiSupplierMatch = enrichmentData.supplierMatch
    }
    
    this.touch()
  }

  failEnrichment(): void {
    if (this.props.enrichmentStatus !== 'processing') {
      throw new Error(`Cannot fail enrichment for transaction in ${this.props.enrichmentStatus} status`)
    }
    
    this.props.enrichmentStatus = 'failed'
    this.touch()
  }

  updateProviderData(data: Record<string, unknown>): void {
    this.props.providerData = { ...this.props.providerData, ...data }
    this.touch()
  }

  updateRawDescription(rawDescription: string, updatedBy: string): void {
    this.props.rawDescription = rawDescription
    this.props.updatedBy = updatedBy
    this.touch()
  }

  updateMemo(memo: string, updatedBy: string): void {
    this.props.memo = memo
    this.props.updatedBy = updatedBy
    this.touch()
  }

  markAsImported(integrationId: string): void {
    this.props.integrationId = integrationId
    this.props.syncedAt = new Date()
    this.touch()
  }


  toDatabase(): TransactionEntityProps {
    return { ...this.props }
  }

  toPublic(): Omit<TransactionEntityProps, 'tenantId' | 'providerData'> {
    const { tenantId: _tenantId, providerData: _providerData, ...publicProps } = this.props
    return publicProps
  }
}