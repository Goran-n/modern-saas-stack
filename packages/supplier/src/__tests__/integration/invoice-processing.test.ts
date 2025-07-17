import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  suppliers, 
  documentExtractions, 
  eq,
  type CompanyProfile 
} from '@kibly/shared-db';
import { SupplierIngestionService, transformInvoiceToSupplier, extractVendorData } from '../../index';
import { createTestTenant, cleanupTestData, db } from '../test-utils';
import { randomUUID } from 'crypto';

// These tests test the core business logic that the Trigger.dev task uses
// They simulate what processInvoiceSupplier does without needing Trigger.dev
describe('Invoice to Supplier Processing Logic', () => {
  let tenantId: string;

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('processes valid extraction and creates supplier', async () => {
    // Create extraction with supplier data
    const extractionId = randomUUID();
    const [extraction] = await db.insert(documentExtractions).values({
      id: extractionId,
      fileId: randomUUID(),
      tenantId,
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      extractedFields: {
        vendorName: 'ACME Ltd',
        vendorTaxId: 'GB123456789',
        vendorAddress: '123 Main St',
        vendorCity: 'London',
        vendorPostalCode: 'SW1A 1AA',
        vendorCountry: 'GB',
        vendorCompanyNumber: '12345678'
      },
      extractionMethod: 'primary',
      overallConfidence: 0.9
    }).returning();
    
    // Extract vendor data from the extraction
    const vendorData = extractVendorData(extraction.extractedFields);
    
    // Transform to supplier format
    const supplierRequest = transformInvoiceToSupplier({
      id: extraction.id,
      vendorName: vendorData.name,
      vendorTaxId: vendorData.taxId,
      vendorAddress: vendorData.address,
      vendorCity: vendorData.city,
      vendorPostalCode: vendorData.postalCode,
      vendorCountry: vendorData.country,
      vendorEmail: vendorData.email,
      vendorPhone: vendorData.phone,
      vendorWebsite: vendorData.website,
      companyProfile: extraction.companyProfile as CompanyProfile | null,
    }, tenantId);
    
    expect(supplierRequest).toBeTruthy();
    
    // Process through ingestion service
    const ingestionService = new SupplierIngestionService(db);
    const result = await ingestionService.ingest(supplierRequest!);
    
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.supplierId).toBeDefined();
    
    // Verify supplier created
    const suppliersInDb = await db.query.suppliers.findMany({
      where: eq(suppliers.tenantId, tenantId)
    });
    expect(suppliersInDb).toHaveLength(1);
    expect(suppliersInDb[0].displayName).toBe('ACME Ltd');
    expect(suppliersInDb[0].vatNumber).toBe('GB123456789');
  });

  it('handles extraction with insufficient data', async () => {
    const [extraction] = await db.insert(documentExtractions).values({
      id: randomUUID(),
      fileId: randomUUID(),
      tenantId,
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      extractedFields: {
        vendorName: 'No Identifiers Ltd',
        // No VAT, no company number
        vendorAddress: '123 Main St'
      },
      extractionMethod: 'primary',
      overallConfidence: 0.9
    }).returning();
    
    // Extract vendor data from the extraction
    const vendorData = extractVendorData(extraction.extractedFields);
    
    // Transform to supplier format - should return null due to missing identifiers
    const supplierRequest = transformInvoiceToSupplier({
      id: extraction.id,
      vendorName: vendorData.name,
      vendorTaxId: vendorData.taxId,
      vendorAddress: vendorData.address,
      vendorCity: vendorData.city,
      vendorPostalCode: vendorData.postalCode,
      vendorCountry: vendorData.country,
      vendorEmail: vendorData.email,
      vendorPhone: vendorData.phone,
      vendorWebsite: vendorData.website,
      companyProfile: extraction.companyProfile as CompanyProfile | null,
    }, tenantId);
    
    // Should return null when no identifiers
    expect(supplierRequest).toBeNull();
    
    // Should not create supplier
    const suppliersInDb = await db.query.suppliers.findMany({
      where: eq(suppliers.tenantId, tenantId)
    });
    expect(suppliersInDb).toHaveLength(0);
  });

  it('links to existing supplier on match', async () => {
    // Create existing supplier
    const [existing] = await db.insert(suppliers).values({
      id: randomUUID(),
      tenantId,
      legalName: 'ACME Limited',
      displayName: 'ACME Limited',
      vatNumber: 'GB123456789',
      slug: 'acme-limited',
      status: 'active'
    }).returning();

    // Create extraction with same VAT
    const [extraction] = await db.insert(documentExtractions).values({
      id: randomUUID(),
      fileId: randomUUID(),
      tenantId,
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      extractedFields: {
        vendorName: 'ACME Ltd', // Different name
        vendorTaxId: 'GB123456789',
        vendorEmail: 'new@acme.com'
      },
      extractionMethod: 'primary',
      overallConfidence: 0.9
    }).returning();
    
    // Extract vendor data
    const vendorData = extractVendorData(extraction.extractedFields);
    
    // Transform to supplier format
    const supplierRequest = transformInvoiceToSupplier({
      id: extraction.id,
      vendorName: vendorData.name,
      vendorTaxId: vendorData.taxId,
      vendorAddress: vendorData.address,
      vendorCity: vendorData.city,
      vendorPostalCode: vendorData.postalCode,
      vendorCountry: vendorData.country,
      vendorEmail: vendorData.email,
      vendorPhone: vendorData.phone,
      vendorWebsite: vendorData.website,
      companyProfile: extraction.companyProfile as CompanyProfile | null,
    }, tenantId);
    
    // Process through ingestion service
    const ingestionService = new SupplierIngestionService(db);
    const result = await ingestionService.ingest(supplierRequest!);
    
    expect(result.success).toBe(true);
    expect(result.action).toBe('updated');
    expect(result.supplierId).toBe(existing.id);
    
    // Should not create duplicate
    const suppliersInDb = await db.query.suppliers.findMany({
      where: eq(suppliers.tenantId, tenantId)
    });
    expect(suppliersInDb).toHaveLength(1);
    expect(suppliersInDb[0].id).toBe(existing.id);
  });

  it('validates VAT number format', async () => {
    const [extraction] = await db.insert(documentExtractions).values({
      id: randomUUID(),
      fileId: randomUUID(),
      tenantId,
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      extractedFields: {
        vendorName: 'ACME Ltd',
        vendorTaxId: 'INVALID_VAT' // This should cause validation to fail
      },
      extractionMethod: 'primary',
      overallConfidence: 0.9
    }).returning();
    
    // Extract vendor data
    const vendorData = extractVendorData(extraction.extractedFields);
    
    // Transform to supplier format
    const supplierRequest = transformInvoiceToSupplier({
      id: extraction.id,
      vendorName: vendorData.name,
      vendorTaxId: vendorData.taxId,
      vendorAddress: vendorData.address,
      vendorCity: vendorData.city,
      vendorPostalCode: vendorData.postalCode,
      vendorCountry: vendorData.country,
      vendorEmail: vendorData.email,
      vendorPhone: vendorData.phone,
      vendorWebsite: vendorData.website,
      companyProfile: extraction.companyProfile as CompanyProfile | null,
    }, tenantId);
    
    expect(supplierRequest).toBeTruthy(); // Still creates request
    
    // Process through ingestion service - validation should fail
    const ingestionService = new SupplierIngestionService(db);
    const result = await ingestionService.ingest(supplierRequest!);
    
    expect(result.success).toBe(false);
    expect(result.action).toBe('skipped');
    expect(result.error).toContain('VAT');
    
    // No supplier should be created
    const suppliersInDb = await db.query.suppliers.findMany({
      where: eq(suppliers.tenantId, tenantId)
    });
    expect(suppliersInDb).toHaveLength(0);
  });

  it('handles missing vendor name gracefully', async () => {
    const [extraction] = await db.insert(documentExtractions).values({
      id: randomUUID(),
      fileId: randomUUID(),
      tenantId,
      documentType: 'invoice',
      documentTypeConfidence: 0.95,
      extractedFields: {
        // No vendor name
        vendorTaxId: 'GB123456789'
      },
      extractionMethod: 'primary',
      overallConfidence: 0.9
    }).returning();
    
    // Extract vendor data
    const vendorData = extractVendorData(extraction.extractedFields);
    
    // Transform should return null when no vendor name
    const supplierRequest = transformInvoiceToSupplier({
      id: extraction.id,
      vendorName: vendorData.name,
      vendorTaxId: vendorData.taxId,
      vendorAddress: vendorData.address,
      vendorCity: vendorData.city,
      vendorPostalCode: vendorData.postalCode,
      vendorCountry: vendorData.country,
      vendorEmail: vendorData.email,
      vendorPhone: vendorData.phone,
      vendorWebsite: vendorData.website,
      companyProfile: extraction.companyProfile as CompanyProfile | null,
    }, tenantId);
    
    expect(supplierRequest).toBeNull();
  });
});