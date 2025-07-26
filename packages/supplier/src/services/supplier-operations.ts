import { globalSuppliers, supplierAttributes, eq } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import { inArray } from "drizzle-orm";
import { getDb } from "../db";
import { SupplierQueries } from "../queries/supplier-queries";
import { AttributeType } from "../types";
import { GlobalSupplierService } from "./global-supplier-service";

export class SupplierOperations {
  private queries: SupplierQueries;

  constructor() {
    this.queries = new SupplierQueries();
  }

  /**
   * List suppliers for tenant and trigger logo fetching for those that need it
   */
  async listWithLogoFetch(tenantId: string, options: {
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
  } = {}) {
    // Get suppliers
    const suppliers = await this.queries.list(tenantId, options);
    
    // First, create global suppliers for any that don't have them
    const suppliersWithoutGlobal = suppliers.filter(s => !s.globalSupplierId);
    
    if (suppliersWithoutGlobal.length > 0) {
      logger.info("Found suppliers without global suppliers, creating them", {
        count: suppliersWithoutGlobal.length,
        suppliers: suppliersWithoutGlobal.map(s => s.displayName),
      });
      
      // Create global suppliers for these
      for (const supplier of suppliersWithoutGlobal) {
        try {
          await this.createGlobalSupplierForExisting(supplier);
        } catch (error) {
          logger.error("Failed to create global supplier", {
            supplierId: supplier.id,
            error,
          });
        }
      }
      
      // Re-fetch suppliers to get updated global supplier data
      const updatedSuppliers = await this.queries.list(tenantId, options);
      suppliers.splice(0, suppliers.length, ...updatedSuppliers);
    }
    
    // Check if any suppliers need logo fetching and trigger job
    logger.debug("Checking suppliers for logo fetching", {
      totalSuppliers: suppliers.length,
      tenantId,
    });
    
    const suppliersNeedingLogos = suppliers.filter(
      s => s.globalSupplierId && 
      s.globalSupplierLogoFetchStatus === 'pending' && 
      s.globalSupplierPrimaryDomain
    );
    
    logger.info("Found suppliers needing logos", {
      count: suppliersNeedingLogos.length,
      suppliers: suppliersNeedingLogos.map(s => ({
        id: s.id,
        globalSupplierId: s.globalSupplierId,
        status: s.globalSupplierLogoFetchStatus,
        domain: s.globalSupplierPrimaryDomain,
      })),
    });
    
    if (suppliersNeedingLogos.length > 0) {
      // Trigger logo fetch for up to 10 suppliers at once
      const globalSupplierIds = suppliersNeedingLogos
        .slice(0, 10)
        .map(s => s.globalSupplierId!)
        .filter(Boolean);
      
      logger.info("Attempting to trigger logo fetch", {
        globalSupplierIds,
        tasksAvailable: typeof tasks !== 'undefined',
        triggerMethodExists: typeof tasks?.trigger === 'function',
      });
      
      if (globalSupplierIds.length > 0) {
        try {
          const result = await tasks.trigger("fetch-logo", {
            globalSupplierIds,
          });
          logger.info("Successfully triggered logo fetch", {
            count: globalSupplierIds.length,
            supplierIds: globalSupplierIds,
            tenantId,
            jobId: result?.id,
          });
        } catch (error) {
          logger.error("Failed to trigger logo fetch", {
            globalSupplierIds,
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            } : error,
            errorType: typeof error,
          });
          // Don't fail the request if job triggering fails
        }
      }
    }
    
    return suppliers;
  }

  /**
   * Create global supplier for an existing supplier
   */
  private async createGlobalSupplierForExisting(supplier: any) {
    const db = getDb();
    const globalSupplierService = new GlobalSupplierService();
    
    // Get supplier attributes for the GlobalSupplierService
    const attributes = await db
      .select()
      .from(supplierAttributes)
      .where(eq(supplierAttributes.supplierId, supplier.id));

    // Transform attributes for GlobalSupplierService
    const emails = attributes
      .filter(a => a.attributeType === AttributeType.EMAIL)
      .map(a => ({ value: a.value }));
    
    const websites = attributes
      .filter(a => a.attributeType === AttributeType.WEBSITE)
      .map(a => ({ value: a.value }));

    // Use GlobalSupplierService to find or create global supplier
    const globalSupplierId = await globalSupplierService.findOrCreateGlobalSupplier(
      supplier,
      {
        emails,
        websites,
      }
    );

    if (globalSupplierId) {
      // Link the supplier to the global supplier
      await globalSupplierService.linkToGlobalSupplier(supplier.id, globalSupplierId);
      
      logger.info("Global supplier linked for existing supplier", {
        supplierId: supplier.id,
        supplierName: supplier.displayName,
        globalSupplierId,
      });

      // Trigger logo fetch for the global supplier
      await this.triggerLogoFetchForGlobalSupplier(globalSupplierId);
    } else {
      logger.warn("Failed to create or find global supplier", {
        supplierId: supplier.id,
        supplierName: supplier.displayName,
      });
    }
  }

  /**
   * Trigger logo fetch for a newly created global supplier
   */
  async triggerLogoFetchForGlobalSupplier(globalSupplierId: string) {
    try {
      // Get the global supplier to check if it has a domain
      const db = getDb();
      const [globalSupplier] = await db
        .select()
        .from(globalSuppliers)
        .where(inArray(globalSuppliers.id, [globalSupplierId]));
      
      if (!globalSupplier || !globalSupplier.primaryDomain) {
        logger.debug("Global supplier has no domain, skipping logo fetch", {
          globalSupplierId,
        });
        return;
      }

      await tasks.trigger("fetch-logo", {
        globalSupplierIds: [globalSupplierId],
      });
      
      logger.info("Triggered logo fetch for new global supplier", {
        globalSupplierId,
        domain: globalSupplier.primaryDomain,
      });
    } catch (error) {
      logger.error("Failed to trigger logo fetch for global supplier", {
        globalSupplierId,
        error,
      });
      // Don't fail the operation if job triggering fails
    }
  }
}