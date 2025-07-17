import { logger } from '@kibly/utils';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  suppliers,
  supplierAttributes,
  eq,
  and,
} from '@kibly/shared-db';
import { generateSlug } from '../utils/slug';
import { SupplierError, SupplierErrors } from '../errors';
import { SupplierStatus } from '../types';

export interface CreateSupplierInput {
  companyNumber?: string | null;
  vatNumber?: string | null;
  legalName: string;
  displayName: string;
  tenantId: string;
}

export interface UpdateSupplierInput {
  legalName?: string;
  displayName?: string;
  status?: SupplierStatus;
}

export class SupplierService {
  constructor(private db: PostgresJsDatabase<any>) {}

  /**
   * Create a new supplier manually
   */
  async create(input: CreateSupplierInput) {
    const { companyNumber, vatNumber, legalName, displayName, tenantId } = input;

    // Validate at least one identifier
    if (!companyNumber && !vatNumber) {
      throw SupplierErrors.MISSING_IDENTIFIER;
    }

    try {
      const [supplier] = await this.db
        .insert(suppliers)
        .values({
          companyNumber,
          vatNumber,
          legalName,
          displayName,
          slug: await generateSlug(displayName, tenantId, this.db),
          status: SupplierStatus.ACTIVE,
          tenantId,
        })
        .returning();

      if (!supplier) {
        throw new Error('Failed to create supplier')
      }

      logger.info('Created supplier manually', {
        supplierId: supplier.id,
        name: supplier.displayName,
        tenantId,
      });

      return supplier;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.detail?.includes('company_number')) {
          throw SupplierErrors.DUPLICATE_COMPANY_NUMBER;
        }
        if (error.detail?.includes('vat_number')) {
          throw SupplierErrors.DUPLICATE_VAT_NUMBER;
        }
      }
      throw error;
    }
  }

  /**
   * Update supplier details
   */
  async update(supplierId: string, tenantId: string, input: UpdateSupplierInput) {
    // Verify supplier exists and belongs to tenant
    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.tenantId, tenantId)
        )
      );

    if (!existing) {
      throw SupplierErrors.SUPPLIER_NOT_FOUND;
    }

    const [updated] = await this.db
      .update(suppliers)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, supplierId))
      .returning();

    if (!updated) {
      throw new Error('Supplier not found or failed to update')
    }

    logger.info('Updated supplier', {
      supplierId: updated.id,
      changes: Object.keys(input),
    });

    return updated;
  }

  /**
   * Soft delete a supplier
   */
  async delete(supplierId: string, tenantId: string) {
    // Verify supplier exists and belongs to tenant
    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.tenantId, tenantId)
        )
      );

    if (!existing) {
      throw SupplierErrors.SUPPLIER_NOT_FOUND;
    }

    await this.db
      .update(suppliers)
      .set({
        status: SupplierStatus.DELETED,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, supplierId));

    logger.info('Soft deleted supplier', {
      supplierId,
      tenantId,
    });
  }

  /**
   * Set an attribute as primary
   */
  async setPrimaryAttribute(
    supplierId: string,
    tenantId: string,
    attributeId: string
  ) {
    // Verify supplier exists and belongs to tenant
    const [supplier] = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.tenantId, tenantId)
        )
      );

    if (!supplier) {
      throw SupplierErrors.SUPPLIER_NOT_FOUND;
    }

    // Get the attribute to be set as primary
    const [attribute] = await this.db
      .select()
      .from(supplierAttributes)
      .where(
        and(
          eq(supplierAttributes.id, attributeId),
          eq(supplierAttributes.supplierId, supplierId)
        )
      );

    if (!attribute) {
      throw new SupplierError('Attribute not found', 'ATTRIBUTE_NOT_FOUND', 404);
    }

    await this.db.transaction(async (tx) => {
      // Remove primary flag from other attributes of same type
      await tx
        .update(supplierAttributes)
        .set({ isPrimary: false })
        .where(
          and(
            eq(supplierAttributes.supplierId, supplierId),
            eq(supplierAttributes.attributeType, attribute.attributeType)
          )
        );

      // Set this attribute as primary
      await tx
        .update(supplierAttributes)
        .set({ isPrimary: true })
        .where(eq(supplierAttributes.id, attributeId));
    });

    logger.info('Set primary attribute', {
      supplierId,
      attributeId,
      attributeType: attribute.attributeType,
    });
  }
}