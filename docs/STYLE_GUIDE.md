# Figgy Service Development Style Guide

## Philosophy

We follow a **pragmatic, startup-friendly approach** inspired by successful companies like Midday. Our goal is to ship features quickly while maintaining code quality and type safety.

### Core Principles

1. **Direct over Abstract** - Use direct database queries and simple functions
2. **Ship over Perfect** - Working code today beats perfect architecture tomorrow  
3. **Type Safety without Ceremony** - TypeScript for safety, not complexity
4. **Measure then Optimize** - Add abstractions only when you feel the pain

## Architecture Patterns

### ❌ What We DON'T Do

```typescript
// ❌ Over-engineered enterprise patterns
interface IInvoiceRepository {
  save(invoice: Invoice): Promise<Invoice>
}

interface IInvoiceService {
  create(cmd: CreateInvoiceCommand): Promise<Result<Invoice, Error>>
}

class InvoiceService implements IInvoiceService {
  constructor(
    private readonly repo: IInvoiceRepository,
    private readonly eventBus: IEventBus,
    private readonly validator: IValidator
  ) {}
}
```

### ✅ What We DO Instead

```typescript
// ✅ Simple, direct functions
export async function createInvoice(input: CreateInvoiceInput) {
  const validated = createInvoiceSchema.parse(input)
  
  const [invoice] = await db
    .insert(invoices)
    .values(validated)
    .returning()
    
  await track('invoice.created', { invoiceId: invoice.id })
  return invoice
}
```

## File Structure

### Module Organization

```
apps/[module]/
├── src/
│   ├── actions/        # Server actions (main business logic)
│   ├── queries/        # Read-only data fetching
│   ├── lib/           # Utilities and helpers
│   ├── types/         # TypeScript types and schemas
│   └── index.ts       # Public exports
```

### File Naming

- Use **kebab-case** for all files: `invoice-actions.ts`
- Group by feature, not by type: `invoice.ts` not `actions.ts`
- Suffix with purpose when needed: `invoice-utils.ts`

## Code Patterns

### 1. Server Actions Pattern

```typescript
// src/actions/invoice.ts

import { db } from '@figgy/shared-db'
import { z } from 'zod'

// Input validation with Zod
const createInvoiceSchema = z.object({
  tenantId: z.string(),
  amount: z.number().positive(),
  dueDate: z.string()
})

// Direct function export
export async function createInvoice(input: z.infer<typeof createInvoiceSchema>) {
  // 1. Validate
  const validated = createInvoiceSchema.parse(input)
  
  // 2. Execute
  const [invoice] = await db
    .insert(invoices)
    .values(validated)
    .returning()
  
  // 3. Track (optional)
  await track('invoice.created', { amount: invoice.amount })
  
  // 4. Return
  return invoice
}
```

### 2. Database Queries

```typescript
// ✅ Direct Drizzle queries
export async function getUnpaidInvoices(tenantId: string) {
  return db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.tenantId, tenantId),
      ne(invoices.status, 'PAID')
    ))
    .orderBy(desc(invoices.dueDate))
}

// ❌ Don't wrap in repositories
class InvoiceRepository {
  async findUnpaid() { ... }
}
```

### 3. Transaction Handling

```typescript
// ✅ Use database transactions for consistency
export async function reconcileTransaction(
  bankTxId: string,
  invoiceId: string
) {
  return db.transaction(async (tx) => {
    await tx.update(bankTransactions).set({ matched: true })...
    await tx.update(invoices).set({ paid: true })...
  })
}
```

### 4. Error Handling

```typescript
// ✅ Simple, explicit error handling
export async function updateInvoice(id: string, data: UpdateData) {
  const [updated] = await db
    .update(invoices)
    .set(data)
    .where(eq(invoices.id, id))
    .returning()
    
  if (!updated) {
    throw new Error(`Invoice ${id} not found`)
  }
  
  return updated
}

// ❌ Don't create complex error hierarchies
class InvoiceNotFoundError extends DomainError { ... }
```

### 5. Type Definitions

```typescript
// ✅ Use Zod schemas as source of truth
export const invoiceSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.enum(['DRAFT', 'SENT', 'PAID'])
})

export type Invoice = z.infer<typeof invoiceSchema>

// ❌ Don't duplicate type definitions
interface Invoice { ... }
const invoiceSchema = z.object({ ... })
```

### 6. API Routes (tRPC)

```typescript
// ✅ Thin routers that call action functions
export const invoiceRouter = router({
  create: procedure
    .input(createInvoiceSchema)
    .mutation(async ({ input }) => {
      return createInvoice(input)  // Direct function call
    }),
    
  list: procedure
    .input(listInvoicesSchema)
    .query(async ({ input }) => {
      return listInvoices(input)
    })
})
```

## Feature Development Workflow

### 1. Start Simple

```typescript
// v1: Direct database query
export async function getInvoices(tenantId: string) {
  return db.select().from(invoices).where(eq(invoices.tenantId, tenantId))
}
```

### 2. Add Features Incrementally

```typescript
// v2: Add filtering
export async function getInvoices(tenantId: string, filter?: InvoiceFilter) {
  let query = db.select().from(invoices).where(eq(invoices.tenantId, tenantId))
  
  if (filter?.status) {
    query = query.where(eq(invoices.status, filter.status))
  }
  
  return query
}
```

### 3. Extract When Repeated

```typescript
// v3: Extract common logic only when needed
function applyInvoiceFilters(query: SelectQuery, filter: InvoiceFilter) {
  // Extracted only after using in 3+ places
}
```

## Testing Strategy

### 1. Integration Tests Over Unit Tests

```typescript
// ✅ Test the actual user flow
test('should create and pay invoice', async () => {
  const invoice = await createInvoice({
    tenantId: 'test',
    amount: 100,
    dueDate: '2024-12-31'
  })
  
  expect(invoice.status).toBe('DRAFT')
  
  const paid = await markInvoicePaid(invoice.id)
  expect(paid.status).toBe('PAID')
})

// ❌ Don't mock everything
test('should call repository.save', () => {
  const mockRepo = { save: jest.fn() }
  // ...
})
```

## Performance Patterns

### 1. Batch Operations

```typescript
// ✅ Single query for bulk updates
export async function bulkCategorizeTransactions(
  ids: string[],
  category: string
) {
  return db
    .update(transactions)
    .set({ category })
    .where(inArray(transactions.id, ids))
}
```

### 2. Optimistic Updates

```typescript
// ✅ Return immediately, process async
export async function importBankStatement(data: ImportData) {
  const job = await createImportJob(data)
  
  // Process async
  void processImportJob(job.id)
  
  return { jobId: job.id, status: 'processing' }
}
```

## Common Utilities

### 1. Date Handling

```typescript
// Use date-fns for date operations
import { startOfMonth, endOfMonth, subDays } from 'date-fns'

export function getCurrentPeriod() {
  return {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  }
}
```

### 2. Money Handling

```typescript
// Use the Money value object for currency operations
import { Money } from '@/domain/value-objects/money'

export function calculateTotal(items: LineItem[]) {
  return items.reduce(
    (sum, item) => sum.add(Money.fromAmount(item.amount, item.currency)),
    Money.zero('USD')
  )
}
```

### 3. Analytics

```typescript
// Track important events
import { track } from '@/lib/analytics'

export async function completeOnboarding(tenantId: string) {
  // ... business logic
  
  await track('onboarding.completed', {
    tenantId,
    step: 'final'
  })
}
```

## Do's and Don'ts

### DO ✅

- Write functions that do one thing well
- Use TypeScript for type safety
- Handle errors explicitly
- Use database transactions for consistency
- Add logging for important operations
- Write integration tests
- Ship features quickly

### DON'T ❌

- Create unnecessary abstractions
- Use dependency injection containers
- Implement complex design patterns
- Write getters/setters
- Create deep inheritance hierarchies
- Mock everything in tests
- Over-optimize prematurely

## Migration Path

When you DO need to add complexity:

```typescript
// Step 1: Start with a function
export async function createInvoice(data) { }

// Step 2: Add validation when needed
const schema = z.object({ ... })
export async function createInvoice(data) {
  const validated = schema.parse(data)
}

// Step 3: Extract types when reused
export type CreateInvoiceInput = z.infer<typeof schema>

// Step 4: Create service class ONLY if you have 10+ related functions
export class InvoiceService {
  create(data: CreateInvoiceInput) { }
  update(id: string, data: UpdateData) { }
  // ... many more methods
}
```

## Examples from Our Codebase

### Good Example ✅

```typescript
// apps/finance/src/actions/transaction.ts
export async function categorizeTransaction(
  transactionId: string,
  category: string
) {
  // Direct database update
  const [updated] = await db
    .update(transactions)
    .set({ category })
    .where(eq(transactions.id, transactionId))
    .returning()
    
  // Track for analytics
  await track('transaction.categorized', { category })
  
  return updated
}
```

### To Refactor ❌

```typescript
// Old class-based approach
export class FinanceService {
  constructor(private db: DrizzleClient) {
    this.accounting = new AccountingService(db)
    this.banking = new BankingService(db)
  }
}

// Should be simple functions instead
export async function getFinancialSummary(tenantId: string) {
  // Direct queries
}
```

## Summary

**Build like a startup, not an enterprise.** Focus on shipping features that users love. Add complexity only when you feel the pain. Use TypeScript for safety, not ceremony. Direct database queries are fine. Simple functions are better than complex classes. 

Remember: Instagram started with a simple Django app. They scaled later. So will you. 🚀