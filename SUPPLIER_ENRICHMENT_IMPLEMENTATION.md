# Supplier Enrichment Implementation Ticket

## Overview
Implement an automated supplier enrichment system that discovers supplier websites and extracts business intelligence to improve invoice categorization and provide spend insights.

## Architecture Context
- **Goal**: Enrich global suppliers with domain, logo, and business information
- **Approach**: Two-stage enrichment (domain discovery → website analysis)
- **Integration**: Leverages existing Portkey LLM and Trigger.dev infrastructure

## Implementation Tasks

### 1. Configuration Updates

#### Add External Service Keys
**File**: `packages/config/src/schemas/external-services.ts`

Add these new configuration fields:
```typescript
/**
 * Serper API key for web search
 * Used for discovering supplier websites
 * @see https://serper.dev
 */
SERPER_API_KEY: z
  .string()
  .min(1, "SERPER_API_KEY is required for supplier enrichment")
  .optional(),

/**
 * Firecrawl API key for web scraping
 * Used for extracting website content as markdown
 * @see https://firecrawl.dev
 */
FIRECRAWL_API_KEY: z
  .string()
  .min(1, "FIRECRAWL_API_KEY is required for website analysis")
  .optional(),
```

### 2. Database Schema Updates

#### Extend Global Suppliers Table
**Migration**: Create new migration file to add enrichment fields

```sql
-- Add enrichment tracking fields to global_suppliers
ALTER TABLE global_suppliers
ADD COLUMN enrichment_status TEXT DEFAULT 'pending' 
  CHECK (enrichment_status IN ('pending', 'enriched', 'failed', 'insufficient_data')),
ADD COLUMN enrichment_data JSONB,
ADD COLUMN last_enrichment_at TIMESTAMPTZ,
ADD COLUMN enrichment_attempts INTEGER DEFAULT 0,
ADD COLUMN domain_discovered_at TIMESTAMPTZ;

-- Add indexes for enrichment queries
CREATE INDEX idx_global_suppliers_enrichment_status 
  ON global_suppliers(enrichment_status);
CREATE INDEX idx_global_suppliers_last_enrichment 
  ON global_suppliers(last_enrichment_at);
```

### 3. Create Enrichment Service

#### File Structure
```
packages/supplier/src/services/enrichment/
├── enrichment-service.ts      # Main orchestrator
├── domain-discovery.ts        # Serper integration
├── website-analyzer.ts        # Firecrawl integration
└── enrichment-types.ts        # Type definitions
```

#### Core Service Implementation
**File**: `packages/supplier/src/services/enrichment/enrichment-service.ts`

```typescript
import { getPortkeyClient } from "@figgy/llm-utils";
import { globalSuppliers } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { DomainDiscovery } from "./domain-discovery";
import { WebsiteAnalyzer } from "./website-analyzer";

export class SupplierEnrichmentService {
  private portkey = getPortkeyClient();
  private domainDiscovery = new DomainDiscovery();
  private websiteAnalyzer = new WebsiteAnalyzer();

  async shouldEnrichSupplier(supplier: any): boolean {
    // Skip if recently enriched
    if (supplier.enrichmentStatus === 'enriched') {
      const daysSinceEnrichment = this.getDaysSince(supplier.lastEnrichmentAt);
      if (daysSinceEnrichment < 90) return false;
    }

    // Skip if too many failed attempts
    if (supplier.enrichmentAttempts >= 3) {
      const daysSinceLastAttempt = this.getDaysSince(supplier.lastEnrichmentAt);
      if (daysSinceLastAttempt < 30) return false;
    }

    // Skip if insufficient data (no identifiers)
    if (!supplier.companyNumber && !supplier.vatNumber && !supplier.canonicalName) {
      return false;
    }

    return true;
  }

  async discoverDomain(globalSupplierId: string): Promise<string | null> {
    const supplier = await this.getGlobalSupplier(globalSupplierId);
    
    // Search for website
    const searchResults = await this.domainDiscovery.searchForWebsite(supplier);
    
    // Validate with LLM
    const domain = await this.validateDomainWithLLM(supplier, searchResults);
    
    if (domain) {
      await this.updateGlobalSupplier(globalSupplierId, {
        primaryDomain: domain,
        domainDiscoveredAt: new Date(),
      });
    }
    
    return domain;
  }

  private async validateDomainWithLLM(supplier: any, searchResults: any[]): Promise<string | null> {
    const prompt = `
    You are a STRICT validator finding the OFFICIAL website for a company.
    
    Company Information:
    - Name: ${supplier.canonicalName}
    - Company Number: ${supplier.companyNumber || 'Not provided'}
    - VAT Number: ${supplier.vatNumber || 'Not provided'}
    
    Search Results:
    ${JSON.stringify(searchResults.slice(0, 10), null, 2)}
    
    Rules:
    1. ONLY return a domain if you are CERTAIN it's the official company website
    2. REJECT all directories (linkedin.com, bloomberg.com, dnb.com, companies house, etc)
    3. REJECT review sites (trustpilot, yelp, glassdoor, etc)
    4. REJECT news articles and press releases
    5. Look for domains that match the company name
    6. Verify company registration numbers if shown in results
    7. Return NULL if uncertain
    
    Return ONLY the domain (e.g., "example.com") or NULL.
    `;

    const response = await this.portkey.chat.completions.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0, // Deterministic for validation
    });

    const domain = response.choices[0]?.message?.content?.trim();
    return domain === 'NULL' ? null : domain;
  }

  async analyzeWebsite(globalSupplierId: string, domain: string): Promise<any> {
    // Scrape website
    const websiteContent = await this.websiteAnalyzer.scrapeWebsite(domain);
    
    // Analyze with LLM
    const enrichmentData = await this.extractBusinessIntelligence(websiteContent);
    
    // Update global supplier
    await this.updateGlobalSupplier(globalSupplierId, {
      enrichmentStatus: 'enriched',
      enrichmentData,
      lastEnrichmentAt: new Date(),
    });
    
    return enrichmentData;
  }

  private async extractBusinessIntelligence(websiteContent: string): Promise<any> {
    const prompt = `
    Analyze this company website and extract structured business intelligence.
    
    Extract the following information:
    1. Industry/Company Type (be specific, e.g., "B2B SaaS - Project Management", "Manufacturing - Electronics")
    2. Primary Services/Products (list main offerings)
    3. Company Size Indicators (employees, locations, revenue if mentioned)
    4. Key Certifications/Accreditations (ISO, SOC2, etc)
    5. Target Market (B2B/B2C, industries served)
    6. Business Model (subscription, one-time purchase, consulting, etc)
    
    This data will be used to:
    - Automatically categorize invoices from this supplier
    - Provide spend analysis insights
    - Detect anomalous purchases
    
    Website Content:
    ${websiteContent}
    
    Return as JSON with these exact fields:
    {
      "industry": "specific industry classification",
      "companyType": "type of company",
      "services": ["service1", "service2"],
      "companySize": "size indicator",
      "certifications": ["cert1", "cert2"],
      "targetMarket": "market description",
      "businessModel": "model description",
      "confidenceScore": 0.0-1.0
    }
    `;

    const response = await this.portkey.chat.completions.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }
}
```

### 4. Create Trigger.dev Jobs

#### Domain Discovery Job
**File**: `packages/jobs/src/tasks/suppliers/discover-domain.ts`

```typescript
import { task } from "@trigger.dev/sdk/v3";
import { SupplierEnrichmentService } from "@figgy/supplier/enrichment";
import { tasks } from "@trigger.dev/sdk/v3";

export const discoverSupplierDomain = task({
  id: "discover-supplier-domain",
  maxDuration: 300, // 5 minutes
  queue: {
    concurrencyLimit: 10, // Limit concurrent searches
  },
  run: async (payload: { globalSupplierId: string }) => {
    const { globalSupplierId } = payload;
    const enrichmentService = new SupplierEnrichmentService();

    try {
      // Check if enrichment needed
      const supplier = await getGlobalSupplier(globalSupplierId);
      if (!enrichmentService.shouldEnrichSupplier(supplier)) {
        return { skipped: true, reason: 'Enrichment not needed' };
      }

      // Discover domain
      const domain = await enrichmentService.discoverDomain(globalSupplierId);

      if (domain) {
        // Trigger logo fetch
        await tasks.trigger("fetch-logo", {
          globalSupplierIds: [globalSupplierId]
        });

        // Trigger website analysis
        await tasks.trigger("analyze-supplier-website", {
          globalSupplierId,
          domain
        });

        return { success: true, domain };
      }

      return { success: false, reason: 'No domain found' };
    } catch (error) {
      logger.error("Domain discovery failed", { error, globalSupplierId });
      
      // Update failure count
      await incrementEnrichmentAttempts(globalSupplierId);
      
      throw error;
    }
  },
});
```

#### Website Analysis Job
**File**: `packages/jobs/src/tasks/suppliers/analyze-website.ts`

```typescript
export const analyzeSupplierWebsite = task({
  id: "analyze-supplier-website",
  maxDuration: 300,
  queue: {
    concurrencyLimit: 5, // Limit Firecrawl API calls
  },
  run: async (payload: { globalSupplierId: string; domain: string }) => {
    const { globalSupplierId, domain } = payload;
    const enrichmentService = new SupplierEnrichmentService();

    try {
      const enrichmentData = await enrichmentService.analyzeWebsite(
        globalSupplierId,
        domain
      );

      logger.info("Website analysis completed", {
        globalSupplierId,
        domain,
        industry: enrichmentData.industry,
      });

      return { success: true, enrichmentData };
    } catch (error) {
      logger.error("Website analysis failed", { error, globalSupplierId, domain });
      
      await updateGlobalSupplier(globalSupplierId, {
        enrichmentStatus: 'failed',
        lastEnrichmentAt: new Date(),
      });
      
      throw error;
    }
  },
});
```

### 5. Integration Points

#### Update Supplier Creation Flow
**File**: `packages/jobs/src/tasks/suppliers/process-invoice-supplier.ts`

Add after global supplier creation/linking:
```typescript
// After linking to global supplier (around line 318)
if (globalSupplierId) {
  // Check if domain discovery needed
  const globalSupplier = await tx
    .select()
    .from(globalSuppliers)
    .where(eq(globalSuppliers.id, globalSupplierId))
    .limit(1);

  if (globalSupplier && !globalSupplier.primaryDomain) {
    // Queue domain discovery
    await tasks.trigger("discover-supplier-domain", {
      globalSupplierId
    });
  }
}
```

#### Update Invoice Categorization
**File**: `packages/jobs/src/tasks/files/categorize-file.ts`

Use enrichment data for smart categorization:
```typescript
// When categorizing invoice
if (extraction.matchedSupplierId) {
  const supplier = await getSupplierWithEnrichment(extraction.matchedSupplierId);
  
  if (supplier.globalSupplier?.enrichmentData) {
    const { industry, companyType, services } = supplier.globalSupplier.enrichmentData;
    
    // Use enrichment for categorization
    const category = determineCategoryFromEnrichment({
      industry,
      companyType,
      services,
      documentType: extraction.documentType,
      amount: extraction.totalAmount,
    });
    
    // Examples:
    // "B2B SaaS" + "subscription" → "Software Subscriptions"
    // "Office Supplies" + "products" → "Office Expenses"
    // "Professional Services" + "consulting" → "Consulting Fees"
  }
}
```

### 6. External Service Integrations

#### Serper Integration
**File**: `packages/supplier/src/services/enrichment/domain-discovery.ts`

```typescript
export class DomainDiscovery {
  private apiKey = getConfig().getExternalServices().SERPER_API_KEY;

  async searchForWebsite(supplier: any): Promise<any[]> {
    const queries = this.buildSearchQueries(supplier);
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: queries[0], // Primary query
        num: 10,
        gl: supplier.country || 'us',
      }),
    });

    const data = await response.json();
    return data.organic || [];
  }

  private buildSearchQueries(supplier: any): string[] {
    const queries = [];
    
    // Primary search - company name + official website
    queries.push(`"${supplier.canonicalName}" official website`);
    
    // Include registration numbers if available
    if (supplier.companyNumber) {
      queries.push(`"${supplier.companyNumber}" company website`);
    }
    
    if (supplier.vatNumber) {
      queries.push(`"${supplier.vatNumber}" business`);
    }
    
    return queries;
  }
}
```

#### Firecrawl Integration
**File**: `packages/supplier/src/services/enrichment/website-analyzer.ts`

```typescript
export class WebsiteAnalyzer {
  private apiKey = getConfig().getExternalServices().FIRECRAWL_API_KEY;

  async scrapeWebsite(domain: string): Promise<string> {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://${domain}`,
        formats: ['markdown'],
        onlyMainContent: true,
        includeTags: ['title', 'meta', 'h1', 'h2', 'p', 'li'],
        waitFor: 2000, // Wait for dynamic content
        timeout: 30000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.markdown || '';
  }
}
```

### 7. Error Handling & Rate Limiting

Implement exponential backoff and rate limiting:
```typescript
class RateLimiter {
  private lastCallTime: number = 0;
  private callCount: number = 0;
  private resetTime: number = Date.now() + 60000; // 1 minute window

  async waitIfNeeded(apiName: string, maxPerMinute: number): Promise<void> {
    const now = Date.now();
    
    // Reset counter if window passed
    if (now > this.resetTime) {
      this.callCount = 0;
      this.resetTime = now + 60000;
    }
    
    // Check rate limit
    if (this.callCount >= maxPerMinute) {
      const waitTime = this.resetTime - now;
      logger.info(`Rate limit reached for ${apiName}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Ensure minimum time between calls
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < 1000) { // 1 second minimum
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
    }
    
    this.lastCallTime = Date.now();
    this.callCount++;
  }
}
```

### 8. Testing Checklist

1. **Unit Tests**:
   - Domain validation logic (strict LLM validation)
   - Search query building
   - Enrichment data extraction
   - Rate limiting logic

2. **Integration Tests**:
   - Serper API integration (mock responses)
   - Firecrawl API integration (mock responses)
   - Database updates
   - Job triggering

3. **End-to-End Tests**:
   - Invoice upload → supplier creation → enrichment flow
   - Enrichment data used in categorization
   - Error handling and retries

### 9. Monitoring & Metrics

Add tracking for:
- Domain discovery success rate
- Website analysis completion rate
- Enrichment impact on categorization accuracy
- API costs (track calls to Serper and Firecrawl)
- Average enrichment time per supplier

### 10. Security Considerations

1. **API Key Security**: Store in environment variables, never commit
2. **Domain Validation**: Strict LLM validation prevents malicious domains
3. **Rate Limiting**: Prevents API abuse and cost overruns
4. **Data Privacy**: Only enrich at global level, no tenant data mixing
5. **Input Sanitization**: Clean supplier names before searches

## Success Criteria

1. ✅ Domain discovery finds official websites with >80% accuracy
2. ✅ Website analysis extracts meaningful business intelligence
3. ✅ Enrichment data improves invoice categorization
4. ✅ System handles failures gracefully with retries
5. ✅ API costs stay within budget (<$0.05 per supplier)

## Notes for Implementation

- Start with domain discovery, test thoroughly before adding website analysis
- Use existing patterns from logo service for rate limiting
- Leverage existing Portkey setup for all LLM calls
- Follow existing code style and error handling patterns
- Add comprehensive logging for debugging and monitoring