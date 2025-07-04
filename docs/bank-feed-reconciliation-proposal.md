# Bank Feed Reconciliation System - Technical Implementation Proposal

## Executive Summary

This proposal outlines the design for a standardized bank feed reconciliation system that will:
- Import raw bank statement data from multiple sources (Xero, QuickBooks, direct bank feeds)
- Enable AI-powered matching between bank transactions and accounting records
- Support document attachment and transaction enhancement
- Maintain audit trails and reconciliation history

## Current State Analysis

### What We Have
- **Xero Integration**: Imports already-reconciled transactions with full accounting details
- **Transaction Storage**: Database schema for reconciled transactions with line items
- **Provider Abstraction**: Multi-provider architecture supporting different accounting systems

### What We're Missing
- **Raw Bank Feeds**: No visibility into unreconciled bank transactions
- **Reconciliation Status**: Cannot track which transactions are matched/unmatched
- **Bank Feed Links**: No connection between bank statement lines and accounting transactions
- **AI Matching**: No automated suggestion system for reconciliation

## Proposed Architecture

### 1. Database Schema Design

#### New Table: `bank_feeds`
Stores raw bank statement data from all sources.

```sql
CREATE TABLE bank_feeds (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Source tracking
  integration_id UUID REFERENCES integrations(id),
  provider_type provider_type NOT NULL, -- xero, quickbooks, bank_direct, etc.
  
  -- Bank feed line identification
  provider_feed_id VARCHAR(255), -- Unique ID from provider (e.g., Xero statement line ID)
  bank_account_id VARCHAR(255),
  bank_account_name VARCHAR(255),
  
  -- Core transaction data (raw from bank)
  transaction_date DATE NOT NULL,
  posted_date DATE,
  amount DECIMAL(18,6) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  balance DECIMAL(18,6), -- Running balance after this transaction
  
  -- Transaction details
  description TEXT, -- Raw bank description
  reference VARCHAR(255), -- Check number, wire reference, etc.
  transaction_type VARCHAR(50), -- debit, credit, transfer, fee, interest
  
  -- Reconciliation tracking
  reconciliation_status VARCHAR(20) DEFAULT 'unmatched', -- unmatched, suggested, matched, reconciled
  matched_transaction_id UUID REFERENCES transactions(id),
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  matched_at TIMESTAMP,
  matched_by VARCHAR(50), -- 'ai', 'user', 'rule', 'provider'
  
  -- Provider-specific data
  provider_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_bank_feeds_tenant_date (tenant_id, transaction_date DESC),
  INDEX idx_bank_feeds_status (tenant_id, reconciliation_status),
  INDEX idx_bank_feeds_unmatched (tenant_id, reconciliation_status) WHERE reconciliation_status = 'unmatched',
  UNIQUE KEY unique_provider_feed (tenant_id, integration_id, provider_feed_id)
);
```

#### New Table: `bank_feed_reconciliations`
Tracks the relationship between bank feeds and accounting transactions.

```sql
CREATE TABLE bank_feed_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_feed_id UUID NOT NULL REFERENCES bank_feeds(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  
  -- Reconciliation metadata
  reconciliation_type VARCHAR(50), -- exact_match, partial_match, manual, rule_based, ai_suggested
  match_score DECIMAL(3,2), -- 0.00 to 1.00 confidence
  matched_fields JSONB, -- Which fields matched: {amount: true, date: true, reference: false}
  
  -- For split transactions
  allocated_amount DECIMAL(18,6), -- If partially allocated
  is_primary_match BOOLEAN DEFAULT true, -- For 1-to-many matches
  
  -- AI/Rule metadata
  match_reasons JSONB, -- Detailed reasons for the match
  ai_model_version VARCHAR(50), -- Track which AI model made the suggestion
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  approved_at TIMESTAMP,
  approved_by UUID,
  
  -- Indexes
  INDEX idx_reconciliations_bank_feed (bank_feed_id),
  INDEX idx_reconciliations_transaction (transaction_id),
  UNIQUE KEY unique_primary_match (bank_feed_id, is_primary_match) WHERE is_primary_match = true
);
```

#### Updates to Existing `transactions` Table
Add reference to source bank feed:

```sql
ALTER TABLE transactions ADD COLUMN source_bank_feed_id UUID REFERENCES bank_feeds(id);
ALTER TABLE transactions ADD INDEX idx_transactions_bank_feed (source_bank_feed_id);
```

### 2. Standardized Bank Feed Interface

```typescript
// Core bank feed data structure
interface StandardizedBankFeed {
  // Required fields (must be provided by all sources)
  sourceId: string;          // Provider's unique identifier
  accountId: string;         // Bank account identifier
  transactionDate: Date;     // When transaction occurred
  amount: number;            // Positive for deposits, negative for withdrawals
  currency: string;          // ISO currency code
  description: string;       // Raw description from bank
  
  // Optional fields (may not be available from all sources)
  postedDate?: Date;         // When transaction cleared
  balance?: number;          // Running balance after transaction
  reference?: string;        // Check number, transaction ID, etc.
  type?: BankTransactionType;
  merchantName?: string;     // Extracted merchant name
  category?: string;         // Bank's auto-categorization
  
  // Provider context
  provider: BankFeedProvider;
  rawData: Record<string, unknown>;
}

enum BankTransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit', 
  TRANSFER = 'transfer',
  FEE = 'fee',
  INTEREST = 'interest',
  REVERSAL = 'reversal'
}

enum BankFeedProvider {
  XERO = 'xero',
  QUICKBOOKS = 'quickbooks',
  SAGE = 'sage',
  BANK_DIRECT = 'bank_direct',
  PLAID = 'plaid',
  CSV_IMPORT = 'csv_import',
  OFX_IMPORT = 'ofx_import'
}
```

### 3. Provider-Specific Implementations

#### Xero Bank Feeds
```typescript
interface XeroBankFeedAdapter {
  // Fetch raw bank statement lines (requires Bank Feeds API access)
  fetchBankStatementLines(
    tenantId: string,
    accountId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<StandardizedBankFeed[]>;
  
  // Map Xero statement line to standard format
  mapToStandardFormat(xeroStatementLine: XeroStatementLine): StandardizedBankFeed;
  
  // Get reconciliation status from Xero
  getReconciliationStatus(statementLineId: string): Promise<ReconciliationInfo>;
}
```

#### QuickBooks Bank Feeds
```typescript
interface QuickBooksBankFeedAdapter {
  // Fetch bank transactions from QuickBooks Banking API
  fetchBankingTransactions(
    realmId: string,
    accountId?: string,
    status?: 'matched' | 'unmatched'
  ): Promise<StandardizedBankFeed[]>;
  
  // Map QuickBooks banking transaction to standard format
  mapToStandardFormat(qbBankingTxn: QBBankingTransaction): StandardizedBankFeed;
}
```

#### Direct Bank Import
```typescript
interface DirectBankImportAdapter {
  // Parse various bank file formats
  parseCSV(fileContent: string, mapping: FieldMapping): Promise<StandardizedBankFeed[]>;
  parseOFX(fileContent: string): Promise<StandardizedBankFeed[]>;
  parseBAI2(fileContent: string): Promise<StandardizedBankFeed[]>;
  
  // API integrations
  fetchViaPlaid(accessToken: string, accountId: string): Promise<StandardizedBankFeed[]>;
  fetchViaYodlee(credentials: YodleeAuth): Promise<StandardizedBankFeed[]>;
}
```

### 4. Reconciliation Engine

#### Matching Algorithm
```typescript
interface ReconciliationEngine {
  // Find potential matches for a bank feed
  findMatches(
    bankFeed: BankFeed,
    candidates: Transaction[]
  ): Promise<MatchResult[]>;
  
  // Score a potential match
  calculateMatchScore(
    bankFeed: BankFeed,
    transaction: Transaction
  ): MatchScore;
  
  // Apply reconciliation rules
  applyRules(
    bankFeed: BankFeed,
    rules: ReconciliationRule[]
  ): Promise<RuleMatchResult>;
}

interface MatchScore {
  overall: number;           // 0.0 to 1.0
  components: {
    amount: number;          // Exact or within tolerance
    date: number;            // Same day, within range
    reference: number;       // Reference number match
    description: number;     // Text similarity
    pattern: number;         // Historical pattern match
  };
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}
```

#### AI-Powered Matching
```typescript
interface AIReconciliationService {
  // Use ML to suggest matches
  suggestMatches(
    bankFeed: BankFeed,
    historicalMatches: ReconciliationHistory
  ): Promise<AISuggestion[]>;
  
  // Learn from user feedback
  trainModel(
    bankFeed: BankFeed,
    selectedMatch: Transaction,
    rejectedMatches: Transaction[]
  ): Promise<void>;
  
  // Extract entities from descriptions
  extractEntities(description: string): {
    merchant?: string;
    category?: string;
    paymentMethod?: string;
  };
}
```

### 5. Reconciliation Workflow

#### States and Transitions
```
Bank Feed States:
1. IMPORTED -> Raw bank feed imported
2. ENRICHED -> Enhanced with extracted data
3. SUGGESTED -> AI/rules have suggested matches  
4. MATCHED -> User has selected a match
5. RECONCILED -> Fully reconciled with accounting
6. DISPUTED -> Marked for review
```

#### API Endpoints
```typescript
// Bank Feed Management
POST   /api/bank-feeds/import           // Import bank feeds
GET    /api/bank-feeds                  // List bank feeds with filters
GET    /api/bank-feeds/unreconciled     // Get unreconciled feeds
GET    /api/bank-feeds/:id              // Get specific feed details

// Reconciliation Operations  
POST   /api/reconciliation/suggest      // Get AI suggestions for a feed
POST   /api/reconciliation/match        // Create a match
DELETE /api/reconciliation/match/:id    // Unmatch transactions
POST   /api/reconciliation/bulk         // Bulk reconciliation

// Rules and Automation
GET    /api/reconciliation/rules        // List reconciliation rules
POST   /api/reconciliation/rules        // Create new rule
POST   /api/reconciliation/auto-match   // Run automatic matching
```

### 6. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1-2)
- Create database schemas
- Implement standardized bank feed interface
- Build basic import functionality for CSV/OFX

#### Phase 2: Provider Integrations (Week 3-4)
- Implement Xero Bank Feeds API integration
- Add QuickBooks Banking API support
- Create provider adapter pattern

#### Phase 3: Reconciliation Engine (Week 5-6)
- Build rule-based matching algorithm
- Implement confidence scoring
- Create reconciliation API endpoints

#### Phase 4: AI Enhancement (Week 7-8)
- Integrate AI for description analysis
- Build learning system from user feedback
- Implement pattern recognition

#### Phase 5: UI and Workflow (Week 9-10)
- Create reconciliation interface
- Build bulk operations
- Add audit trail and reporting

### 7. Technical Considerations

#### Performance
- Index strategy for fast matching queries
- Batch processing for large imports
- Caching for frequently accessed data

#### Security
- Encrypt sensitive bank data at rest
- Audit trail for all reconciliation actions
- Role-based access control

#### Scalability
- Queue-based processing for imports
- Horizontal scaling for matching engine
- Archival strategy for old bank feeds

#### Data Quality
- Duplicate detection and prevention
- Data validation rules
- Standardization of amounts and dates

### 8. Success Metrics

- **Match Rate**: % of bank feeds successfully matched
- **Accuracy**: % of correct matches (no user corrections)
- **Processing Time**: Average time to process bank feed
- **User Efficiency**: Time saved vs manual reconciliation

## Next Steps

1. Review and refine the proposal
2. Prioritize implementation phases
3. Define specific provider requirements
4. Design user interface mockups
5. Plan data migration strategy

## Questions for Discussion

1. Which providers should we prioritize?
2. What matching tolerance rules should we implement?
3. How should we handle many-to-many reconciliations?
4. What level of AI automation is desired?
5. Should we support real-time bank feeds?