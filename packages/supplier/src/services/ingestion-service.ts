import { logger } from '@kibly/utils';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  suppliers,
  supplierDataSources,
  supplierAttributes,
  eq,
  and,
  sql,
} from '@kibly/shared-db';
import {
  SupplierIngestionRequest,
  SupplierStatus,
  AttributeType,
} from '../types';
import { IngestionValidator } from '../ingestion/validator';
import { AttributeNormalizer } from '../ingestion/normalizer';
import { SupplierMatcher } from '../matching/matcher';
import { generateSlug } from '../utils/slug';
import { SupplierError } from '../errors';
import { SupplierValidator } from '../validation/supplier-validator';
import { CONFIDENCE_THRESHOLDS, DEFAULT_CONFIDENCE } from '../constants';

export interface IngestionResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped';
  supplierId?: string;
  error?: string;
}

export class SupplierIngestionService {
  constructor(private db: PostgresJsDatabase<any>) {}

  /**
   * Ingest supplier data from invoice or manual entry
   */
  async ingest(request: SupplierIngestionRequest): Promise<IngestionResult> {
    try {
      // Validate and sanitize
      const validated = IngestionValidator.validate(request);
      
      // Validate data quality
      const validateData: {
        name: string;
        companyNumber?: string | null;
        vatNumber?: string | null;
        country?: string;
        email?: string | null;
        phone?: string | null;
        website?: string | null;
      } = {
        name: validated.data.name,
        companyNumber: validated.data.identifiers.companyNumber ?? null,
        vatNumber: validated.data.identifiers.vatNumber ?? null,
        email: validated.data.contacts.find(c => c.type === 'email')?.value ?? null,
        phone: validated.data.contacts.find(c => c.type === 'phone')?.value ?? null,
        website: validated.data.contacts.find(c => c.type === 'website')?.value ?? null,
      };
      
      const country = validated.data.addresses[0]?.country;
      if (country) {
        validateData.country = country;
      }
      
      const qualityValidation = SupplierValidator.validate(validateData);
      
      if (!qualityValidation.isValid) {
        logger.warn('Supplier data quality validation failed', {
          errors: qualityValidation.errors,
          warnings: qualityValidation.warnings,
          name: validated.data.name,
        });
        return {
          success: false,
          action: 'skipped',
          error: `Data quality issues: ${qualityValidation.errorMessages.join(', ')}`,
        };
      }
      
      // Log warnings but continue
      if (qualityValidation.warnings.length > 0) {
        logger.info('Supplier data quality warnings', {
          warnings: qualityValidation.warnings,
          confidence: qualityValidation.confidence,
        });
      }
      
      // Apply enhanced data if available
      if (qualityValidation.enhancedData) {
        if (qualityValidation.enhancedData.validatedCompanyNumber) {
          validated.data.identifiers.companyNumber = qualityValidation.enhancedData.validatedCompanyNumber;
        }
        if (qualityValidation.enhancedData.validatedVat) {
          validated.data.identifiers.vatNumber = qualityValidation.enhancedData.validatedVat;
        }
      }
      
      // Match against existing suppliers
      const matchResult = await this.matchSupplier(validated);
      
      if (matchResult.matched && matchResult.confidence >= CONFIDENCE_THRESHOLDS.AUTO_ACCEPT) {
        // High confidence match - update existing
        return await this.updateExistingSupplier(validated, matchResult.supplierId!);
      } else if (!matchResult.matched) {
        // No match - create new
        return await this.createNewSupplier(validated);
      } else {
        // Low confidence match - skip for manual review
        logger.info('Low confidence match, skipping', {
          name: validated.data.name,
          confidence: matchResult.confidence,
        });
        return {
          success: true,
          action: 'skipped',
        };
      }
    } catch (error: any) {
      logger.error('Supplier ingestion failed', { error, request });
      
      // Handle database constraint violations
      if (error.code === '23505') { // Unique constraint violation
        if (error.detail?.includes('company_number')) {
          throw new SupplierError(
            'A supplier with this company number already exists',
            'DUPLICATE_COMPANY_NUMBER',
            409
          );
        }
        // VAT number constraint removed - multiple trading names can share VAT
      }
      
      return {
        success: false,
        action: 'skipped',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Match supplier against existing records
   */
  private async matchSupplier(request: SupplierIngestionRequest) {
    const { data, tenantId } = request;
    
    // Get all suppliers for tenant
    const existingSuppliers = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId));
    
    return SupplierMatcher.match(
      data.identifiers,
      data.name,
      existingSuppliers.map((s: any) => ({
        id: s.id,
        companyNumber: s.companyNumber,
        vatNumber: s.vatNumber,
        legalName: s.legalName,
        displayName: s.displayName,
        slug: s.slug,
        status: s.status,
        tenantId: s.tenantId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        deletedAt: s.deletedAt,
      }))
    );
  }
  
  /**
   * Create new supplier
   */
  private async createNewSupplier(request: SupplierIngestionRequest): Promise<IngestionResult> {
    const { data, source, sourceId, tenantId } = request;
    
    // Retry logic for slug generation race conditions
    let retries = 3;
    let lastError: any;
    
    while (retries > 0) {
      try {
        return await this.db.transaction(async (tx) => {
          // Create supplier
          const [supplier] = await tx
            .insert(suppliers)
            .values({
              companyNumber: data.identifiers.companyNumber,
              vatNumber: data.identifiers.vatNumber,
              legalName: data.name,
              displayName: data.name,
              slug: await generateSlug(data.name, tenantId, tx as any),
              status: SupplierStatus.ACTIVE,
              tenantId,
            })
            .returning();
          
          if (!supplier) {
            throw new Error('Failed to create supplier')
          }
          
          // Track data source
          await tx.insert(supplierDataSources).values({
            supplierId: supplier.id,
            sourceType: source,
            sourceId,
          });
          
          // Add attributes
          await this.addAttributes(tx, supplier.id, request);
          
          logger.info('Created new supplier', {
            supplierId: supplier.id,
            name: supplier.displayName,
            source,
          });
          
          return {
            success: true,
            action: 'created',
            supplierId: supplier.id,
          };
        });
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a unique constraint violation on slug
        if (error.code === '23505' && error.detail?.includes('slug')) {
          retries--;
          logger.warn('Slug collision detected, retrying', {
            name: data.name,
            tenantId,
            retriesLeft: retries,
          });
          
          // Add a small delay to reduce contention
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
          continue;
        }
        
        // If it's a different error, throw immediately
        throw error;
      }
    }
    
    // If we exhausted retries, throw the last error
    throw lastError;
  }
  
  /**
   * Update existing supplier
   */
  private async updateExistingSupplier(
    request: SupplierIngestionRequest,
    supplierId: string
  ): Promise<IngestionResult> {
    const { source, sourceId } = request;
    
    return await this.db.transaction(async (tx) => {
      // Update source tracking
      await tx
        .insert(supplierDataSources)
        .values({
          supplierId,
          sourceType: source,
          sourceId,
        })
        .onConflictDoUpdate({
          target: [supplierDataSources.supplierId, supplierDataSources.sourceType, supplierDataSources.sourceId],
          set: {
            lastSeenAt: sql`NOW()`,
            occurrenceCount: sql`${supplierDataSources.occurrenceCount} + 1`,
          },
        });
      
      // Update attributes
      await this.updateAttributes(tx, supplierId, request);
      
      logger.info('Updated existing supplier', {
        supplierId,
        source,
      });
      
      return {
        success: true,
        action: 'updated',
        supplierId,
      };
    });
  }
  
  /**
   * Add attributes for a new supplier
   */
  private async addAttributes(
    tx: any,
    supplierId: string,
    request: SupplierIngestionRequest
  ): Promise<void> {
    const { data, source, sourceId, userId } = request;
    const attributes = [];
    
    // Add addresses
    for (const address of data.addresses) {
      attributes.push({
        supplierId,
        attributeType: AttributeType.ADDRESS,
        value: address,
        hash: AttributeNormalizer.hash(address),
        sourceType: source,
        sourceId,
        confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
        createdBy: userId,
      });
    }
    
    // Add contacts
    for (const contact of data.contacts) {
      const type = contact.type === 'phone' ? AttributeType.PHONE :
                   contact.type === 'email' ? AttributeType.EMAIL :
                   AttributeType.WEBSITE;
                   
      attributes.push({
        supplierId,
        attributeType: type,
        value: { value: contact.value },
        hash: AttributeNormalizer.hash(contact),
        sourceType: source,
        sourceId,
        confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
        isPrimary: contact.isPrimary,
        createdBy: userId,
      });
    }
    
    // Add bank accounts
    for (const bankAccount of data.bankAccounts) {
      attributes.push({
        supplierId,
        attributeType: AttributeType.BANK_ACCOUNT,
        value: bankAccount,
        hash: AttributeNormalizer.hash(bankAccount),
        sourceType: source,
        sourceId,
        confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
        createdBy: userId,
      });
    }
    
    if (attributes.length > 0) {
      await tx.insert(supplierAttributes).values(attributes);
    }
  }
  
  /**
   * Update attributes for existing supplier
   */
  private async updateAttributes(
    tx: any,
    supplierId: string,
    request: SupplierIngestionRequest
  ): Promise<void> {
    const { data, source, sourceId, userId } = request;
    
    // Get existing attribute hashes
    const existing = await tx
      .select({ hash: supplierAttributes.hash })
      .from(supplierAttributes)
      .where(eq(supplierAttributes.supplierId, supplierId));
    
    const existingHashes = new Set(existing.map((a: any) => a.hash));
    
    // Process each attribute type
    const newAttributes = [];
    
    // Check addresses
    for (const address of data.addresses) {
      const hash = AttributeNormalizer.hash(address);
      if (!existingHashes.has(hash)) {
        newAttributes.push({
          supplierId,
          attributeType: AttributeType.ADDRESS,
          value: address,
          hash,
          sourceType: source,
          sourceId,
          confidence: DEFAULT_CONFIDENCE.DOCUMENT_EXTRACTED,
          createdBy: userId,
        });
      } else {
        // Update seen count and confidence
        await tx
          .update(supplierAttributes)
          .set({
            lastSeenAt: sql`NOW()`,
            seenCount: sql`${supplierAttributes.seenCount} + 1`,
            confidence: sql`LEAST(${DEFAULT_CONFIDENCE.MAX_CONFIDENCE}, ${supplierAttributes.confidence} + ${DEFAULT_CONFIDENCE.REPEAT_OBSERVATION_INCREMENT})`,
          })
          .where(
            and(
              eq(supplierAttributes.supplierId, supplierId),
              eq(supplierAttributes.hash, hash)
            )
          );
      }
    }
    
    // Add new attributes if any
    if (newAttributes.length > 0) {
      await tx.insert(supplierAttributes).values(newAttributes);
    }
  }
}