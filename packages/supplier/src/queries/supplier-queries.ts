import {
  and,
  eq,
  globalSuppliers,
  sql,
  supplierAttributes,
  suppliers,
} from "@figgy/shared-db";
import { getDb } from "../db";
import { SupplierErrors } from "../errors";

export class SupplierQueries {
  private get db() {
    return getDb();
  }

  /**
   * Get supplier by ID with tenant validation
   */
  async getById(supplierId: string, tenantId: string) {
    const [result] = await this.db
      .select({
        // Supplier fields
        id: suppliers.id,
        companyNumber: suppliers.companyNumber,
        vatNumber: suppliers.vatNumber,
        legalName: suppliers.legalName,
        displayName: suppliers.displayName,
        slug: suppliers.slug,
        status: suppliers.status,
        tenantId: suppliers.tenantId,
        globalSupplierId: suppliers.globalSupplierId,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
        deletedAt: suppliers.deletedAt,
        // Global supplier logo
        logoUrl: globalSuppliers.logoUrl,
      })
      .from(suppliers)
      .leftJoin(
        globalSuppliers,
        eq(suppliers.globalSupplierId, globalSuppliers.id),
      )
      .where(
        and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)),
      );

    if (!result) {
      throw SupplierErrors.SUPPLIER_NOT_FOUND;
    }

    return result;
  }

  /**
   * Get supplier with all attributes
   */
  async getWithAttributes(supplierId: string, tenantId: string) {
    // First verify supplier exists and belongs to tenant (includes logo)
    const supplier = await this.getById(supplierId, tenantId);

    // Get all active attributes
    const attributes = await this.db
      .select()
      .from(supplierAttributes)
      .where(
        and(
          eq(supplierAttributes.supplierId, supplierId),
          eq(supplierAttributes.isActive, true),
        ),
      );

    // Group attributes by type
    const groupedAttributes = {
      addresses: attributes.filter((a) => a.attributeType === "address"),
      phones: attributes.filter((a) => a.attributeType === "phone"),
      emails: attributes.filter((a) => a.attributeType === "email"),
      websites: attributes.filter((a) => a.attributeType === "website"),
      bankAccounts: attributes.filter(
        (a) => a.attributeType === "bank_account",
      ),
    };

    return {
      ...supplier,
      attributes: groupedAttributes,
    };
  }

  /**
   * List suppliers for tenant with pagination
   */
  async list(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
    } = {},
  ) {
    const { limit = 50, offset = 0, includeDeleted = false } = options;

    const whereConditions = [eq(suppliers.tenantId, tenantId)];

    if (!includeDeleted) {
      whereConditions.push(eq(suppliers.status, "active"));
    }

    try {
      const results = await this.db
        .select({
          // Supplier fields
          id: suppliers.id,
          companyNumber: suppliers.companyNumber,
          vatNumber: suppliers.vatNumber,
          legalName: suppliers.legalName,
          displayName: suppliers.displayName,
          slug: suppliers.slug,
          status: suppliers.status,
          tenantId: suppliers.tenantId,
          globalSupplierId: suppliers.globalSupplierId,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
          deletedAt: suppliers.deletedAt,
          // Global supplier fields
          logoUrl: globalSuppliers.logoUrl,
          globalSupplierLogoFetchStatus: globalSuppliers.logoFetchStatus,
          globalSupplierPrimaryDomain: globalSuppliers.primaryDomain,
        })
        .from(suppliers)
        .leftJoin(
          globalSuppliers,
          eq(suppliers.globalSupplierId, globalSuppliers.id),
        )
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset);

      return results;
    } catch (error: any) {
      // Log the actual PostgreSQL error
      console.error("Database error in suppliers.list:", {
        message: error.message,
        cause: error.cause,
        code: error.cause?.code,
        detail: error.cause?.detail,
        hint: error.cause?.hint,
        routine: error.cause?.routine,
      });
      throw error;
    }
  }

  /**
   * Search suppliers by name
   */
  async searchByName(tenantId: string, searchTerm: string) {
    const results = await this.db
      .select({
        // Supplier fields
        id: suppliers.id,
        companyNumber: suppliers.companyNumber,
        vatNumber: suppliers.vatNumber,
        legalName: suppliers.legalName,
        displayName: suppliers.displayName,
        slug: suppliers.slug,
        status: suppliers.status,
        tenantId: suppliers.tenantId,
        globalSupplierId: suppliers.globalSupplierId,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
        deletedAt: suppliers.deletedAt,
        // Global supplier logo
        logoUrl: globalSuppliers.logoUrl,
      })
      .from(suppliers)
      .leftJoin(
        globalSuppliers,
        eq(suppliers.globalSupplierId, globalSuppliers.id),
      )
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          sql`(
            ${suppliers.displayName} ILIKE ${`%${searchTerm}%`} OR
            ${suppliers.legalName} ILIKE ${`%${searchTerm}%`}
          )`,
        ),
      )
      .limit(20);

    return results;
  }

  /**
   * Get supplier by company number
   */
  async getByCompanyNumber(companyNumber: string, tenantId: string) {
    const [supplier] = await this.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.companyNumber, companyNumber),
          eq(suppliers.tenantId, tenantId),
        ),
      );

    return supplier;
  }

  /**
   * Get supplier by VAT number
   */
  async getByVatNumber(vatNumber: string, tenantId: string) {
    const [supplier] = await this.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.vatNumber, vatNumber),
          eq(suppliers.tenantId, tenantId),
        ),
      );

    return supplier;
  }
}
