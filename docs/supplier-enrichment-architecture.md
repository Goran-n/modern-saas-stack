# Supplier Enrichment Architecture

## Overview

The supplier enrichment system automatically gathers intelligence about suppliers to improve invoice categorization and provide business insights. It operates at the global supplier level to create a shared knowledge pool that benefits all tenants.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPPLIER ENRICHMENT FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ Invoice Upload  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Extract Supplier    │
│ (Name, VAT, etc)    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Create/Match Tenant Supplier│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Find/Create Global Supplier         │
└────────┬────────────────────────────┘
         │
         ▼
    ┌────┴────┐
    │ Domain? │
    └────┬────┘
         │
    ┌────┴────┐
    │   NO    │──────────┐
    └─────────┘          │
                         ▼
              ┌──────────────────────┐
              │ JOB: Domain Discovery│
              └──────────┬───────────┘
                         │
                    ┌────▼─────┐
                    │  Serper  │
                    │  Search  │
                    └────┬─────┘
                         │
                    ┌────▼─────────┐
                    │ LLM Validates│
                    │ (STRICT!)    │
                    └────┬─────────┘
                         │
                  ┌──────┴───────┐
                  │ Domain Found? │
                  └──────┬───────┘
                         │
                    ┌────▼─────┐
                    │   YES    │
                    └────┬─────┘
                         │
              ┌──────────▼──────────┐
              │ Update primaryDomain│
              └──────────┬──────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐            ┌─────────────────────┐
│ JOB: Logo Fetch │            │ JOB: Website Analysis│
└─────────────────┘            └──────────┬──────────┘
                                          │
                               ┌──────────▼──────────┐
                               │ Firecrawl: Get MD   │
                               └──────────┬──────────┘
                                          │
                               ┌──────────▼──────────┐
                               │ LLM: Extract Info   │
                               │ • Industry/Type     │
                               │ • Services          │
                               │ • Company Size      │
                               └──────────┬──────────┘
                                          │
                               ┌──────────▼──────────┐
                               │ Store Enrichment    │
                               │ in Global Supplier  │
                               └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         USAGE IN CATEGORIZATION                      │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Process Invoice│────▶│ Load Enrichment │────▶│ Smart Categories │
│                │     │ from Global Sup │     │ Software → SaaS  │
└────────────────┘     └─────────────────┘     └──────────────────┘
```

## Key Components

### 1. Domain Discovery Job
- **Purpose**: Find the official website for suppliers without a domain
- **Process**:
  1. Searches using Serper API with company name, VAT, and registration numbers
  2. LLM strictly validates results to avoid directories and aggregators
  3. Updates `globalSuppliers.primaryDomain` if confident match found
  4. Triggers logo fetch and website analysis jobs

### 2. Website Analysis Job
- **Purpose**: Extract business intelligence from supplier websites
- **Process**:
  1. Firecrawl converts website to markdown
  2. LLM analyzes content to extract:
     - Industry/company type
     - Services and products
     - Company size indicators
     - Certifications
  3. Stores enrichment data in `globalSuppliers.enrichmentData`

### 3. Logo Fetch Job (Existing)
- Automatically triggered when domain is discovered
- Uses Logo.dev API to fetch company logos
- Already implemented with rate limiting and retry logic

## Data Model

### Global Supplier Enrichment Fields
```typescript
globalSuppliers {
  // Existing fields
  id: uuid
  canonicalName: string
  primaryDomain: string?
  logoUrl: string?
  
  // New enrichment fields
  enrichmentStatus: 'pending' | 'enriched' | 'failed' | 'insufficient_data'
  enrichmentData: {
    industry: string
    companyType: string
    services: string[]
    companySize: string
    certifications: string[]
    targetMarket: string
    websiteAnalyzedAt: Date
  }
  lastEnrichmentAt: Date
  enrichmentAttempts: number
}
```

## Benefits

1. **Automated Categorization**: Invoices are automatically categorized based on supplier type
2. **Shared Knowledge**: Enrichment at global level benefits all tenants
3. **Cost Efficiency**: Each supplier enriched only once
4. **Progressive Enhancement**: System works without enrichment but improves over time

## Integration Points

1. **Invoice Processing**: Uses enrichment data for smart categorization
2. **Supplier Creation**: Triggers enrichment for new global suppliers
3. **Manual Enrichment**: TRPC endpoints for on-demand enrichment
4. **Reporting**: Enhanced spend analysis with supplier intelligence

## Security & Privacy

- Enrichment happens only at global supplier level
- No tenant-specific data is shared
- Strict domain validation prevents data leakage
- Rate limiting protects against API abuse

## Monitoring

Track these metrics:
- Domain discovery success rate
- Website analysis completion rate
- Enrichment impact on categorization accuracy
- API costs (Serper + Firecrawl)