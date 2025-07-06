export interface SupplierDatabaseRow {
  id: string
  tenant_id: string
  
  // Core identification
  name: string
  display_name: string | null
  legal_name: string | null
  trading_names: any // JSON array
  
  // Individual names (for Xero compatibility)
  first_name: string | null
  last_name: string | null
  
  // External identifiers
  external_ids: any // JSON array of {system: string, id: string}
  company_number: string | null
  
  // Contact information
  primary_email: string | null
  additional_emails: any // JSON array
  primary_phone: string | null
  additional_phones: any // JSON array
  website: string | null
  
  // Main address (JSON)
  main_address: any
  shipping_addresses: any // JSON array
  billing_addresses: any // JSON array
  
  // Tax information
  tax_number: string | null
  tax_number_type: string | null
  secondary_tax_numbers: any // JSON object
  tax_exempt: boolean
  tax_exemption_reason: string | null
  
  // Banking
  default_currency: string | null
  main_bank_account: any // JSON object
  additional_bank_accounts: any // JSON array
  
  // Payment terms
  payment_terms_days: number | null
  payment_terms_type: string | null
  payment_terms_description: string | null
  credit_limit: string | null // Amount as string
  credit_limit_currency: string | null
  
  // Classification
  supplier_type: string
  is_active: boolean
  is_individual: boolean
  contact_status: string
  
  // AI/Enhancement
  normalized_name: string | null
  name_tokens: any // JSON array
  industry_code: string | null
  supplier_size: string | null
  
  // Metadata
  tags: any // JSON array
  custom_fields: any // JSON object
  notes: string | null
  metadata: any // JSON object
  
  // Quality
  data_quality_score: number | null
  verified_date: Date | null
  verification_source: string | null
  
  // Audit
  created_at: Date
  updated_at: Date
  created_by: string | null
  last_synced_at: Date | null
  sync_version: number
}