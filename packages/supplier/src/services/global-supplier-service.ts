import { and, eq, globalSuppliers, isNull, suppliers } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { getDb } from "../db";
import type { Supplier } from "../types";
import { extractDomainsFromSupplier } from "../utils/domain";
import { calculateNameMatchScore } from "../utils/fuzzy-match";

export interface GlobalSupplierMatch {
  globalSupplierId: string;
  confidence: number;
  matchType: "company_number" | "vat_number" | "domain" | "name";
}

export class GlobalSupplierService {
  private get db() {
    return getDb();
  }

  /**
   * Find or create a global supplier based on tenant supplier data
   */
  async findOrCreateGlobalSupplier(
    supplier: Supplier,
    attributes?: {
      emails?: Array<{ value: any }>;
      websites?: Array<{ value: any }>;
    },
  ): Promise<string | null> {
    // First, try to find an existing global supplier
    const match = await this.findGlobalSupplierMatch(supplier, attributes);

    if (match && match.confidence >= 90) {
      logger.info("Found high confidence global supplier match", {
        supplierId: supplier.id,
        globalSupplierId: match.globalSupplierId,
        confidence: match.confidence,
        matchType: match.matchType,
      });
      return match.globalSupplierId;
    }

    // No high confidence match - create new global supplier if we have identifiers
    if (supplier.companyNumber || supplier.vatNumber) {
      return await this.createGlobalSupplier(supplier, attributes);
    }

    // Log medium confidence matches for manual review
    if (match && match.confidence >= 60) {
      logger.info("Medium confidence global supplier match found", {
        supplierId: supplier.id,
        globalSupplierId: match.globalSupplierId,
        confidence: match.confidence,
        matchType: match.matchType,
      });
      // TODO: Queue for manual review
    }

    return null;
  }

  /**
   * Find matching global supplier
   */
  private async findGlobalSupplierMatch(
    supplier: Supplier,
    attributes?: {
      emails?: Array<{ value: any }>;
      websites?: Array<{ value: any }>;
    },
  ): Promise<GlobalSupplierMatch | null> {
    // 1. Try exact company number match
    if (supplier.companyNumber) {
      const [match] = await this.db
        .select()
        .from(globalSuppliers)
        .where(eq(globalSuppliers.companyNumber, supplier.companyNumber))
        .limit(1);

      if (match) {
        return {
          globalSupplierId: match.id,
          confidence: 100,
          matchType: "company_number",
        };
      }
    }

    // 2. Try VAT number match
    if (supplier.vatNumber) {
      const matches = await this.db
        .select()
        .from(globalSuppliers)
        .where(eq(globalSuppliers.vatNumber, supplier.vatNumber));

      if (matches.length > 0) {
        // Check name similarity for VAT matches
        // (multiple trading names can share VAT)
        for (const match of matches) {
          const nameScore = calculateNameMatchScore(
            supplier.displayName,
            match.canonicalName,
          );
          if (nameScore >= 70) {
            return {
              globalSupplierId: match.id,
              confidence: 95,
              matchType: "vat_number",
            };
          }
        }
      }
    }

    // 3. Try domain match
    const domains = this.extractDomains(attributes);
    if (domains.length > 0) {
      for (const domain of domains) {
        const [match] = await this.db
          .select()
          .from(globalSuppliers)
          .where(eq(globalSuppliers.primaryDomain, domain))
          .limit(1);

        if (match) {
          const nameScore = calculateNameMatchScore(
            supplier.displayName,
            match.canonicalName,
          );
          return {
            globalSupplierId: match.id,
            confidence: Math.min(90, nameScore),
            matchType: "domain",
          };
        }
      }
    }

    // 4. Try fuzzy name match (only if no identifiers)
    if (!supplier.companyNumber && !supplier.vatNumber) {
      const allGlobalSuppliers = await this.db
        .select()
        .from(globalSuppliers)
        .limit(1000); // Limit for performance

      let bestMatch: GlobalSupplierMatch | null = null;
      for (const global of allGlobalSuppliers) {
        const score = calculateNameMatchScore(
          supplier.displayName,
          global.canonicalName,
        );
        if (score >= 85 && (!bestMatch || score > bestMatch.confidence)) {
          bestMatch = {
            globalSupplierId: global.id,
            confidence: score,
            matchType: "name",
          };
        }
      }
      return bestMatch;
    }

    return null;
  }

  /**
   * Create a new global supplier
   */
  private async createGlobalSupplier(
    supplier: Supplier,
    attributes?: {
      emails?: Array<{ value: any }>;
      websites?: Array<{ value: any }>;
    },
  ): Promise<string> {
    const domains = this.extractDomains(attributes);
    const primaryDomain = domains[0] || null;

    const [globalSupplier] = await this.db
      .insert(globalSuppliers)
      .values({
        companyNumber: supplier.companyNumber,
        vatNumber: supplier.vatNumber,
        canonicalName: supplier.displayName,
        primaryDomain,
        logoFetchStatus: primaryDomain ? "pending" : "not_found",
      })
      .returning();

    if (!globalSupplier) {
      throw new Error("Failed to create global supplier");
    }

    logger.info("Created new global supplier", {
      globalSupplierId: globalSupplier.id,
      name: globalSupplier.canonicalName,
      domain: primaryDomain,
    });

    // TODO: Trigger logo fetch job here - needs to be done from API layer to avoid circular dependency

    return globalSupplier.id;
  }

  /**
   * Link tenant supplier to global supplier
   */
  async linkToGlobalSupplier(
    supplierId: string,
    globalSupplierId: string,
  ): Promise<void> {
    await this.db
      .update(suppliers)
      .set({
        globalSupplierId,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, supplierId));

    logger.info("Linked supplier to global supplier", {
      supplierId,
      globalSupplierId,
    });
  }

  /**
   * Extract domains from supplier attributes
   */
  private extractDomains(attributes?: {
    emails?: Array<{ value: any }>;
    websites?: Array<{ value: any }>;
  }): string[] {
    if (!attributes) return [];

    const contacts = [
      ...(attributes.emails?.map((e) => ({ type: "email", value: e.value })) ||
        []),
      ...(attributes.websites?.map((w) => ({
        type: "website",
        value: w.value,
      })) || []),
    ];

    return extractDomainsFromSupplier({ contacts });
  }

  /**
   * Get suppliers pending logo fetch
   */
  async getSuppliersNeedingLogos(limit = 10): Promise<string[]> {
    const pending = await this.db
      .select({ id: globalSuppliers.id })
      .from(globalSuppliers)
      .where(
        and(
          eq(globalSuppliers.logoFetchStatus, "pending"),
          isNull(globalSuppliers.logoFetchedAt),
        ),
      )
      .limit(limit);

    return pending.map((p) => p.id);
  }
}
