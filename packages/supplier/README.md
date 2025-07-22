# Supplier Package

Core supplier management system for Figgy. Handles supplier data ingestion from multiple sources with a unified interface.

## Architecture

### Core Principles
1. **Single Ingestion Interface** - All supplier data flows through one pipeline
2. **Immutable Identifiers** - Company/VAT numbers never change once set
3. **Deterministic Matching** - Consistent results for the same input
4. **Edge Case Handling** - Explicit handling of nulls, duplicates, and conflicts

## Usage

```typescript
import { SupplierIngestionService } from '@figgy/supplier';

// Ingest from any source
const result = await ingestionService.ingest({
  source: 'invoice',
  sourceId: 'invoice-123',
  tenantId: 'tenant-123',
  data: {
    identifiers: {
      companyNumber: 'GB123456',
      vatNumber: 'GB123456789'
    },
    basicInfo: {
      name: 'Acme Ltd',
      tradingName: 'Acme'
    },
    attributes: {
      addresses: [...],
      contacts: [...]
    }
  }
});
```