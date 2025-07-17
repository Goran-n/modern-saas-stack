import { createDrizzleClient, tenants, suppliers, supplierDataSources, supplierAttributes, documentExtractions, sql } from '@kibly/shared-db';
import { getConfig } from '@kibly/config';
import { randomUUID } from 'crypto';

// Get database instance for tests
const getDb = () => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL environment variable is required for tests');
  }
  return createDrizzleClient(databaseUrl);
};

// Export db as getter so it always uses current env
export const db = getDb();

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