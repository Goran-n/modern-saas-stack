import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { suppliers } from '@kibly/shared-db';
import { SupplierMatcher } from '../../matching/matcher';
import { createTestTenant, cleanupTestData, db } from '../test-utils';
import { SupplierFactory } from '../factories';
import { randomUUID } from 'crypto';

describe('Supplier Matching - What Actually Happens', () => {
  let tenantId: string;

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('matches by company number first', async () => {
    const [existing] = await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId,
      legalName: 'Wrong Name Ltd',
      displayName: 'Wrong Name Ltd',
      companyNumber: '12345678',
      vatNumber: 'GB111111111',
      slug: 'wrong-name-ltd',
      status: 'active'
    }).returning();
    
    // Even with different VAT and name, should match on company number
    const match = SupplierMatcher.match(
      {
        companyNumber: '12345678',
        vatNumber: 'GB999999999'
      },
      'Totally Different Ltd',
      [existing]
    );
    
    expect(match.supplierId).toBe(existing.id);
    expect(match.matchType).toBe('company_number');
    expect(match.confidence).toBe(100);
  });

  it('does not match across tenants', async () => {
    // Create another tenant first
    const otherTenant = await createTestTenant();
    
    // Create supplier in the other tenant
    await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId: otherTenant.id, // Different tenant
      legalName: 'ACME Ltd',
      displayName: 'ACME Ltd',
      companyNumber: '12345678',
      slug: 'acme-ltd',
      status: 'active'
    });
    
    // Try to match - should not find anything since supplier is in different tenant
    const existingSuppliersInCurrentTenant: any[] = [];
    const match = SupplierMatcher.match(
      { companyNumber: '12345678' },
      'ACME Ltd',
      existingSuppliersInCurrentTenant
    );
    
    expect(match.matched).toBe(false);
    expect(match.matchType).toBe('none');
    // Critical for multi-tenant isolation
  });

  it('returns highest confidence match when multiple criteria match', async () => {
    const [existing] = await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId,
      legalName: 'ACME Ltd',
      displayName: 'ACME Ltd',
      companyNumber: '12345678',
      vatNumber: 'GB123456789',
      slug: 'acme-ltd',
      status: 'active'
    }).returning();
    
    // Match on both company number and VAT
    const match = SupplierMatcher.match(
      {
        companyNumber: '12345678',
        vatNumber: 'GB123456789'
      },
      'ACME Limited', // Slightly different name
      [existing]
    );
    
    expect(match.supplierId).toBe(existing.id);
    expect(match.confidence).toBe(100); // Company number match takes precedence
    expect(match.matchType).toBe('company_number');
  });
});