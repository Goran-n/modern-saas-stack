import { globalSuppliers } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";

export interface EnrichmentData {
  industry?: string;
  companyType?: string;
  services?: string[];
  companySize?: string;
  certifications?: string[];
  targetMarket?: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

/**
 * Map company types and industries to invoice categories
 */
const CATEGORY_MAPPINGS: Record<
  string,
  { patterns: string[]; category: string }
> = {
  SOFTWARE: {
    patterns: [
      "software",
      "saas",
      "cloud",
      "app",
      "platform",
      "digital",
      "tech",
    ],
    category: "Software & Subscriptions",
  },
  MARKETING: {
    patterns: [
      "marketing",
      "advertising",
      "media",
      "creative",
      "design",
      "branding",
    ],
    category: "Marketing & Advertising",
  },
  PROFESSIONAL_SERVICES: {
    patterns: [
      "consulting",
      "advisory",
      "professional services",
      "accounting",
      "legal",
    ],
    category: "Professional Services",
  },
  IT_SERVICES: {
    patterns: [
      "it services",
      "managed services",
      "hosting",
      "infrastructure",
      "data center",
    ],
    category: "IT Services",
  },
  OFFICE: {
    patterns: ["office supplies", "stationery", "furniture", "equipment"],
    category: "Office Supplies & Equipment",
  },
  UTILITIES: {
    patterns: ["utilities", "energy", "electricity", "gas", "water", "telecom"],
    category: "Utilities",
  },
  TRAVEL: {
    patterns: ["travel", "hotel", "accommodation", "transport", "airline"],
    category: "Travel & Entertainment",
  },
  INSURANCE: {
    patterns: ["insurance", "coverage", "policy", "premium"],
    category: "Insurance",
  },
};

export class EnrichmentHelper {
  /**
   * Get enrichment data for a global supplier
   */
  async getSupplierEnrichment(
    globalSupplierId: string,
  ): Promise<EnrichmentData | null> {
    const db = getDb();

    try {
      const [globalSupplier] = await db
        .select()
        .from(globalSuppliers)
        .where(eq(globalSuppliers.id, globalSupplierId));

      if (!globalSupplier || !globalSupplier.enrichmentData) {
        return null;
      }

      return globalSupplier.enrichmentData as EnrichmentData;
    } catch (error) {
      logger.error("Failed to fetch supplier enrichment", {
        globalSupplierId,
        error,
      });
      return null;
    }
  }

  /**
   * Suggest invoice category based on supplier enrichment data
   */
  suggestCategory(enrichmentData: EnrichmentData): CategorySuggestion | null {
    if (!enrichmentData.industry && !enrichmentData.companyType) {
      return null;
    }

    const searchText =
      `${enrichmentData.industry || ""} ${enrichmentData.companyType || ""} ${(enrichmentData.services || []).join(" ")}`.toLowerCase();

    // Find best matching category
    let bestMatch: CategorySuggestion | null = null;
    let highestScore = 0;

    for (const [, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
      let score = 0;
      const matchedPatterns: string[] = [];

      for (const pattern of mapping.patterns) {
        if (searchText.includes(pattern)) {
          score += pattern.split(" ").length; // Longer patterns score higher
          matchedPatterns.push(pattern);
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          category: mapping.category,
          confidence: Math.min(90, 50 + score * 10), // Cap at 90% confidence
          reason: `Supplier type matches: ${matchedPatterns.join(", ")}`,
        };
      }
    }

    // If no specific match, use company type as fallback
    if (!bestMatch && enrichmentData.companyType) {
      bestMatch = {
        category: enrichmentData.companyType,
        confidence: 60,
        reason: `Based on company type: ${enrichmentData.companyType}`,
      };
    }

    return bestMatch;
  }

  /**
   * Enhance document extraction with supplier enrichment data
   */
  async enhanceWithEnrichment(
    extraction: any,
    globalSupplierId?: string,
  ): Promise<any> {
    if (!globalSupplierId) {
      return extraction;
    }

    const enrichmentData = await this.getSupplierEnrichment(globalSupplierId);
    if (!enrichmentData) {
      return extraction;
    }

    // Add enrichment data to extraction
    const enhanced = {
      ...extraction,
      supplierEnrichment: enrichmentData,
    };

    // Suggest category if not already set
    if (!extraction.suggestedCategory) {
      const categorySuggestion = this.suggestCategory(enrichmentData);
      if (categorySuggestion) {
        enhanced.suggestedCategory = categorySuggestion;

        logger.info("Category suggested from enrichment", {
          globalSupplierId,
          category: categorySuggestion.category,
          confidence: categorySuggestion.confidence,
          reason: categorySuggestion.reason,
        });
      }
    }

    return enhanced;
  }
}
