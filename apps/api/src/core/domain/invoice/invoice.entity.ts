import { z } from 'zod'
import { BaseEntity } from '../base.entity'
import { EntityId } from '../shared/value-objects/entity-id'
import { Money } from '../shared/value-objects/money'

// Value Objects and Types
export const invoiceTypeSchema = z.enum(['bill', 'invoice', 'credit_note', 'debit_note'])
export type InvoiceType = z.infer<typeof invoiceTypeSchema>

export const invoiceSubtypeSchema = z.enum(['recurring', 'deposit', 'progress', 'prepayment'])
export type InvoiceSubtype = z.infer<typeof invoiceSubtypeSchema>

export const invoiceStatusSchema = z.enum(['draft', 'submitted', 'approved', 'paid', 'void', 'deleted'])
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'not_required'])
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>

export const lineAmountTypeSchema = z.enum(['Exclusive', 'Inclusive', 'NoTax'])
export type LineAmountType = z.infer<typeof lineAmountTypeSchema>

export interface InvoiceLineItem {
  lineNumber: number
  description: string
  quantity: number
  unitPrice: Money
  discountPercentage?: number
  discountAmount?: Money
  taxRate?: number
  taxAmount?: Money
  totalAmount: Money
  accountCode?: string
  trackingCategories?: Record<string, any>
  customFields?: Record<string, any>
}

export interface TaxDetails {
  rates?: Record<string, number>
  amounts?: Record<string, Money>
  exemptions?: string[]
  taxPointDate?: Date
}

export interface InvoiceEntityProps {
  id: EntityId
  tenantId: string
  integrationId: string | null
  providerInvoiceId: string
  
  // Invoice identification
  invoiceType: InvoiceType
  invoiceSubtype: InvoiceSubtype | null
  status: InvoiceStatus
  invoiceNumber: string | null
  reference: string | null
  
  // Dates
  invoiceDate: Date | null
  dueDate: Date | null
  serviceDate: Date | null
  periodStartDate: Date | null
  periodEndDate: Date | null
  
  // Supplier
  supplierId: string | null
  supplierName: string | null
  
  // Financial amounts
  subtotalAmount: Money | null
  discountAmount: Money | null
  discountPercentage: number | null
  taxAmount: Money | null
  totalAmount: Money
  
  // Payment tracking
  amountPaid: Money
  amountCredited: Money
  amountDue: Money
  fullyPaid: boolean
  paymentDate: Date | null
  paymentMethod: string | null
  expectedPaymentDate: Date | null
  plannedPaymentDate: Date | null
  
  // Line items
  lineItems: InvoiceLineItem[]
  lineItemsCount: number
  
  // Tax details
  taxInclusive: boolean
  taxCalculationType: string | null
  lineAmountTypes: LineAmountType
  taxDetails: TaxDetails
  
  // Approval
  approvalStatus: ApprovalStatus | null
  approvedBy: string | null
  approvedAt: Date | null
  approvalNotes: string | null
  
  // Processing
  needsReview: boolean
  reviewNotes: string | null
  
  // Metadata
  metadata: Record<string, any>
  
  // Audit
  createdAt: Date
  updatedAt: Date
  importedAt: Date | null
  lastSyncedAt: Date | null
  syncVersion: number
}

export class InvoiceEntity extends BaseEntity<InvoiceEntityProps> {
  private constructor(props: InvoiceEntityProps) {
    super(props)
  }

  static create(props: Omit<InvoiceEntityProps, 'id' | 'amountDue' | 'fullyPaid' | 'lineItemsCount' | 'createdAt' | 'updatedAt' | 'syncVersion'> & {
    amountPaid?: Money
    amountCredited?: Money
  }): InvoiceEntity {
    const now = new Date()
    
    // Calculate amount due
    const amountDue = props.totalAmount.subtract(
      props.amountPaid || Money.zero(props.totalAmount.getCurrency())
    ).subtract(
      props.amountCredited || Money.zero(props.totalAmount.getCurrency())
    )
    
    return new InvoiceEntity({
      ...props,
      id: EntityId.generate(),
      amountPaid: props.amountPaid || Money.zero(props.totalAmount.getCurrency()),
      amountCredited: props.amountCredited || Money.zero(props.totalAmount.getCurrency()),
      amountDue: amountDue,
      fullyPaid: amountDue.isZero(),
      lineItemsCount: props.lineItems.length,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
    })
  }

  static fromDatabase(props: InvoiceEntityProps): InvoiceEntity {
    return new InvoiceEntity(props)
  }

  // Getters
  get id(): EntityId { return this.props.id }
  get tenantId(): string { return this.props.tenantId }
  get invoiceType(): InvoiceType { return this.props.invoiceType }
  get status(): InvoiceStatus { return this.props.status }
  get invoiceNumber(): string | null { return this.props.invoiceNumber }
  get totalAmount(): Money { return this.props.totalAmount }
  get amountDue(): Money { return this.props.amountDue }
  get dueDate(): Date | null { return this.props.dueDate }
  get supplierId(): string | null { return this.props.supplierId }
  get supplierName(): string | null { return this.props.supplierName }
  get lineItems(): InvoiceLineItem[] { return this.props.lineItems }
  get fullyPaid(): boolean { return this.props.fullyPaid }
  get needsReview(): boolean { return this.props.needsReview }

  // Domain logic
  isOverdue(): boolean {
    if (!this.props.dueDate || this.props.fullyPaid) {
      return false
    }
    return new Date() > this.props.dueDate
  }

  canBeApproved(): boolean {
    return this.props.status === 'submitted' && !this.props.approvalStatus
  }

  canBePaid(): boolean {
    return ['approved', 'submitted'].includes(this.props.status) && !this.props.fullyPaid
  }

  canBeVoided(): boolean {
    return !['void', 'deleted', 'paid'].includes(this.props.status)
  }

  approve(approvedBy: string, notes?: string): void {
    if (!this.canBeApproved()) {
      throw new Error('Invoice cannot be approved in current state')
    }
    
    this.props.status = 'approved'
    this.props.approvalStatus = 'approved'
    this.props.approvedBy = approvedBy
    this.props.approvedAt = new Date()
    if (notes) {
      this.props.approvalNotes = notes
    }
    this.touch()
  }

  reject(rejectedBy: string, notes: string): void {
    if (!this.canBeApproved()) {
      throw new Error('Invoice cannot be rejected in current state')
    }
    
    this.props.approvalStatus = 'rejected'
    this.props.approvedBy = rejectedBy
    this.props.approvedAt = new Date()
    this.props.approvalNotes = notes
    this.touch()
  }

  recordPayment(amount: Money, paymentDate: Date, paymentMethod?: string): void {
    if (!this.canBePaid()) {
      throw new Error('Invoice cannot be paid in current state')
    }
    
    if (amount.greaterThan(this.props.amountDue)) {
      throw new Error('Payment amount exceeds amount due')
    }
    
    this.props.amountPaid = this.props.amountPaid.add(amount)
    this.props.amountDue = this.props.amountDue.subtract(amount)
    this.props.fullyPaid = this.props.amountDue.isZero()
    
    if (this.props.fullyPaid) {
      this.props.status = 'paid'
      this.props.paymentDate = paymentDate
    }
    
    if (paymentMethod) {
      this.props.paymentMethod = paymentMethod
    }
    
    this.touch()
  }

  recordCredit(creditAmount: Money): void {
    if (creditAmount.greaterThan(this.props.amountDue)) {
      throw new Error('Credit amount exceeds amount due')
    }
    
    this.props.amountCredited = this.props.amountCredited.add(creditAmount)
    this.props.amountDue = this.props.amountDue.subtract(creditAmount)
    this.props.fullyPaid = this.props.amountDue.isZero()
    
    if (this.props.fullyPaid) {
      this.props.status = 'paid'
    }
    
    this.touch()
  }

  void(reason?: string): void {
    if (!this.canBeVoided()) {
      throw new Error('Invoice cannot be voided in current state')
    }
    
    this.props.status = 'void'
    if (reason) {
      this.props.metadata = {
        ...this.props.metadata,
        voidReason: reason,
        voidedAt: new Date().toISOString()
      }
    }
    this.touch()
  }

  markForReview(notes: string): void {
    this.props.needsReview = true
    this.props.reviewNotes = notes
    this.touch()
  }

  clearReview(): void {
    this.props.needsReview = false
    this.props.reviewNotes = null
    this.touch()
  }

  updatePaymentPlan(expectedDate?: Date, plannedDate?: Date): void {
    if (expectedDate) {
      this.props.expectedPaymentDate = expectedDate
    }
    if (plannedDate) {
      this.props.plannedPaymentDate = plannedDate
    }
    this.touch()
  }

  updateSyncInfo(syncedAt: Date): void {
    this.props.lastSyncedAt = syncedAt
    this.props.syncVersion += 1
    this.touch()
  }

  // Calculations
  calculateTotalTax(): Money {
    if (this.props.taxAmount) {
      return this.props.taxAmount
    }
    
    // Calculate from line items
    const currency = this.props.totalAmount.getCurrency()
    let totalTax = Money.zero(currency)
    
    for (const item of this.props.lineItems) {
      if (item.taxAmount) {
        totalTax = totalTax.add(item.taxAmount)
      }
    }
    
    return totalTax
  }

  calculateSubtotal(): Money {
    if (this.props.subtotalAmount) {
      return this.props.subtotalAmount
    }
    
    // Calculate from line items
    const currency = this.props.totalAmount.getCurrency()
    let subtotal = Money.zero(currency)
    
    for (const item of this.props.lineItems) {
      const lineSubtotal = item.unitPrice.multiply(item.quantity)
      if (item.discountAmount) {
        subtotal = subtotal.add(lineSubtotal.subtract(item.discountAmount))
      } else if (item.discountPercentage) {
        const discount = lineSubtotal.multiply(item.discountPercentage / 100)
        subtotal = subtotal.add(lineSubtotal.subtract(discount))
      } else {
        subtotal = subtotal.add(lineSubtotal)
      }
    }
    
    return subtotal
  }

  toDatabase(): InvoiceEntityProps {
    return { ...this.props }
  }
}