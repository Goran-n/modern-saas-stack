# Universal Data Import Schema for Kibly

## Overview

This document outlines the universal database schemas required for importing financial data from multiple accounting providers (Xero, QuickBooks, Sage, etc.) into Kibly's platform. These schemas are designed to be platform-agnostic while handling all edge cases and variations found in different accounting systems.

## Core Import Requirements

### 1. Suppliers/Contacts
**Purpose**: Import vendor and customer information from accounting systems.

**Data Sources**:
- Xero: Contacts API
- QuickBooks: Vendors & Customers API
- Sage: Suppliers API
- Direct Import: CSV files

**Key Challenges**:
- Some systems combine suppliers and customers
- Address formats vary by country
- Tax number formats differ globally
- Payment terms stored differently

### 2. Invoices/Bills
**Purpose**: Import purchase invoices (bills) and sales invoices.

**Data Sources**:
- Xero: Invoices API (Type: ACCPAY for bills)
- QuickBooks: Bills & Invoices API
- Sage: Purchase Invoices API
- Direct Import: PDF extraction, CSV

**Key Challenges**:
- Different status values across systems
- Line items structure variations
- Tax handling differences
- Multi-currency complications

### 3. Chart of Accounts
**Purpose**: Import account codes and categories for transaction classification.

**Data Sources**:
- Xero: Accounts API
- QuickBooks: Accounts API
- Sage: Nominal Codes API
- Direct Import: CSV

**Key Challenges**:
- Account numbering schemes vary
- Hierarchy depth differences
- Tax type associations
- System accounts that can't be modified

### 4. Bank Transactions
**Purpose**: Import reconciled transactions from accounting systems.

**Data Sources**:
- Xero: Bank Transactions API
- QuickBooks: Bank Transactions API
- Sage: Bank API
- Direct Import: OFX, CSV, QIF

**Key Challenges**:
- Only reconciled transactions available via API
- Different reconciliation status indicators
- Split transactions handling
- Foreign currency transactions

### 5. Bank Statements
**Purpose**: Import raw bank data for reconciliation.

**Data Sources**:
- Direct Bank APIs (Plaid, TrueLayer)
- File Upload: OFX, QIF, CSV
- Bank Feeds: Where available
- Manual Entry: For missing data

**Key Challenges**:
- No standard format across banks
- Description parsing requirements
- Duplicate detection
- Balance reconciliation

## Universal Schema Designs

### 1. Suppliers Schema

```sql
CREATE TABLE suppliers (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Core Identification (Required)
  name VARCHAR(500) NOT NULL, -- Legal entity name for matching
  display_name VARCHAR(500), -- UI-friendly name if different from legal name
  
  -- Additional Names (Edge Cases)
  legal_name VARCHAR(500), -- Official registered business name
  trading_names TEXT[], -- Array of DBAs, trade names, aliases
  
  -- Individual Contact Names (for Xero compatibility)
  first_name VARCHAR(255), -- First name for individual contacts
  last_name VARCHAR(255), -- Last name for individual contacts
  
  -- External System Identifiers
  external_ids JSONB DEFAULT '[]', /* Array of external system references:
    [
      {"system": "xero", "id": "contact-guid"},
      {"system": "salesforce", "id": "003D000001"},
      {"system": "custom_erp", "id": "CUST-12345"}
    ]
  */
  company_number VARCHAR(50), -- Business registration number
  
  -- Contact Information (All Optional)
  primary_email VARCHAR(255), -- Main contact email
  additional_emails TEXT[], -- Array for accounts payable, orders, etc.
  primary_phone VARCHAR(100), -- Main contact number
  additional_phones TEXT[], -- Array for different departments
  website VARCHAR(500), -- Company website
  
  -- Address Fields (Flexible Structure)
  -- Separate fields for better querying and global compatibility
  address_line1 VARCHAR(500), -- Street address
  address_line2 VARCHAR(500), -- Suite, apartment, building
  address_line3 VARCHAR(500), -- District, area (used in some countries)
  address_line4 VARCHAR(500), -- Additional line (used in some countries)
  city VARCHAR(255), -- City/town
  state_province VARCHAR(255), -- State, Province, County, Prefecture
  postal_code VARCHAR(50), -- ZIP, postcode, etc.
  country_code VARCHAR(2), -- ISO 2-letter code for validation
  country_name VARCHAR(100), -- Full country name for display
  
  -- Additional addresses as JSONB for multiple locations
  shipping_addresses JSONB DEFAULT '[]', -- Array of address objects with type
  billing_addresses JSONB DEFAULT '[]', -- Array of address objects with type
  /* Address object structure:
    {
      "type": "STREET", -- STREET, POBOX (Xero compatibility)
      "line1": "123 Main St",
      "line2": "Suite 100",
      "city": "New York",
      "region": "NY",
      "postal_code": "10001",
      "country": "US"
    }
  */
  
  -- Tax Information (Global Support)
  tax_number VARCHAR(100), -- Primary tax ID (VAT, EIN, ABN, etc.)
  tax_number_type VARCHAR(50), -- Type of tax number for validation
  secondary_tax_numbers JSONB DEFAULT '{}', -- {"state_tax": "123", "city_tax": "456"}
  tax_exempt BOOLEAN DEFAULT false, -- Exempt from collecting tax
  tax_exemption_reason VARCHAR(255), -- Reason/certificate for exemption
  
  -- Default Tax Types (Xero compatibility)
  default_tax_type_sales VARCHAR(50), -- Default tax for sales to this contact
  default_tax_type_purchases VARCHAR(50), -- Default tax for purchases from this contact
  
  -- Banking Information (Optional)
  default_currency VARCHAR(3), -- ISO currency code for this supplier
  bank_account_name VARCHAR(255), -- Account holder name
  bank_account_number VARCHAR(100), -- Encrypted account number
  bank_account_type VARCHAR(50), -- CHECKING, SAVINGS, etc.
  bank_name VARCHAR(255), -- Financial institution name
  bank_branch VARCHAR(255), -- Branch code/name
  bank_swift_code VARCHAR(20), -- SWIFT/BIC for international
  bank_routing_number VARCHAR(50), -- ABA, sort code, BSB, etc.
  additional_bank_accounts JSONB DEFAULT '[]', -- Array for multiple accounts
  
  -- Payment Terms
  payment_terms_days INTEGER, -- Number of days (30 for Net 30)
  payment_terms_type VARCHAR(50), -- NET, EOM, COD, CIA, DUEDATE
  payment_terms_description TEXT, -- Human-readable full terms
  credit_limit DECIMAL(18,2), -- Maximum credit extended
  
  -- Classification
  supplier_type VARCHAR(50) DEFAULT 'supplier', -- supplier, customer, both, employee
  is_active BOOLEAN DEFAULT true, -- Still doing business
  is_individual BOOLEAN DEFAULT false, -- Person vs Company (for 1099s)
  
  -- Contact Status (Xero compatibility)
  contact_status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED, GDPR_ERASED
  
  -- Provider Mappings (Critical for Sync)
  provider_ids JSONB DEFAULT '{}', -- {"xero": "uuid", "quickbooks": "id"}
  provider_sync_data JSONB DEFAULT '{}', -- Last known state from provider
  
  -- AI Enhancement Fields
  normalized_name VARCHAR(500), -- Cleaned name for matching
  name_tokens TEXT[], -- Tokenized name parts for fuzzy matching
  industry_code VARCHAR(50), -- SIC/NAICS for categorization
  supplier_size VARCHAR(20), -- small, medium, large, enterprise
  
  -- Metadata
  tags TEXT[], -- User-defined categories
  custom_fields JSONB DEFAULT '{}', -- Provider-specific fields
  notes TEXT, -- Internal notes
  metadata JSONB DEFAULT '{}', -- Arbitrary key-value pairs for integrations
  
  -- Quality Indicators
  data_quality_score DECIMAL(3,2), -- 0-1 score for completeness
  verified_date DATE, -- Last manual verification
  verification_source VARCHAR(50), -- who/what verified
  
  -- Audit Fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50), -- system, user, import
  last_synced_at TIMESTAMP, -- Last provider sync
  sync_version INTEGER DEFAULT 0, -- For conflict resolution
  
  -- Indexes
  CONSTRAINT unique_provider_supplier UNIQUE(tenant_id, provider_ids),
  INDEX idx_suppliers_tenant_name (tenant_id, name),
  INDEX idx_suppliers_normalized (tenant_id, normalized_name),
  INDEX idx_suppliers_tax_number (tenant_id, tax_number),
  INDEX idx_suppliers_email (tenant_id, primary_email),
  INDEX idx_suppliers_active (tenant_id, is_active),
  INDEX idx_suppliers_external_ids USING GIN (external_ids),
  INDEX idx_suppliers_status (tenant_id, contact_status)
);
```

### 2. Invoices Schema

```sql
CREATE TABLE invoices (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Source Tracking (Required)
  integration_id UUID REFERENCES integrations(id), -- Which connection
  provider_invoice_id VARCHAR(255) NOT NULL, -- Provider's unique ID
  
  -- Invoice Type & Status
  invoice_type VARCHAR(50) NOT NULL, -- bill, invoice, credit_note, debit_note
  invoice_subtype VARCHAR(50), -- recurring, deposit, progress, prepayment
  status VARCHAR(50) NOT NULL, -- draft, submitted, approved, paid, void, deleted
  
  -- Invoice Identification
  invoice_number VARCHAR(100), -- Human-readable number
  reference VARCHAR(500), -- PO number, contract ref, etc.
  
  -- Xero-specific Fields
  repeating_invoice_id VARCHAR(255), -- Link to repeating invoice template
  branding_theme_id VARCHAR(255), -- Invoice template/theme ID
  invoice_url VARCHAR(500), -- Public URL for online invoice
  
  -- Dates (Flexible)
  invoice_date DATE, -- Invoice issue date
  due_date DATE, -- Payment due date
  service_date DATE, -- When service was provided
  period_start_date DATE, -- For subscription/recurring
  period_end_date DATE, -- For subscription/recurring
  
  -- Parties
  supplier_id UUID REFERENCES suppliers(id), -- Link to supplier
  supplier_name VARCHAR(500), -- Denormalized for history
  
  -- Original Amounts (As per invoice)
  subtotal_amount DECIMAL(18,6), -- Before tax/discount
  discount_amount DECIMAL(18,6), -- Total discount value
  discount_percentage DECIMAL(5,2), -- If percentage-based
  tax_amount DECIMAL(18,6), -- Total tax
  total_amount DECIMAL(18,6) NOT NULL, -- Final amount due
  
  -- Currency (Multi-currency support)
  currency_code VARCHAR(3) NOT NULL, -- Invoice currency
  exchange_rate DECIMAL(18,10), -- To tenant's base currency
  base_currency_code VARCHAR(3), -- Tenant's base currency
  base_total_amount DECIMAL(18,6), -- Total in base currency
  
  -- Payment Tracking
  amount_paid DECIMAL(18,6) DEFAULT 0, -- Total payments received
  amount_credited DECIMAL(18,6) DEFAULT 0, -- Applied credit notes
  amount_due DECIMAL(18,6), -- Remaining balance
  
  -- Payment Information
  fully_paid BOOLEAN DEFAULT false, -- Convenience flag
  payment_date DATE, -- Date fully paid
  payment_method VARCHAR(50), -- How it was paid
  expected_payment_date DATE, -- For AR invoices (Xero compatibility)
  planned_payment_date DATE, -- For AP bills (Xero compatibility)
  
  -- Line Items (Embedded for performance)
  line_items JSONB DEFAULT '[]', /* Array of:
    {
      line_number: 1, -- Order of items
      description: "Product/Service", -- What was purchased
      quantity: 1.00, -- How many
      unit_price: 100.00, -- Price per unit
      discount_percentage: 0, -- Line-level discount
      discount_amount: 0, -- Line-level discount
      tax_rate: 0.20, -- Tax percentage
      tax_amount: 20.00, -- Calculated tax
      total_amount: 120.00, -- Line total
      account_code: "4000", -- GL account
      tracking_categories: {}, -- Cost centers
      custom_fields: {} -- Provider-specific
    }
  */
  line_items_count INTEGER DEFAULT 0, -- For quick queries
  
  -- Tax Details (Flexible for global support)
  tax_inclusive BOOLEAN DEFAULT true, -- Prices include tax?
  tax_calculation_type VARCHAR(50), -- line_items, invoice_level
  line_amount_types VARCHAR(20) DEFAULT 'Exclusive', -- Exclusive, Inclusive, NoTax (Xero)
  tax_details JSONB DEFAULT '{}', /* Global tax support:
    {
      "rates": {"VAT": 0.20, "PST": 0.07}, -- Multiple taxes
      "amounts": {"VAT": 100.00, "PST": 35.00},
      "exemptions": [], -- Tax-exempt items
      "tax_point_date": "2024-01-15" -- When tax is due
    }
  */
  
  -- Approval Workflow
  approval_status VARCHAR(50), -- pending, approved, rejected
  approved_by VARCHAR(255), -- Who approved
  approved_at TIMESTAMP, -- When approved
  approval_notes TEXT, -- Comments on approval
  
  -- Attachments
  has_attachments BOOLEAN DEFAULT false, -- Quick check
  attachment_count INTEGER DEFAULT 0, -- Number of files
  attachment_ids TEXT[], -- Provider attachment IDs
  
  -- AI Processing Fields
  extracted_entities JSONB DEFAULT '{}', /* AI-extracted data:
    {
      "vendor_name": "Acme Corp",
      "invoice_number": "INV-123",
      "amounts": {...},
      "line_items": [...],
      "confidence_scores": {...}
    }
  */
  ocr_processed BOOLEAN DEFAULT false, -- PDF/image processed
  ocr_confidence DECIMAL(3,2), -- OCR accuracy score
  
  -- Provider Data (Full object for edge cases)
  provider_data JSONB DEFAULT '{}', -- Complete provider response
  provider_updated_at TIMESTAMP, -- Last provider update
  
  -- Processing Flags
  needs_review BOOLEAN DEFAULT false, -- Requires manual check
  review_notes TEXT, -- Why review needed
  processing_errors JSONB DEFAULT '[]', -- Import/sync errors
  
  -- Custom Metadata
  metadata JSONB DEFAULT '{}', -- Arbitrary key-value pairs for integrations
  
  -- Audit Fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  imported_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  sync_version INTEGER DEFAULT 0, -- Optimistic locking
  
  -- Constraints
  CONSTRAINT unique_provider_invoice UNIQUE(tenant_id, integration_id, provider_invoice_id),
  
  -- Indexes
  INDEX idx_invoices_tenant_date (tenant_id, invoice_date DESC),
  INDEX idx_invoices_tenant_supplier (tenant_id, supplier_id),
  INDEX idx_invoices_tenant_status (tenant_id, status),
  INDEX idx_invoices_tenant_due (tenant_id, due_date) WHERE amount_due > 0,
  INDEX idx_invoices_needs_review (tenant_id, needs_review) WHERE needs_review = true
);
```

### 3. Chart of Accounts Schema

```sql
CREATE TABLE accounts (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Account Identification
  code VARCHAR(50) NOT NULL, -- Account number/code
  name VARCHAR(500) NOT NULL, -- Account name
  display_name VARCHAR(500), -- UI-friendly name
  description TEXT, -- Account description (Xero compatibility)
  
  -- Account Classification (Standard)
  account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  account_subtype VARCHAR(100), -- CURRENT_ASSET, FIXED_ASSET, etc.
  account_class VARCHAR(100), -- Provider's classification (Xero: Class value)
  
  -- Hierarchy Support (Flexible depth)
  parent_account_id UUID REFERENCES accounts(id), -- Parent in tree
  hierarchy_level INTEGER DEFAULT 0, -- Depth in tree
  hierarchy_path TEXT, -- "1000/1100/1110" for queries
  is_parent BOOLEAN DEFAULT false, -- Has children
  
  -- Tax Configuration
  default_tax_code VARCHAR(50), -- Default tax to apply
  tax_type VARCHAR(50), -- NONE, INPUT, OUTPUT, BASEXCLUDED
  tax_locked BOOLEAN DEFAULT false, -- Can't change tax settings
  
  -- Account Properties
  is_active BOOLEAN DEFAULT true, -- Available for use
  is_system_account BOOLEAN DEFAULT false, -- Protected account
  is_bank_account BOOLEAN DEFAULT false, -- Links to bank
  bank_account_type VARCHAR(50), -- CHECKING, SAVINGS, CREDITCARD
  currency_code VARCHAR(3), -- For bank accounts
  
  -- Xero-specific Properties
  enable_payments_to_account BOOLEAN DEFAULT false, -- Allow direct payments
  show_in_expense_claims BOOLEAN DEFAULT false, -- Show in expense claims
  add_to_watchlist BOOLEAN DEFAULT false, -- Show on dashboard
  
  -- Reporting
  reporting_code VARCHAR(50), -- Financial statement mapping
  reporting_category VARCHAR(100), -- Income statement category
  exclude_from_reports BOOLEAN DEFAULT false, -- Hide in reports
  
  -- AI Categorization Support
  category_keywords TEXT[], -- Keywords for matching
  typical_vendors TEXT[], -- Common suppliers for this account
  spending_patterns JSONB DEFAULT '{}', /* Historical patterns:
    {
      "average_monthly": 5000,
      "seasonality": {...},
      "common_amounts": [100, 500, 1000]
    }
  */
  
  -- Provider Mappings
  provider_account_ids JSONB DEFAULT '{}', -- {"xero": "guid", "qb": "id"}
  provider_sync_data JSONB DEFAULT '{}', -- Provider metadata
  
  -- Usage Tracking
  transaction_count INTEGER DEFAULT 0, -- Times used
  last_used_date DATE, -- Most recent use
  total_debits DECIMAL(18,2) DEFAULT 0, -- Lifetime debits
  total_credits DECIMAL(18,2) DEFAULT 0, -- Lifetime credits
  
  -- Budget Integration
  budget_tracking BOOLEAN DEFAULT false, -- Track against budget
  budget_owner VARCHAR(255), -- Responsible person/dept
  
  -- Custom Fields
  custom_fields JSONB DEFAULT '{}', -- Extensibility
  notes TEXT, -- Internal notes
  metadata JSONB DEFAULT '{}', -- Arbitrary key-value pairs for integrations
  
  -- Audit Fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50) DEFAULT 'system',
  last_synced_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_account_code UNIQUE(tenant_id, code),
  CONSTRAINT unique_provider_account UNIQUE(tenant_id, provider_account_ids),
  
  -- Indexes
  INDEX idx_accounts_tenant_type (tenant_id, account_type),
  INDEX idx_accounts_parent (parent_account_id),
  INDEX idx_accounts_active (tenant_id, is_active),
  INDEX idx_accounts_hierarchy (tenant_id, hierarchy_path)
);
```

### 4. Transactions Schema (Complete)

```sql
CREATE TABLE transactions (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Source Tracking
  integration_id UUID REFERENCES integrations(id), -- Which connection
  provider_transaction_id VARCHAR(255), -- External ID
  provider_type VARCHAR(50), -- xero, quickbooks, sage, bank_direct, csv_import
  
  -- Core Transaction Data
  transaction_date DATE NOT NULL, -- When it occurred
  posted_date DATE, -- When it cleared/posted
  
  -- Transaction Type (Xero compatibility)
  transaction_type VARCHAR(50), -- SPEND, RECEIVE, SPEND-OVERPAYMENT, RECEIVE-PREPAYMENT
  
  -- Amounts
  amount DECIMAL(18,6) NOT NULL, -- Transaction amount (negative for debits)
  currency VARCHAR(10) DEFAULT 'USD', -- Transaction currency
  exchange_rate DECIMAL(10,6), -- To base currency
  base_currency_amount DECIMAL(18,6), -- In tenant's base currency
  
  -- Account Information
  source_account_id VARCHAR(255), -- Provider's account ID
  source_account_name VARCHAR(255), -- Human-readable name
  source_account_type VARCHAR(100), -- checking, savings, credit
  balance_after DECIMAL(18,6), -- Running balance
  
  -- Transaction Details
  raw_description TEXT, -- Original bank description
  transaction_reference VARCHAR(255), -- Check number, wire ref, etc.
  transaction_fee DECIMAL(18,6), -- Bank fees if any
  memo TEXT, -- Additional notes
  
  -- Enhanced Coding Fields
  account_id UUID REFERENCES accounts(id), -- GL account
  account_code VARCHAR(50), -- Denormalized GL code
  supplier_id UUID REFERENCES suppliers(id), -- Linked supplier
  supplier_name VARCHAR(500), -- Denormalized for history
  source_invoice_id UUID REFERENCES invoices(id), -- Linked invoice
  
  -- Payment Information
  payment_method VARCHAR(50), -- CHECK, WIRE, ACH, CARD, CASH
  check_number VARCHAR(50), -- For check payments
  
  -- Xero-specific References
  overpayment_id VARCHAR(255), -- Link to overpayment record
  prepayment_id VARCHAR(255), -- Link to prepayment record
  url VARCHAR(500), -- Source document URL
  
  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT false, -- Matched status
  reconciled_at TIMESTAMP, -- When matched
  reconciled_by UUID REFERENCES users(id), -- Who matched it
  reconciliation_notes TEXT, -- Match explanation
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, cleared, reconciled, disputed, void
  status_reason TEXT, -- Why status changed
  
  -- AI Enhancement Fields
  enriched_description TEXT, -- Cleaned description
  merchant_name VARCHAR(500), -- Extracted merchant
  merchant_category VARCHAR(100), -- Business category
  location VARCHAR(255), -- Transaction location
  
  -- Categorization
  auto_categorized BOOLEAN DEFAULT false, -- AI categorized
  category_confidence DECIMAL(3,2), -- AI confidence
  suggested_account_id UUID, -- AI suggestion
  suggested_supplier_id UUID, -- AI suggestion
  
  -- Split Transaction Support
  is_split BOOLEAN DEFAULT false, -- Has multiple parts
  parent_transaction_id UUID REFERENCES transactions(id), -- Parent if split
  split_count INTEGER DEFAULT 0, -- Number of splits
  
  -- Multi-currency Enhancement
  original_currency VARCHAR(3), -- Currency on statement
  original_amount DECIMAL(18,6), -- Amount in original
  exchange_rate_date DATE, -- Rate date used
  
  -- Document Management
  related_document_ids UUID[], -- Linked documents
  attachment_count INTEGER DEFAULT 0, -- Number of attachments
  has_receipt BOOLEAN DEFAULT false, -- Receipt attached
  
  -- Bank Statement Matching
  statement_date DATE, -- When on statement
  statement_description TEXT, -- Exact bank text
  statement_balance DECIMAL(18,6), -- Balance on statement
  bank_statement_id UUID REFERENCES bank_statements(id), -- Source statement
  
  -- Provider Sync
  provider_data JSONB DEFAULT '{}', -- Full provider data
  enrichment_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  
  -- Quality Flags
  needs_review BOOLEAN DEFAULT false, -- Requires attention
  review_reason VARCHAR(255), -- Why review needed
  confidence_score DECIMAL(3,2), -- Overall confidence
  
  -- Custom Metadata
  metadata JSONB DEFAULT '{}', -- Arbitrary key-value pairs for integrations
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP, -- Last sync time
  
  -- Constraints
  CONSTRAINT unique_provider_transaction UNIQUE(tenant_id, integration_id, provider_transaction_id),
  
  -- Indexes
  INDEX idx_transactions_tenant_date (tenant_id, transaction_date DESC),
  INDEX idx_transactions_tenant_status (tenant_id, status),
  INDEX idx_transactions_integration_sync (integration_id, synced_at),
  INDEX idx_transactions_reconciled (tenant_id, is_reconciled),
  INDEX idx_transactions_supplier (tenant_id, supplier_id),
  INDEX idx_transactions_account (tenant_id, account_id),
  INDEX idx_transactions_invoice (source_invoice_id),
  INDEX idx_transactions_needs_review (tenant_id, needs_review) WHERE needs_review = true
);

-- Transaction Line Items (for split coding)
CREATE TABLE transaction_line_items (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Line Details
  line_number INTEGER NOT NULL, -- Order in split
  line_description VARCHAR(500), -- Line purpose
  
  -- Amounts
  line_amount DECIMAL(18,6) NOT NULL, -- Portion of total
  
  -- Account Coding
  expense_account_id VARCHAR(255), -- GL account
  expense_account_name VARCHAR(255), -- Account name
  expense_account_code VARCHAR(50), -- Account code
  expense_account_type VARCHAR(100), -- Account type
  
  -- Item Tracking (if applicable)
  item_id VARCHAR(255), -- Inventory item
  quantity DECIMAL(10,4), -- How many
  unit_amount DECIMAL(18,6), -- Price per unit
  
  -- Tax Information
  tax_type VARCHAR(50), -- Tax category
  tax_amount DECIMAL(18,6), -- Tax portion
  tax_rate DECIMAL(5,4), -- Tax percentage
  tax_code VARCHAR(50), -- Tax code
  is_tax_inclusive BOOLEAN DEFAULT true, -- Tax included in amount
  
  -- Contact Information
  contact_id VARCHAR(255), -- Related supplier/customer
  contact_name VARCHAR(255), -- Contact name
  contact_type VARCHAR(50), -- supplier, customer
  
  -- Tracking
  tracking_categories JSONB DEFAULT '{}', -- Cost centers, projects
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_line_items_transaction (transaction_id),
  INDEX idx_line_items_tenant_account (tenant_id, expense_account_id),
  INDEX idx_line_items_contact (tenant_id, contact_id)
);
```

### 5. Bank Statements Schema

```sql
CREATE TABLE bank_statements (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Import Source
  import_source VARCHAR(50) NOT NULL, -- plaid, yodlee, csv, ofx, manual
  import_batch_id UUID, -- Groups imports together
  integration_id UUID REFERENCES integrations(id), -- If from integration
  
  -- Bank Account Identification
  institution_name VARCHAR(255), -- Bank name
  account_identifier VARCHAR(255) NOT NULL, -- Last 4, masked number
  account_type VARCHAR(50), -- checking, savings, credit, loan
  account_currency VARCHAR(3) DEFAULT 'USD', -- Account currency
  
  -- Core Transaction Data
  transaction_date DATE NOT NULL, -- Transaction date
  posted_date DATE, -- When cleared at bank
  description TEXT NOT NULL, -- Raw bank description
  
  -- Amounts
  amount DECIMAL(18,6) NOT NULL, -- Negative for debits
  balance DECIMAL(18,6), -- Running balance if provided
  
  -- Transaction Classification (From Bank)
  bank_category VARCHAR(100), -- Bank's category
  transaction_type VARCHAR(50), -- debit, credit, check, fee, transfer
  
  -- Check Information
  check_number VARCHAR(50), -- If check transaction
  
  -- Enhanced Description Fields (AI Extraction)
  merchant_name VARCHAR(500), -- Extracted vendor name
  merchant_clean_name VARCHAR(500), -- Normalized for matching
  location VARCHAR(255), -- City, state if available
  merchant_category_code VARCHAR(10), -- MCC if available
  
  -- Additional Bank Data
  reference_number VARCHAR(100), -- Bank's reference
  transaction_id VARCHAR(100), -- Bank's unique ID
  
  -- Reconciliation Status
  match_status VARCHAR(20) DEFAULT 'unmatched', -- unmatched, suggested, matched, ignored
  matched_transaction_id UUID REFERENCES transactions(id), -- Linked transaction
  match_confidence DECIMAL(3,2), -- 0-1 confidence score
  matched_at TIMESTAMP, -- When matched
  matched_by VARCHAR(50), -- ai, rule, manual
  
  -- AI Categorization
  suggested_account_id UUID REFERENCES accounts(id), -- AI suggestion
  suggested_supplier_id UUID REFERENCES suppliers(id), -- AI suggestion
  category_confidence DECIMAL(3,2), -- AI confidence
  entity_extraction JSONB DEFAULT '{}', /* Extracted entities:
    {
      "vendor": "Acme Corp",
      "invoice_number": "INV-123",
      "purpose": "Office Supplies",
      "confidence_scores": {...}
    }
  */
  
  -- Duplicate Prevention
  dedup_key VARCHAR(255), -- Hash for duplicate detection
  is_duplicate BOOLEAN DEFAULT false, -- Duplicate flag
  duplicate_of_id UUID REFERENCES bank_statements(id), -- Original record
  
  -- Pattern Recognition
  transaction_pattern VARCHAR(255), -- Identified pattern
  is_recurring BOOLEAN DEFAULT false, -- Recurring transaction
  recurrence_frequency VARCHAR(50), -- monthly, weekly, etc.
  expected_next_date DATE, -- Next occurrence
  
  -- Raw Data Storage
  raw_data JSONB DEFAULT '{}', -- Complete import data
  parsing_metadata JSONB DEFAULT '{}', /* Parsing details:
    {
      "parser_version": "1.0",
      "parse_rules_applied": [...],
      "extraction_confidence": {...}
    }
  */
  
  -- Processing
  processed BOOLEAN DEFAULT false, -- Ready for matching
  processing_errors JSONB DEFAULT '[]', -- Any errors
  requires_manual_review BOOLEAN DEFAULT false, -- Needs human
  review_reason VARCHAR(255), -- Why manual review
  
  -- Import Tracking
  file_name VARCHAR(255), -- Source file if applicable
  file_line_number INTEGER, -- Line in source file
  
  -- Custom Metadata
  metadata JSONB DEFAULT '{}', -- Arbitrary key-value pairs for integrations
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP, -- When AI processed
  
  -- Constraints
  CONSTRAINT unique_bank_transaction UNIQUE(
    tenant_id, 
    account_identifier, 
    transaction_date, 
    amount, 
    dedup_key
  ),
  
  -- Indexes
  INDEX idx_bank_statements_tenant_date (tenant_id, transaction_date DESC),
  INDEX idx_bank_statements_unmatched (tenant_id, match_status) WHERE match_status = 'unmatched',
  INDEX idx_bank_statements_account (tenant_id, account_identifier),
  INDEX idx_bank_statements_amount (tenant_id, amount),
  INDEX idx_bank_statements_merchant (tenant_id, merchant_clean_name),
  INDEX idx_bank_statements_duplicate (tenant_id, is_duplicate) WHERE is_duplicate = false,
  INDEX idx_bank_statements_review (tenant_id, requires_manual_review) WHERE requires_manual_review = true
);
```

### 6. Import Batches Schema (New)

```sql
CREATE TABLE import_batches (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Batch Information
  batch_type VARCHAR(50) NOT NULL, -- suppliers, invoices, transactions, statements
  import_source VARCHAR(50) NOT NULL, -- xero, quickbooks, csv, manual
  integration_id UUID REFERENCES integrations(id), -- If from integration
  
  -- File Information (if applicable)
  file_name VARCHAR(255), -- Uploaded file name
  file_size INTEGER, -- Size in bytes
  file_hash VARCHAR(64), -- SHA256 for deduplication
  
  -- Import Statistics
  total_records INTEGER DEFAULT 0, -- Total in batch
  processed_records INTEGER DEFAULT 0, -- Successfully processed
  failed_records INTEGER DEFAULT 0, -- Failed to import
  duplicate_records INTEGER DEFAULT 0, -- Skipped as duplicates
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMP, -- Processing start
  completed_at TIMESTAMP, -- Processing end
  
  -- Configuration
  import_config JSONB DEFAULT '{}', /* Import settings:
    {
      "column_mappings": {...},
      "date_format": "MM/DD/YYYY",
      "decimal_separator": ".",
      "skip_duplicates": true
    }
  */
  
  -- Results
  import_results JSONB DEFAULT '{}', /* Summary:
    {
      "created": 100,
      "updated": 50,
      "errors": [...],
      "warnings": [...]
    }
  */
  
  -- Error Tracking
  error_log JSONB DEFAULT '[]', /* Detailed errors:
    [
      {
        "line": 10,
        "error": "Invalid date format",
        "data": {...}
      }
    ]
  */
  
  -- User Information
  imported_by UUID REFERENCES users(id), -- Who initiated
  notes TEXT, -- User notes about import
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_import_batches_tenant (tenant_id, created_at DESC),
  INDEX idx_import_batches_status (tenant_id, status),
  INDEX idx_import_batches_type (tenant_id, batch_type)
);
```

### 7. Reconciliations Schema (New)

```sql
CREATE TABLE reconciliations (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reconciliation Details
  bank_statement_id UUID NOT NULL REFERENCES bank_statements(id),
  transaction_id UUID REFERENCES transactions(id),
  
  -- Match Information
  match_type VARCHAR(50) NOT NULL, -- exact, partial, manual, rule_based
  match_confidence DECIMAL(3,2), -- 0-1 confidence score
  match_amount DECIMAL(18,6) NOT NULL, -- Amount being reconciled
  
  -- For split reconciliations (multiple transactions to one statement)
  is_split BOOLEAN DEFAULT false,
  split_group_id UUID, -- Groups related reconciliations
  
  -- AI/Rule Details
  match_method VARCHAR(100), -- ai_ml, exact_match, rule_123, manual
  match_rules JSONB DEFAULT '{}', /* Rules that triggered match:
    {
      "amount_match": true,
      "date_tolerance_days": 2,
      "description_similarity": 0.85,
      "merchant_match": true
    }
  */
  
  -- User Override
  user_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP,
  override_reason TEXT, -- Why manual override was needed
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50), -- system, user, ai
  
  -- Constraints
  CONSTRAINT unique_statement_reconciliation UNIQUE(bank_statement_id, transaction_id),
  
  -- Indexes
  INDEX idx_reconciliations_statement (bank_statement_id),
  INDEX idx_reconciliations_transaction (transaction_id),
  INDEX idx_reconciliations_split_group (split_group_id),
  INDEX idx_reconciliations_tenant_date (tenant_id, created_at DESC)
);
```

### 8. Manual Journals Schema (New)

```sql
CREATE TABLE manual_journals (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Source Tracking
  integration_id UUID REFERENCES integrations(id), -- Which connection
  provider_journal_id VARCHAR(255), -- External ID
  
  -- Journal Identification
  journal_number VARCHAR(100), -- Human-readable number
  journal_date DATE NOT NULL, -- Journal entry date
  
  -- Journal Details
  narration TEXT, -- Overall description/memo
  status VARCHAR(50) DEFAULT 'draft', -- draft, posted, archived, voided
  
  -- Line Items (Must balance to zero)
  journal_lines JSONB NOT NULL DEFAULT '[]', /* Array of:
    {
      "line_number": 1,
      "account_id": "uuid",
      "account_code": "1000",
      "description": "Line description",
      "debit_amount": 100.00,
      "credit_amount": 0.00,
      "tax_type": "GST",
      "tax_amount": 10.00,
      "tracking_categories": {},
      "contact_id": "uuid",
      "contact_name": "Supplier Name"
    }
  */
  
  -- Totals (for validation)
  total_debits DECIMAL(18,6) NOT NULL DEFAULT 0,
  total_credits DECIMAL(18,6) NOT NULL DEFAULT 0,
  
  -- Currency Support
  currency_code VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(18,10),
  
  -- Provider Data
  provider_data JSONB DEFAULT '{}', -- Full provider response
  has_attachments BOOLEAN DEFAULT false,
  attachment_ids TEXT[],
  
  -- Posting Information
  posted_date DATE, -- When posted to GL
  posted_by UUID REFERENCES users(id),
  
  -- Audit Fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50), -- system, user, import
  last_synced_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_journal_balance CHECK (total_debits = total_credits),
  CONSTRAINT unique_provider_journal UNIQUE(tenant_id, integration_id, provider_journal_id),
  
  -- Indexes
  INDEX idx_journals_tenant_date (tenant_id, journal_date DESC),
  INDEX idx_journals_tenant_status (tenant_id, status),
  INDEX idx_journals_tenant_number (tenant_id, journal_number)
);
```

## Edge Cases Handled

### 1. Missing Required Fields
- All schemas use minimal required fields
- Most fields are nullable to handle incomplete data
- Default values provided where sensible

### 2. Multi-Currency Scenarios
- Exchange rates stored at transaction level
- Original and base currency amounts preserved
- Currency codes on all monetary tables
- Exchange rate dates for historical accuracy

### 3. Global Tax Variations
- Flexible tax number storage (type + value)
- Support for multiple tax identifiers
- Tax-inclusive and exclusive handling
- Multiple tax rates per invoice/transaction

### 4. Address Formats
- 4 address lines to handle any format
- Separate fields for better querying
- Additional addresses stored as JSONB
- Country-specific field naming flexibility

### 5. Provider Variations
- JSONB fields for provider-specific data
- Provider ID mappings for cross-reference
- Original data preserved in provider_data
- Sync versioning for updates

### 6. Data Quality Issues
- Duplicate detection mechanisms
- Processing error tracking
- Review flags for manual intervention
- Confidence scores for AI suggestions

### 7. Historical Data
- Denormalized fields for point-in-time accuracy
- Sync versioning for conflict resolution
- Audit trails on all tables
- Soft deletes where appropriate

### 8. Split Transactions
- Parent-child relationship support
- Line items for detailed coding
- Partial reconciliation capability
- Many-to-many matching support

### 9. AI/ML Support
- Normalized fields for matching
- Tokenization for fuzzy search
- Confidence scores throughout
- Entity extraction storage

### 10. Compliance & Security
- Encrypted fields for sensitive data
- Complete audit trails
- Data retention policies
- PII handling considerations

## Import Strategy

### 1. Order of Operations
1. **Chart of Accounts** - Needed for categorization
2. **Suppliers** - Referenced by invoices and transactions
3. **Invoices** - May be referenced by transactions
4. **Transactions** - Core financial data
5. **Bank Statements** - For reconciliation

### 2. Duplicate Handling
- Unique constraints prevent duplicate imports
- Provider ID tracking ensures idempotency
- Batch IDs group related imports
- Deduplication keys for bank data

### 3. Error Recovery
- Failed imports don't block entire batch
- Errors tracked in processing_errors fields
- Partial success supported
- Retry capability with sync versions

### 4. Data Validation
- Minimal validation at import time
- Focus on capturing data as-is
- Validation/enrichment as separate step
- Review flags for questionable data

## Provider-Specific Mappings

### Xero
- Contacts → Suppliers (ContactID → provider_ids.xero)
  - FirstName/LastName → first_name/last_name fields
  - ContactNumber → external_ids array (e.g., {"system": "xero", "id": "ABC123"})
  - IsSupplier/IsCustomer → supplier_type field
  - AccountsReceivableTaxType → default_tax_type_sales
  - AccountsPayableTaxType → default_tax_type_purchases
  - ContactStatus → contact_status (Active/Archived/GDPR)
- Invoices (Type: ACCPAY/ACCREC) → Invoices
  - Type: ACCPAY → invoice_type: 'bill'
  - Type: ACCREC → invoice_type: 'invoice'
  - LineAmountTypes → line_amount_types field
  - BrandingThemeID → branding_theme_id
  - RepeatingInvoiceID → repeating_invoice_id
  - ExpectedPaymentDate → expected_payment_date (AR)
  - PlannedPaymentDate → planned_payment_date (AP)
- BankTransactions → Transactions
  - Type (SPEND/RECEIVE) → transaction_type field
  - OverpaymentID → overpayment_id
  - PrepaymentID → prepayment_id
  - Reference → transaction_reference
  - Url → url field
- Payments → Transactions (with source_invoice_id)
- Accounts → Accounts
  - Description → description field
  - Class → account_class (Asset/Liability/etc.)
  - Type → account_subtype (detailed type)
  - EnablePaymentsToAccount → enable_payments_to_account
  - ShowInExpenseClaims → show_in_expense_claims
  - AddToWatchlist → add_to_watchlist
- ManualJournals → manual_journals
  - JournalLines → journal_lines JSONB array

### QuickBooks
- Vendors → Suppliers (Id → provider_ids.quickbooks)
- Bills → Invoices
- BankTransactions → Transactions
- Accounts → Accounts

### Sage
- Suppliers → Suppliers
- Purchase Invoices → Invoices
- Nominal Codes → Accounts
- Bank → Transactions

### Direct Import
- CSV mapping configurability
- OFX/QIF standard field mappings
- Manual field selection UI
- AI-assisted field detection

## Performance Considerations

### 1. Indexing Strategy
- Composite indexes for common queries
- Partial indexes for filtered queries
- JSONB GIN indexes where needed
- Regular index maintenance

### 2. Data Archival
- Partition large tables by date
- Archive old reconciled data
- Separate active/inactive records
- Compress historical data

### 3. Query Optimization
- Denormalized fields for performance
- Materialized views for reports
- Careful use of JSONB queries
- Connection pooling

## Xero-Specific Considerations

### Data Not Available via Xero API
1. **Bank Statement Lines** - Xero doesn't expose unreconciled bank feed data via API
2. **Approval History** - Who approved invoices/bills is not available
3. **Deleted Records** - Must handle via status flags or exclusion

### Xero Features Requiring Special Handling
1. **Overpayments/Prepayments** - Separate entities in Xero, stored as transactions with special IDs
2. **Credit Notes** - Treated as invoices with type 'credit_note'
3. **Flat Account Structure** - No hierarchy in Xero (parent_account_id always NULL)
4. **Contact Types** - Boolean flags (IsSupplier/IsCustomer) mapped to single type field

### Fields Populated Only from Other Sources
1. **Multiple Emails/Phones** - Xero supports only one of each
2. **Account Hierarchy** - Used by QuickBooks but not Xero
3. **AI Enhancement Fields** - All ML/AI fields computed post-import
4. **Bank Statement Matching** - Requires direct bank feeds, not from Xero

## API Design Patterns and Data Retrieval

### 1. Expandable Fields Pattern
To avoid N+1 query problems, the API should support field expansion:

```
GET /api/invoices?expand=line_items,supplier.addresses
GET /api/contacts?expand=contact_persons,external_ids
GET /api/transactions?expand=line_items,account,supplier
```

Each entity should document its expandable fields:
- **Invoices**: line_items, supplier, attachments
- **Contacts**: addresses, contact_persons, external_ids
- **Transactions**: line_items, account, supplier, bank_statement
- **Accounts**: parent_account, spending_patterns

### 2. Field Selection Pattern
Allow clients to request only needed fields:

```
GET /api/invoices?fields=invoice_number,total_amount,status
GET /api/contacts?fields=name,primary_email,external_ids
```

### 3. Batch Operations
All core entities support batch operations with the following limits:

```
POST /api/invoices/batch
POST /api/contacts/batch
POST /api/accounts/batch
```

- **Maximum batch size**: 100 records per request
- **Response**: Returns array of results with success/error for each record
- **Partial success**: Batch continues processing even if individual records fail

### 4. Performance Considerations

#### Indexed Fields (Optimized Queries)
- All UUID primary keys
- tenant_id on all tables
- Common search fields: name, invoice_number, transaction_date
- Status and type enums
- JSONB fields with GIN indexes: external_ids, metadata

#### Non-Indexed Fields (Avoid in WHERE clauses)
- Text fields: description, notes, memo
- Calculated fields: total amounts, balances
- Nested JSONB properties (unless specifically indexed)

#### Query Recommendations
- Use date ranges instead of open-ended queries
- Paginate with consistent ordering (default: created_at DESC, id)
- Limit results to 1000 records per page
- Use webhook events for real-time updates instead of polling

## Future Considerations

1. **Document Storage** - Attachment handling system
2. **Real-time Sync** - Webhooks from providers
3. **Advanced AI Features** - Pattern learning, anomaly detection
4. **Multi-Entity Support** - Consolidated reporting
5. **Regulatory Compliance** - SOX, GDPR requirements

This schema design provides a robust foundation for importing financial data from any accounting system while preserving data fidelity and enabling AI-powered reconciliation and categorization.