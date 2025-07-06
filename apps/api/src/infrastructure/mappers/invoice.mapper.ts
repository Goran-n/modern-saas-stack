import { InvoiceEntity, InvoiceLineItem, TaxDetails } from '../../core/domain/invoice/invoice.entity'
import { EntityId } from '../../core/domain/shared/value-objects/entity-id'
import { Money } from '../../core/domain/shared/value-objects/money'
import type { InvoiceDatabaseRow, InvoiceLineItemDatabaseRow, TaxDetailsDatabaseRow } from '../persistence/types/invoice.types'

export class InvoiceMapper {
  static toDomain(row: InvoiceDatabaseRow): InvoiceEntity {
    const lineItems: InvoiceLineItem[] = row.line_items ? JSON.parse(row.line_items).map((item: InvoiceLineItemDatabaseRow) => ({
      lineNumber: item.line_number,
      description: item.description,
      quantity: item.quantity,
      unitPrice: new Money(item.unit_price, row.currency_code),
      discountPercentage: item.discount_percentage,
      discountAmount: item.discount_amount ? new Money(item.discount_amount, row.currency_code) : undefined,
      taxRate: item.tax_rate,
      taxAmount: item.tax_amount ? new Money(item.tax_amount, row.currency_code) : undefined,
      totalAmount: new Money(item.total_amount, row.currency_code),
      accountCode: item.account_code,
      trackingCategories: item.tracking_categories,
      customFields: item.custom_fields,
    })) : []

    const taxDetails: TaxDetails = {}
    if (row.tax_details) {
      if (row.tax_details.rates !== undefined) {
        taxDetails.rates = row.tax_details.rates
      }
      if (row.tax_details.amounts !== undefined) {
        taxDetails.amounts = Object.entries(row.tax_details.amounts).reduce((acc, [key, value]) => {
          acc[key] = new Money(value as string, row.currency_code)
          return acc
        }, {} as Record<string, Money>)
      }
      if (row.tax_details.exemptions !== undefined) {
        taxDetails.exemptions = row.tax_details.exemptions
      }
      if (row.tax_details.tax_point_date !== undefined) {
        taxDetails.taxPointDate = new Date(row.tax_details.tax_point_date)
      }
    }

    return InvoiceEntity.fromDatabase({
      id: EntityId.from(row.id),
      tenantId: row.tenant_id,
      integrationId: row.integration_id,
      providerInvoiceId: row.provider_invoice_id,
      
      // Invoice identification
      invoiceType: row.invoice_type as any,
      invoiceSubtype: row.invoice_subtype as any,
      status: row.status as any,
      invoiceNumber: row.invoice_number,
      reference: row.reference,
      
      // Dates
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      serviceDate: row.service_date,
      periodStartDate: row.period_start_date,
      periodEndDate: row.period_end_date,
      
      // Supplier
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      
      // Financial amounts
      subtotalAmount: row.subtotal_amount ? new Money(row.subtotal_amount, row.currency_code) : null,
      discountAmount: row.discount_amount ? new Money(row.discount_amount, row.currency_code) : null,
      discountPercentage: row.discount_percentage ? parseFloat(row.discount_percentage) : null,
      taxAmount: row.tax_amount ? new Money(row.tax_amount, row.currency_code) : null,
      totalAmount: new Money(row.total_amount, row.currency_code),
      
      // Payment tracking
      amountPaid: new Money(row.amount_paid, row.currency_code),
      amountCredited: new Money(row.amount_credited, row.currency_code),
      amountDue: new Money(row.amount_due, row.currency_code),
      fullyPaid: row.fully_paid,
      paymentDate: row.payment_date,
      paymentMethod: row.payment_method,
      expectedPaymentDate: row.expected_payment_date,
      plannedPaymentDate: row.planned_payment_date,
      
      // Line items
      lineItems,
      lineItemsCount: row.line_items_count,
      
      // Tax details
      taxInclusive: row.tax_inclusive,
      taxCalculationType: row.tax_calculation_type,
      lineAmountTypes: row.line_amount_types as any,
      taxDetails,
      
      // Approval
      approvalStatus: row.approval_status as any,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      approvalNotes: row.approval_notes,
      
      // Processing
      needsReview: row.needs_review,
      reviewNotes: row.review_notes,
      
      // Metadata
      metadata: row.metadata || {},
      
      // Audit
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      importedAt: row.imported_at,
      lastSyncedAt: row.last_synced_at,
      syncVersion: row.sync_version,
    })
  }

  static toDatabase(entity: InvoiceEntity): InvoiceDatabaseRow {
    const props = entity.toDatabase()
    
    const lineItems = props.lineItems.map(item => ({
      line_number: item.lineNumber,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice.toString(),
      discount_percentage: item.discountPercentage,
      discount_amount: item.discountAmount?.toString(),
      tax_rate: item.taxRate,
      tax_amount: item.taxAmount?.toString(),
      total_amount: item.totalAmount.toString(),
      account_code: item.accountCode,
      tracking_categories: item.trackingCategories,
      custom_fields: item.customFields,
    }))

    const taxDetailsData = props.taxDetails
    const taxDetails: TaxDetailsDatabaseRow = {}
    if (taxDetailsData.rates !== undefined) taxDetails.rates = taxDetailsData.rates
    if (taxDetailsData.amounts !== undefined) {
      taxDetails.amounts = Object.entries(taxDetailsData.amounts).reduce((acc, [key, value]) => {
        acc[key] = (value as Money).toString()
        return acc
      }, {} as Record<string, string>)
    }
    if (taxDetailsData.exemptions !== undefined) taxDetails.exemptions = taxDetailsData.exemptions
    if (taxDetailsData.taxPointDate !== undefined) taxDetails.tax_point_date = taxDetailsData.taxPointDate.toISOString()

    return {
      id: props.id.toString(),
      tenant_id: props.tenantId,
      integration_id: props.integrationId,
      provider_invoice_id: props.providerInvoiceId,
      
      // Invoice identification
      invoice_type: props.invoiceType,
      invoice_subtype: props.invoiceSubtype,
      status: props.status,
      invoice_number: props.invoiceNumber,
      reference: props.reference,
      
      // Dates
      invoice_date: props.invoiceDate,
      due_date: props.dueDate,
      service_date: props.serviceDate,
      period_start_date: props.periodStartDate,
      period_end_date: props.periodEndDate,
      
      // Supplier
      supplier_id: props.supplierId,
      supplier_name: props.supplierName,
      
      // Financial amounts (stored as strings for precision)
      subtotal_amount: props.subtotalAmount?.toString() || null,
      discount_amount: props.discountAmount?.toString() || null,
      discount_percentage: props.discountPercentage?.toString() || null,
      tax_amount: props.taxAmount?.toString() || null,
      total_amount: props.totalAmount.toString(),
      currency_code: props.totalAmount.getCurrency(),
      
      // Payment tracking
      amount_paid: props.amountPaid.toString(),
      amount_credited: props.amountCredited.toString(),
      amount_due: props.amountDue.toString(),
      fully_paid: props.fullyPaid,
      payment_date: props.paymentDate,
      payment_method: props.paymentMethod,
      expected_payment_date: props.expectedPaymentDate,
      planned_payment_date: props.plannedPaymentDate,
      
      // Line items (JSON)
      line_items: JSON.stringify(lineItems),
      line_items_count: props.lineItemsCount,
      
      // Tax details (JSON)
      tax_inclusive: props.taxInclusive,
      tax_calculation_type: props.taxCalculationType,
      line_amount_types: props.lineAmountTypes,
      tax_details: JSON.stringify(taxDetails),
      
      // Approval
      approval_status: props.approvalStatus,
      approved_by: props.approvedBy,
      approved_at: props.approvedAt,
      approval_notes: props.approvalNotes,
      
      // Processing
      needs_review: props.needsReview,
      review_notes: props.reviewNotes,
      
      // Metadata (JSON)
      metadata: JSON.stringify(props.metadata),
      
      // Audit
      created_at: props.createdAt,
      updated_at: props.updatedAt,
      imported_at: props.importedAt,
      last_synced_at: props.lastSyncedAt,
      sync_version: props.syncVersion,
    }
  }
}