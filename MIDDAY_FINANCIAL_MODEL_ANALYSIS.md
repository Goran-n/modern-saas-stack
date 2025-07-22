# Comprehensive Financial Data Model Analysis: Figgy vs Midday

## Executive Summary

This document provides a detailed analysis comparing Figgy's current financial data model with Midday's implementation. Midday has achieved recognition for their streamlined transaction and bank feed management system, particularly in the freelancer and small business market. This analysis examines both architectures to identify opportunities for enhancement in Figgy's financial infrastructure.

---

## Table of Contents

1. [Midday Overview](#midday-overview)
2. [Current Figgy Financial Schema](#current-figgy-financial-schema)
3. [Midday Financial Schema](#midday-financial-schema)
4. [Detailed Comparison Matrix](#detailed-comparison-matrix)
5. [Architectural Philosophy Differences](#architectural-philosophy-differences)
6. [Feature-by-Feature Analysis](#feature-by-feature-analysis)
7. [Strengths and Weaknesses](#strengths-and-weaknesses)
8. [Strategic Recommendations](#strategic-recommendations)
9. [Implementation Roadmap](#implementation-roadmap)

---

## Midday Overview

**Project**: [Midday.ai](https://github.com/midday-ai/midday)
**Focus**: All-in-one business management for freelancers, contractors, and solo entrepreneurs
**Core Value Proposition**: "Invoicing, Time tracking, File reconciliation, Storage, Financial Overview & your own Assistant"

### Technology Stack
- **Database**: Supabase (PostgreSQL with real-time features)
- **Backend**: TypeScript, Next.js API routes
- **Frontend**: React, Next.js, Tailwind CSS
- **Architecture**: Monorepo with focused packages
- **Bank Integrations**: GoCardLess (EU), Plaid (Canada/US), Teller (US)

### Key Features
- **Magic Inbox**: Automatically matches invoices/receipts to transactions
- **Real-time Bank Feeds**: Live transaction synchronization
- **AI Assistant**: Financial insights and automated categorization
- **Multi-provider Support**: Seamless integration with major banking APIs

---

## Current Figgy Financial Schema

### Core Tables Overview

#### 1. Accounts Table
```sql
accounts (
  id                    text PRIMARY KEY,
  tenant_id            text NOT NULL REFERENCES tenants(id),
  name                 text NOT NULL,
  account_type         account_type_enum NOT NULL,
  code                 text,
  balance              numeric(15,2) DEFAULT 0,
  currency             text DEFAULT 'GBP',
  description          text,
  provider_id          text,
  external_account_id  text,
  is_active            boolean DEFAULT true,
  created_at           timestamp DEFAULT now(),
  updated_at           timestamp DEFAULT now()
)
```

**Key Features:**
- Full multi-tenant support
- Double-entry bookkeeping ready
- Provider-agnostic external integration
- Currency support with configurable defaults
- Hierarchical account coding system

#### 2. Transactions Table
```sql
transactions (
  id                   text PRIMARY KEY,
  tenant_id           text NOT NULL REFERENCES tenants(id),
  account_id          text REFERENCES accounts(id),
  contact_id          text,
  amount              numeric(15,2) NOT NULL,
  currency            text DEFAULT 'GBP',
  description         text,
  reference           text,
  transaction_date    date NOT NULL,
  due_date            date,
  status              transaction_status_enum DEFAULT 'pending',
  transaction_type    transaction_type_enum NOT NULL,
  category            text,
  provider_data       jsonb,
  file_attachments    text[],
  reconciliation_id   text,
  created_at          timestamp DEFAULT now(),
  updated_at          timestamp DEFAULT now()
)
```

**Key Features:**
- Comprehensive transaction lifecycle management
- Flexible attachment system
- Provider data preservation for audit trails
- Built-in reconciliation system
- Support for complex transaction types

#### 3. Suppliers Table
```sql
suppliers (
  id                  text PRIMARY KEY,
  tenant_id          text NOT NULL REFERENCES tenants(id),
  name               text NOT NULL,
  email              text,
  phone              text,
  address_line_1     text,
  address_line_2     text,
  city               text,
  state              text,
  postal_code        text,
  country            text,
  tax_number         text,
  currency           text DEFAULT 'GBP',
  payment_terms      text,
  contact_person     text,
  website            text,
  notes              text,
  status             supplier_status_enum DEFAULT 'active',
  categories         text[],
  external_id        text,
  provider_id        text,
  sync_status        sync_status_enum DEFAULT 'pending',
  last_synced_at     timestamp,
  created_at         timestamp DEFAULT now(),
  updated_at         timestamp DEFAULT now()
)
```

**Key Features:**
- Complete supplier lifecycle management
- International address and tax support
- Flexible categorization system
- Sync status tracking for integrations
- Comprehensive contact management

#### 4. Bank Statements & Reconciliation
```sql
bank_statements (
  id                 text PRIMARY KEY,
  tenant_id         text NOT NULL,
  account_id        text REFERENCES accounts(id),
  statement_date    date NOT NULL,
  opening_balance   numeric(15,2),
  closing_balance   numeric(15,2),
  transactions      jsonb,
  file_path         text,
  status            statement_status_enum DEFAULT 'pending'
)

reconciliations (
  id                text PRIMARY KEY,
  tenant_id        text NOT NULL,
  account_id       text REFERENCES accounts(id),
  statement_id     text REFERENCES bank_statements(id),
  matched_transactions jsonb,
  discrepancies    jsonb,
  status           reconciliation_status_enum DEFAULT 'pending',
  reconciled_by    text,
  reconciled_at    timestamp
)
```

#### 5. Integration Infrastructure
```sql
integrations (
  id                    text PRIMARY KEY,
  tenant_id            text NOT NULL,
  provider             provider_enum NOT NULL,
  name                 text NOT NULL,
  auth_data            jsonb NOT NULL,
  settings             jsonb,
  status               integration_status_enum DEFAULT 'setup_pending',
  last_sync_at         timestamp,
  last_error           text,
  next_scheduled_sync  timestamp,
  sync_health          text,
  created_at           timestamp DEFAULT now(),
  updated_at           timestamp DEFAULT now()
)

sync_jobs (
  id                   text PRIMARY KEY,
  tenant_id           text NOT NULL,
  integration_id      text REFERENCES integrations(id),
  job_type            sync_job_type_enum NOT NULL,
  status              sync_job_status_enum DEFAULT 'pending',
  started_at          timestamp,
  completed_at        timestamp,
  progress            numeric(5,2) DEFAULT 0,
  total_records       integer DEFAULT 0,
  processed_records   integer DEFAULT 0,
  error_records       integer DEFAULT 0,
  metadata            jsonb,
  error_details       text,
  created_at          timestamp DEFAULT now()
)
```

---

## Midday Financial Schema

### Core Tables Analysis

#### 1. Bank Accounts
```typescript
bank_accounts: {
  account_id: string
  name: string | null
  currency: string | null
  balance: number | null
  account_type: Database["public"]["Enums"]["account_type"] | null
  bank_connection_id: string | null
  enabled: boolean | null
  team_id: string
  created_at: string
  updated_at: string
}
```

**Key Features:**
- Team-based isolation (multi-tenancy via teams)
- Direct bank connection linking
- Simple balance tracking
- Account type categorization

#### 2. Transactions
```typescript
transactions: {
  id: string
  amount: number
  currency: string
  date: string
  description: string | null
  category_id: string | null
  bank_account_id: string | null
  assigned_id: string | null
  method: Database["public"]["Enums"]["transaction_methods"] | null
  status: Database["public"]["Enums"]["transaction_status"] | null
  team_id: string
  bank_account: bank_accounts | null
  category: transaction_categories | null
  attachments: transaction_attachments[]
  created_at: string
  updated_at: string
}
```

**Key Features:**
- Clean, simplified transaction model
- Category-based organization
- Attachment support via separate table
- Assignment tracking for team workflows
- Multiple payment method support

#### 3. Bank Connections
```typescript
bank_connections: {
  id: string
  institution_id: string
  name: string | null
  provider: Database["public"]["Enums"]["bank_providers"]
  account_id: string | null
  access_token: string | null
  enrollment_id: string | null
  expires_at: string | null
  error_details: string | null
  status: Database["public"]["Enums"]["bank_connection_status"] | null
  team_id: string
  created_at: string
  updated_at: string
}
```

**Key Features:**
- Multi-provider support (Plaid, GoCardless, Teller)
- Token lifecycle management
- Error tracking and status monitoring
- Institution relationship mapping

#### 4. Transaction Categories
```typescript
transaction_categories: {
  id: string
  name: string
  color: string | null
  description: string | null
  slug: string
  vat: number | null
  system: boolean | null
  team_id: string | null
  created_at: string
  updated_at: string
}
```

**Key Features:**
- Hierarchical category system
- VAT rate integration
- Visual organization (colors)
- System vs custom categories
- URL-friendly slugs

#### 5. Customers & Invoicing
```typescript
customers: {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  vat_number: string | null
  website: string | null
  note: string | null
  tags: string[] | null
  team_id: string
  created_at: string
  updated_at: string
}

invoices: {
  id: string
  customer_id: string | null
  invoice_number: string
  issue_date: string
  due_date: string | null
  currency: string
  amount: number
  vat: number | null
  status: Database["public"]["Enums"]["invoice_status"]
  team_id: string
  template: Database["public"]["Enums"]["invoice_template"] | null
  created_at: string
  updated_at: string
}
```

---

## Detailed Comparison Matrix

| **Aspect** | **Figgy** | **Midday** | **Analysis** |
|------------|-----------|------------|--------------|
| **Data Model Philosophy** | Enterprise accounting focus<br/>Double-entry bookkeeping<br/>Full audit trail | Simplified transaction tracking<br/>Cash-based accounting<br/>User experience first | **Figgy**: More robust for complex accounting<br/>**Midday**: Faster user adoption |
| **Multi-tenancy** | True multi-tenant with tenant_id<br/>Full data isolation<br/>Horizontal scaling ready | Team-based isolation<br/>Supabase RLS policies<br/>Vertical scaling focused | **Figgy**: Better for SaaS platform<br/>**Midday**: Simpler implementation |
| **Bank Integration Architecture** | Provider-agnostic sync jobs<br/>Batch processing focus<br/>Manual import support | Real-time provider connections<br/>Live webhook processing<br/>Automated sync preferred | **Midday**: Superior real-time capabilities<br/>**Figgy**: More flexible for edge cases |
| **Transaction Model** | Complex transaction types<br/>Reconciliation support<br/>Multiple currencies<br/>Provider data preservation | Simple transaction logging<br/>Category-based organization<br/>Attachment system<br/>Assignment workflows | **Figgy**: Better for accounting compliance<br/>**Midday**: Better for daily usage |
| **Supplier/Customer Management** | Full supplier lifecycle<br/>Payment terms tracking<br/>Sync status management<br/>International support | Customer-focused model<br/>Invoice generation<br/>Project relationships<br/>Contact management | **Figgy**: More comprehensive B2B<br/>**Midday**: Better for freelancers |
| **Financial Integrity** | Comprehensive referential integrity<br/>Cascading delete policies<br/>Data consistency enforced | Simpler relationships<br/>Team-based data isolation<br/>Supabase constraints | **Figgy**: Better data protection<br/>**Midday**: Easier maintenance |
| **Reporting Capabilities** | Built for complex reporting<br/>Double-entry ready<br/>Audit trail complete | Transaction-based reports<br/>Category analytics<br/>Real-time dashboards | **Figgy**: Better for compliance<br/>**Midday**: Better for insights |
| **Development Velocity** | Complex schema changes<br/>Migration heavy<br/>Testing intensive | Rapid iteration<br/>Schema simplicity<br/>Supabase tooling | **Midday**: Faster development cycles<br/>**Figgy**: More stability required |

---

## Architectural Philosophy Differences

### Figgy's Approach: Enterprise-First Architecture

**Strengths:**
1. **Accounting Compliance**: Built for proper double-entry bookkeeping
2. **Data Integrity**: Comprehensive foreign key relationships and constraints
3. **Audit Requirements**: Full transaction history and change tracking
4. **Scalability**: True multi-tenant architecture for SaaS platforms
5. **Flexibility**: Provider-agnostic design for multiple integration sources
6. **International**: Multi-currency and tax jurisdiction support

**Trade-offs:**
1. **Complexity**: Higher learning curve for developers and users
2. **Development Speed**: More complex schema changes and testing requirements
3. **User Experience**: May feel overwhelming for simple use cases
4. **Real-time Features**: Batch processing focus can feel less responsive

### Midday's Approach: User Experience-First Architecture

**Strengths:**
1. **Simplicity**: Clean, intuitive data model that matches user mental models
2. **Real-time**: Live bank feeds and instant updates
3. **Development Speed**: Rapid iteration and feature deployment
4. **User Adoption**: Lower barrier to entry for small businesses
5. **Modern Stack**: Leverages Supabase's real-time and auth features
6. **AI Integration**: Built-in support for automated categorization

**Trade-offs:**
1. **Accounting Limitations**: Not suitable for complex accounting requirements
2. **Scalability Concerns**: Team-based model may not scale to enterprise
3. **Data Integrity**: Simpler relationships may lead to data inconsistencies
4. **Customization**: Less flexible for unique business requirements

---

## Feature-by-Feature Analysis

### Bank Integration Capabilities

#### Figgy's Current Implementation
- **Sync Jobs System**: Batch processing with job queues
- **Provider Abstraction**: Generic integration interface
- **Manual Import**: Support for CSV/OFX file uploads
- **Error Handling**: Comprehensive retry and error logging
- **Data Preservation**: Raw provider data stored for audit

**Strengths**: Reliable, auditable, flexible for various data sources
**Weaknesses**: Not real-time, complex setup, slower user feedback

#### Midday's Implementation
- **Real-time Sync**: Live webhooks from bank providers
- **Multi-provider**: Plaid, GoCardless, and Teller integration
- **One-click Setup**: Streamlined connection flow
- **Status Monitoring**: Real-time connection health tracking
- **Automatic Categorization**: AI-powered transaction classification

**Strengths**: Real-time updates, excellent UX, automatic processing
**Weaknesses**: Provider-dependent, less control over data flow

### Transaction Management

#### Figgy's Approach
```sql
-- Rich transaction model
transactions (
  amount, currency, description, reference,
  transaction_date, due_date, status,
  transaction_type, category, provider_data,
  file_attachments, reconciliation_id
)
```

**Features:**
- Double-entry bookkeeping support
- Multiple transaction types (payment, transfer, adjustment)
- Reconciliation system integration
- Provider data preservation
- Flexible attachment system

#### Midday's Approach
```typescript
// Simplified transaction model
transactions: {
  amount, currency, date, description,
  category_id, bank_account_id, assigned_id,
  method, status, attachments[]
}
```

**Features:**
- Clean, user-friendly structure
- Category-based organization
- Team assignment workflows
- Multiple payment methods
- Separate attachments table

### Supplier/Customer Management

#### Figgy's Supplier Model
- Comprehensive business information capture
- International address and tax support
- Payment terms and credit management
- Sync status tracking for integrations
- Category-based organization
- External ID mapping for provider sync

#### Midday's Customer Model
- Freelancer-focused contact management
- Invoice generation integration
- Project relationship tracking
- Tag-based organization
- VAT number support for EU compliance
- Website and note fields for context

---

## Strengths and Weaknesses

### Figgy Strengths
1. **Enterprise Readiness**: Full accounting compliance and audit trails
2. **Data Integrity**: Comprehensive referential integrity and constraints
3. **Scalability**: True multi-tenant architecture for SaaS platforms
4. **Flexibility**: Provider-agnostic integration design
5. **International Support**: Multi-currency and tax jurisdiction handling
6. **Reconciliation**: Advanced bank statement matching and discrepancy tracking

### Figgy Weaknesses
1. **User Experience**: Complex interface and setup processes
2. **Real-time Capabilities**: Batch processing limits responsiveness
3. **Development Velocity**: Complex schema slows feature development
4. **Bank Integration UX**: Multi-step setup process vs one-click
5. **Modern Features**: Lacks AI-powered automation and categorization

### Midday Strengths
1. **User Experience**: Intuitive, modern interface design
2. **Real-time Features**: Live bank feeds and instant updates
3. **Development Speed**: Rapid iteration and deployment cycles
4. **AI Integration**: Automated categorization and matching
5. **Bank Connectivity**: Excellent multi-provider integration
6. **Freelancer Focus**: Perfect fit for target market needs

### Midday Weaknesses
1. **Accounting Limitations**: Not suitable for complex bookkeeping
2. **Scalability Questions**: Team-based model may not scale to enterprise
3. **Data Integrity**: Simpler relationships risk data inconsistencies
4. **Customization**: Less flexible for unique business requirements
5. **Compliance**: May not meet enterprise audit and compliance needs

---

## Strategic Recommendations

### Immediate Opportunities (0-3 months)

#### 1. Real-time Bank Integration Layer
**Objective**: Match Midday's real-time capabilities while maintaining Figgy's robustness

**Implementation:**
```sql
-- Add real-time connection tracking
ALTER TABLE integrations ADD COLUMN webhook_url text;
ALTER TABLE integrations ADD COLUMN last_webhook_at timestamp;
ALTER TABLE integrations ADD COLUMN connection_status text DEFAULT 'disconnected';

-- Create transaction feed processing
CREATE TABLE transaction_feeds (
  id text PRIMARY KEY,
  integration_id text REFERENCES integrations(id),
  external_transaction_id text NOT NULL,
  raw_data jsonb NOT NULL,
  processing_status text DEFAULT 'pending',
  auto_categorized boolean DEFAULT false,
  confidence_score numeric(3,2),
  created_at timestamp DEFAULT now()
);
```

#### 2. Enhanced User Experience
**Objective**: Simplify bank connection setup and transaction management

**Key Changes:**
- One-click bank connection wizard
- Real-time balance updates in UI
- Streamlined transaction categorization
- Mobile-responsive design improvements

#### 3. AI-Powered Features
**Objective**: Implement automated categorization and matching

**Components:**
- Transaction categorization ML model
- Receipt/invoice auto-matching system
- Duplicate transaction detection
- Confidence scoring for manual review

### Medium-term Enhancements (3-6 months)

#### 1. Hybrid Architecture
**Objective**: Combine enterprise features with modern UX

**Design:**
- Maintain double-entry bookkeeping foundation
- Add simplified views for small business users
- Implement progressive disclosure for advanced features
- Create role-based interface customization

#### 2. Modern Integration Platform
**Objective**: Build provider-agnostic real-time sync platform

**Features:**
- Webhook management system
- Provider SDK abstraction layer
- Real-time data validation and processing
- Automatic retry and error handling

### Long-term Vision (6-12 months)

#### 1. Best-of-Both-Worlds Platform
**Objective**: Enterprise accounting with Midday's user experience

**Architecture:**
- Maintain enterprise-grade data model
- Add real-time capabilities throughout
- Implement AI-powered automation
- Create market-specific UI modes (freelancer vs enterprise)

#### 2. Advanced Intelligence
**Objective**: Go beyond Midday's current AI capabilities

**Features:**
- Predictive cash flow analysis
- Intelligent expense optimization suggestions
- Automated compliance reporting
- Custom business intelligence dashboards

---

## Implementation Roadmap

### Phase 1: Foundation (Months 1-2)
- [ ] Real-time bank connection infrastructure
- [ ] Webhook processing system
- [ ] Transaction feed pipeline
- [ ] Basic auto-categorization

### Phase 2: User Experience (Months 2-4)
- [ ] Simplified connection wizard
- [ ] Real-time UI updates
- [ ] Mobile-responsive improvements
- [ ] Progressive feature disclosure

### Phase 3: Intelligence (Months 4-6)
- [ ] AI categorization system
- [ ] Auto-matching algorithms
- [ ] Confidence scoring
- [ ] Manual review workflows

### Phase 4: Advanced Features (Months 6-9)
- [ ] Predictive analytics
- [ ] Custom reporting engine
- [ ] Advanced reconciliation AI
- [ ] Multi-market localization

### Phase 5: Platform Optimization (Months 9-12)
- [ ] Performance optimization
- [ ] Scalability improvements
- [ ] Advanced security features
- [ ] Enterprise compliance tools

---

## Conclusion

Midday has successfully created a compelling financial management platform by prioritizing user experience and real-time capabilities. Their approach demonstrates the power of simplified data models and modern banking integrations for the freelancer/small business market.

Figgy's current architecture provides a more robust foundation for enterprise accounting needs but lacks the modern user experience and real-time features that make Midday attractive. The strategic opportunity lies in combining both approaches:

**Maintain Figgy's enterprise strengths** (double-entry bookkeeping, audit trails, multi-tenancy) while **adopting Midday's modern capabilities** (real-time sync, AI automation, streamlined UX).

This hybrid approach would create a differentiated platform that serves both small businesses seeking simplicity and enterprises requiring compliance and scalability.

The recommended implementation roadmap provides a structured path to achieve this vision while maintaining system stability and user satisfaction throughout the transition.

---

*Document prepared: [Current Date]  
Analysis based on: Midday.ai GitHub repository and Figgy's current codebase  
Next review: Quarterly assessment of implementation progress*