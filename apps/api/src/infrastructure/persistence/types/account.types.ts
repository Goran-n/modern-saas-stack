export interface AccountDatabaseRow {
  id: string
  tenant_id: string
  
  // Account identification
  code: string
  name: string
  display_name: string | null
  description: string | null
  
  // Classification
  account_type: string
  account_subtype: string | null
  account_class: string | null
  
  // Hierarchy
  parent_account_id: string | null
  hierarchy_level: number
  hierarchy_path: string | null
  is_parent: boolean
  
  // Tax configuration
  default_tax_code: string | null
  tax_type: string | null
  tax_locked: boolean
  
  // Properties
  is_active: boolean
  is_system_account: boolean
  is_bank_account: boolean
  bank_account_type: string | null
  currency_code: string | null
  
  // Xero-specific
  enable_payments_to_account: boolean
  show_in_expense_claims: boolean
  add_to_watchlist: boolean
  
  // Reporting
  reporting_code: string | null
  reporting_category: string | null
  exclude_from_reports: boolean
  
  // AI categorization (JSON)
  category_keywords: any
  typical_vendors: any
  spending_patterns: any
  
  // Usage tracking
  transaction_count: number
  last_used_date: Date | null
  total_debits: string | null // Amount as string
  total_credits: string | null // Amount as string
  
  // Budget
  budget_tracking: boolean
  budget_owner: string | null
  
  // Metadata (JSON)
  custom_fields: any
  notes: string | null
  metadata: any
  
  // Audit
  created_at: Date
  updated_at: Date
  created_by: string
  last_synced_at: Date | null
}