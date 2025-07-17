import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { suppliers, eq } from '@kibly/shared-db';
import { SupplierIngestionService } from '../../services/ingestion-service';
import { createTestTenant, cleanupTestData, db } from '../test-utils';
import { SupplierFactory } from '../factories';
import { randomUUID } from 'crypto';

describe('Transaction Safety', () => {
  let ingestionService: SupplierIngestionService;
  let tenantId: string;

  beforeEach(async () => {
    ingestionService = new SupplierIngestionService(db);
    const tenant = await createTestTenant();
    tenantId = tenant.id;
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.restoreAllMocks();
  });

  it('handles duplicate company number gracefully', async () => {
    // Create a supplier with a company number
    const [existing] = await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId,
      legalName: 'Existing Company',
      displayName: 'Existing Company',
      companyNumber: '12345678',
      slug: 'existing-company',
      status: 'active'
    }).returning();

    // Try to create another supplier with the same company number
    const result = await ingestionService.ingest({
      tenantId,
      source: 'invoice',
      sourceId: 'test-invoice-duplicate',
      data: {
        name: 'Different Company',
        identifiers: {
          companyNumber: '12345678', // Same company number
          vatNumber: 'GB999999999'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });

    // Should update the existing supplier instead of creating new
    expect(result.success).toBe(true);
    expect(result.action).toBe('updated');
    expect(result.supplierId).toBe(existing.id);

    // Should still only have one supplier
    const suppliersInDb = await db.query.suppliers.findMany({
      where: eq(suppliers.tenantId, tenantId)
    });
    expect(suppliersInDb).toHaveLength(1);
  });

  it('validates required identifiers', async () => {
    // Try to create a supplier without any identifiers
    const result = await ingestionService.ingest({
      tenantId,
      source: 'invoice',
      sourceId: 'test-invoice-no-identifiers',
      data: {
        name: 'No Identifiers Company',
        identifiers: {
          // No company number or VAT number
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });

    // Should fail validation
    expect(result.success).toBe(false);
    expect(result.action).toBe('skipped');
    expect(result.error).toContain('identifier');

    // No supplier should be created
    const suppliersInDb = await db.query.suppliers.findMany({
      where: eq(suppliers.tenantId, tenantId)
    });
    expect(suppliersInDb).toHaveLength(0);
  });
});