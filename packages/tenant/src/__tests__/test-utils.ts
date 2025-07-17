import { db } from '../db';
import { tenants, suppliers, supplierDataSources, supplierAttributes, documentExtractions } from '@kibly/shared-db/schemas';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function createTestTenant() {
  const timestamp = Date.now();
  const [tenant] = await db.insert(tenants).values({
    id: randomUUID(),
    name: 'Test Tenant',
    slug: `test-tenant-${timestamp}`,
    email: `test-${timestamp}@example.com`,
    status: 'active',
    settings: {}
  }).returning();
  
  return tenant;
}

export async function cleanupTestData() {
  // Use TRUNCATE for faster cleanup in tests
  // This will also reset any sequences
  await db.execute(sql`TRUNCATE TABLE ${supplierAttributes} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${supplierDataSources} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${documentExtractions} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${suppliers} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${tenants} CASCADE`);
}

export async function createSupplier(data: Partial<typeof suppliers.$inferInsert> = {}) {
  const tenant = await createTestTenant();
  
  const [supplier] = await db.insert(suppliers).values({
    tenantId: tenant.id,
    displayName: data.displayName || 'Test Supplier',
    companyNumber: data.companyNumber || null,
    vatNumber: data.vatNumber || null,
    slug: data.slug || 'test-supplier',
    status: data.status || 'active',
    ...data
  }).returning();
  
  return supplier;
}

export async function createSupplierWithDataSource(
  supplierData: Partial<typeof suppliers.$inferInsert> = {},
  source: 'invoice' | 'manual' = 'invoice'
) {
  const supplier = await createSupplier(supplierData);
  
  await db.insert(supplierDataSources).values({
    supplierId: supplier.id,
    source,
    occurrenceCount: 1
  });
  
  return supplier;
}