export interface InvoiceDatabaseRow {
  id: string
  tenant_id: string
  integration_id: string | null
  provider_invoice_id: string
  
  // Invoice identification
  invoice_type: string
  invoice_subtype: string | null
  status: string
  invoice_number: string | null
  reference: string | null
  
  // Dates
  invoice_date: Date | null
  due_date: Date | null
  service_date: Date | null
  period_start_date: Date | null
  period_end_date: Date | null
  
  // Supplier
  supplier_id: string | null
  supplier_name: string | null
  
  // Financial amounts (stored as strings for precision)
  subtotal_amount: string | null
  discount_amount: string | null
  discount_percentage: string | null
  tax_amount: string | null
  total_amount: string
  currency_code: string
  
  // Payment tracking
  amount_paid: string
  amount_credited: string
  amount_due: string
  fully_paid: boolean
  payment_date: Date | null
  payment_method: string | null
  expected_payment_date: Date | null
  planned_payment_date: Date | null
  
  // Line items (JSON)
  line_items: any
  line_items_count: number
  
  // Tax details (JSON)
  tax_inclusive: boolean
  tax_calculation_type: string | null
  line_amount_types: string
  tax_details: any
  
  // Approval
  approval_status: string | null
  approved_by: string | null
  approved_at: Date | null
  approval_notes: string | null
  
  // Processing
  needs_review: boolean
  review_notes: string | null
  
  // Metadata (JSON)
  metadata: any
  
  // Audit
  created_at: Date
  updated_at: Date
  imported_at: Date | null
  last_synced_at: Date | null
  sync_version: number
}

export interface InvoiceLineItemDatabaseRow {
  line_number: number
  description: string
  quantity: number
  unit_price: string
  discount_percentage?: number
  discount_amount?: string
  tax_rate?: number
  tax_amount?: string
  total_amount: string
  account_code?: string
  tracking_categories?: any
  custom_fields?: any
}

export interface TaxDetailsDatabaseRow {
  rates?: Record<string, number>
  amounts?: Record<string, string>
  exemptions?: string[]
  tax_point_date?: string
}