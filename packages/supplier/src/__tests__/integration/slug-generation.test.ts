import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { suppliers, eq } from '@kibly/shared-db';
import { SupplierIngestionService } from '../../services/ingestion-service';
import { createTestTenant, cleanupTestData, db } from '../test-utils';
import { SupplierFactory } from '../factories';
import { randomUUID } from 'crypto';

describe('Unique Slug Generation', () => {
  let ingestionService: SupplierIngestionService;
  let tenantId: string;

  beforeEach(async () => {
    ingestionService = new SupplierIngestionService(db);
    const tenant = await createTestTenant();
    tenantId = tenant.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('handles slug collisions correctly', async () => {
    // Create 3 suppliers with slugs that would collide with 'acme-ltd'
    // Use completely different names to avoid name matching
    await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId,
      legalName: 'ABC Company',
      displayName: 'ABC Company',
      companyNumber: '11111111',
      slug: 'acme-ltd', // Using the slug we want to test collision with
      status: 'active'
    });

    await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId,
      legalName: 'XYZ Solutions',
      displayName: 'XYZ Solutions',
      companyNumber: '22222222',
      slug: 'acme-ltd-1',
      status: 'active'
    });

    await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId,
      legalName: 'Global Enterprises',
      displayName: 'Global Enterprises',
      companyNumber: '33333333',
      slug: 'acme-ltd-2',
      status: 'active'
    });
    
    // Now create ACME Ltd via ingestion - should get acme-ltd-3
    const result = await ingestionService.ingest({
      tenantId,
      source: 'invoice',
      sourceId: 'test-invoice-slug1',
      data: {
        name: 'ACME Ltd',
        identifiers: {
          vatNumber: 'GB123456789',
          companyNumber: '44444444'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });
    
    // Check if ingestion was successful
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.supplierId).toBeDefined();
    
    if (result.supplierId) {
      // Need to fetch the supplier to check the slug
      const createdSupplier = await db.query.suppliers.findFirst({
        where: eq(suppliers.id, result.supplierId)
      });
      expect(createdSupplier?.slug).toBe('acme-ltd-3');
    }
  });

  it('generates unique slugs per tenant', async () => {
    // Create tenant A supplier
    const tenantA = await createTestTenant();
    const [supplierA] = await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId: tenantA.id,
      legalName: 'ACME Ltd',
      displayName: 'ACME Ltd',
      companyNumber: '11111111',
      slug: 'acme-ltd',
      status: 'active'
    }).returning();

    // Create same name in different tenant - should get same slug
    const result = await ingestionService.ingest({
      tenantId,
      source: 'invoice',
      sourceId: 'test-invoice-slug2',
      data: {
        name: 'ACME Ltd',
        identifiers: {
          vatNumber: 'GB123456789'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.supplierId).toBeDefined();
    
    if (result.supplierId) {
      const createdSupplier = await db.query.suppliers.findFirst({
        where: eq(suppliers.id, result.supplierId)
      });
      expect(createdSupplier?.slug).toBe('acme-ltd'); // Not acme-ltd-1
    }
  });

  it('handles special characters in company names', async () => {
    const result = await ingestionService.ingest({
      tenantId,
      source: 'invoice',
      sourceId: 'test-invoice-slug3',
      data: {
        name: 'ACME & Co. Ltd!',
        identifiers: {
          vatNumber: 'GB123456789'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.supplierId).toBeDefined();
    
    if (result.supplierId) {
      const createdSupplier = await db.query.suppliers.findFirst({
        where: eq(suppliers.id, result.supplierId)
      });
      // Should normalize to alphanumeric with hyphens
      expect(createdSupplier?.slug).toMatch(/^[a-z0-9-]+$/);
      expect(createdSupplier?.slug).toBe('acme-co-ltd');
    }
  });

  it('handles very long company names', async () => {
    const longName = 'A'.repeat(100) + ' Limited Company Name That Is Very Long';
    
    const result = await ingestionService.ingest({
      tenantId,
      source: 'invoice',
      sourceId: 'test-invoice-slug4',
      data: {
        name: longName,
        identifiers: {
          vatNumber: 'GB123456789'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.supplierId).toBeDefined();
    
    if (result.supplierId) {
      const createdSupplier = await db.query.suppliers.findFirst({
        where: eq(suppliers.id, result.supplierId)
      });
      // Should be truncated to max 50 characters
      expect(createdSupplier?.slug?.length).toBeLessThanOrEqual(50);
      expect(createdSupplier?.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});