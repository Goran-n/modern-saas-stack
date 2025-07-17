import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { suppliers, supplierDataSources, eq, and } from '@kibly/shared-db';
import { SupplierIngestionService } from '../../services/ingestion-service';
import { createTestTenant, cleanupTestData, db } from '../test-utils';
import { SupplierFactory } from '../factories';
import { randomUUID } from 'crypto';

describe('Supplier Ingestion - The Real Tests', () => {
  let ingestionService: SupplierIngestionService;
  let tenantId: string;

  beforeEach(async () => {
    ingestionService = new SupplierIngestionService(db);
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    SupplierFactory.reset(); // Reset factory counter
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('creates new supplier when no match exists', async () => {
    const request = SupplierFactory.createIngestionRequest({
      tenantId,
      data: {
        name: 'ACME Ltd',
        identifiers: {
          vatNumber: 'GB123456789',
          companyNumber: '12345678'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });

    const result = await ingestionService.ingest(request);
    
    expect(result.action).toBe('created');
    expect(result.supplierId).toBeDefined();
    
    // Verify it's actually in the database
    const dbSupplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, result.supplierId!)
    });
    expect(dbSupplier).toBeTruthy();
    expect(dbSupplier?.displayName).toBe('ACME Ltd');
    expect(dbSupplier?.vatNumber).toBe('GB123456789');
    expect(dbSupplier?.companyNumber).toBe('12345678');
  });

  it('updates existing supplier when match found', async () => {
    // Create existing supplier using factory
    const existing = SupplierFactory.createSupplier({
      tenantId,
      legalName: 'Old Name Ltd',
      displayName: 'Old Name',
      companyNumber: '12345678',
      vatNumber: null,
      slug: 'old-name'
    });

    const [dbExisting] = await db.insert(suppliers).values(existing).returning();

    await db.insert(supplierDataSources).values({
      supplierId: dbExisting.id,
      sourceType: 'invoice',
      sourceId: 'existing-source',
      occurrenceCount: 1
    });
    
    // Create request with same company number
    const request = SupplierFactory.createIngestionRequest({
      tenantId,
      sourceId: 'test-invoice-2',
      data: {
        name: 'New Name',
        identifiers: {
          companyNumber: '12345678'
        },
        addresses: [],
        contacts: [{
          type: 'email',
          value: 'new@email.com',
          isPrimary: true
        }],
        bankAccounts: []
      }
    });

    const result = await ingestionService.ingest(request);
    
    expect(result.action).toBe('updated');
    expect(result.supplierId).toBe(dbExisting.id);
    
    // Verify data source was updated
    const dataSource = await db.query.supplierDataSources.findFirst({
      where: and(
        eq(supplierDataSources.supplierId, dbExisting.id),
        eq(supplierDataSources.sourceType, 'invoice'),
        eq(supplierDataSources.sourceId, 'test-invoice-2')
      )
    });
    expect(dataSource).toBeTruthy();
    expect(dataSource?.occurrenceCount).toBe(1);
    
    // The original data source should still exist
    const originalDataSource = await db.query.supplierDataSources.findFirst({
      where: and(
        eq(supplierDataSources.supplierId, dbExisting.id),
        eq(supplierDataSources.sourceType, 'invoice'),
        eq(supplierDataSources.sourceId, 'existing-source')
      )
    });
    expect(originalDataSource).toBeTruthy();
    expect(originalDataSource?.occurrenceCount).toBe(1);
  });

  it('handles partial data without breaking', async () => {
    // Use factory to create minimal request
    const request = SupplierFactory.createMinimalIngestionRequest(
      tenantId,
      'Minimal Supplier'
    );

    const result = await ingestionService.ingest(request);
    
    expect(result.supplierId).toBeDefined();
    expect(result.action).toBe('created');
    
    // Verify minimal data was stored correctly
    const dbSupplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, result.supplierId!)
    });
    expect(dbSupplier?.displayName).toBe('Minimal Supplier');
    expect(dbSupplier?.vatNumber).toBe(request.data.identifiers.vatNumber); // Use the actual VAT from request
    expect(dbSupplier?.companyNumber).toBeNull();
  });

  it('increments occurrence count when same source is seen again', async () => {
    // Create a supplier
    const firstRequest = SupplierFactory.createIngestionRequest({
      tenantId,
      sourceId: 'recurring-invoice-123',
      data: {
        name: 'Repeat Supplier Ltd',
        identifiers: {
          companyNumber: '99999999'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });

    const firstResult = await ingestionService.ingest(firstRequest);
    expect(firstResult.action).toBe('created');
    
    // Check initial occurrence count
    const initialDataSource = await db.query.supplierDataSources.findFirst({
      where: and(
        eq(supplierDataSources.supplierId, firstResult.supplierId!),
        eq(supplierDataSources.sourceType, 'invoice'),
        eq(supplierDataSources.sourceId, 'recurring-invoice-123')
      )
    });
    expect(initialDataSource?.occurrenceCount).toBe(1);
    
    // Process the same invoice again (simulating a recurring invoice)
    const secondRequest = SupplierFactory.createIngestionRequest({
      tenantId,
      sourceId: 'recurring-invoice-123',
      data: {
        name: 'Repeat Supplier Ltd',
        identifiers: {
          companyNumber: '99999999'
        },
        addresses: [],
        contacts: [],
        bankAccounts: []
      }
    });
    
    const secondResult = await ingestionService.ingest(secondRequest);
    expect(secondResult.action).toBe('updated');
    expect(secondResult.supplierId).toBe(firstResult.supplierId);
    
    // Check that occurrence count was incremented
    const updatedDataSource = await db.query.supplierDataSources.findFirst({
      where: and(
        eq(supplierDataSources.supplierId, firstResult.supplierId!),
        eq(supplierDataSources.sourceType, 'invoice'),
        eq(supplierDataSources.sourceId, 'recurring-invoice-123')
      )
    });
    expect(updatedDataSource?.occurrenceCount).toBe(2);
  });
});