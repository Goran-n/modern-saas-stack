import { MATCH_SCORES } from "../constants";
import type { Identifiers, Supplier } from "../types";
import { calculateNameMatchScore } from "../utils/fuzzy-match";

export interface MatchResult {
  matched: boolean;
  supplierId?: string | undefined;
  confidence: number;
  matchType:
    | "company_number"
    | "vat_number"
    | "domain"
    | "name"
    | "address"
    | "composite"
    | "none";
  details?:
    | {
        nameScore?: number;
        addressScore?: number;
        domainScore?: number;
        identifierScore?: number;
        contactScore?: number;
      }
    | undefined;
}

export interface SupplierMatchData {
  identifiers: Identifiers;
  name: string;
  addresses?: Array<{
    line1?: string | null;
    city?: string | null;
    country?: string | null;
  }>;
  contacts?: Array<{
    type: string;
    value: string;
  }>;
}

/**
 * Enhanced supplier matching with scoring system
 */
export class SupplierMatcher {
  /**
   * Match supplier using comprehensive scoring system
   */
  static match(
    identifiers: Identifiers,
    name: string,
    existingSuppliers: Supplier[],
  ): MatchResult {
    // Legacy method - convert to new format
    const matchData: SupplierMatchData = {
      identifiers,
      name,
      addresses: [],
      contacts: [],
    };

    return SupplierMatcher.matchWithScoring(matchData, existingSuppliers);
  }

  /**
   * Enhanced matching with full supplier data
   */
  static matchWithScoring(
    supplierData: SupplierMatchData,
    existingSuppliers: Supplier[],
  ): MatchResult {
    let bestMatch: MatchResult = {
      matched: false,
      confidence: 0,
      matchType: "none",
    };

    for (const existing of existingSuppliers) {
      const matchResult = SupplierMatcher.scoreMatch(supplierData, existing);

      if (matchResult.confidence > bestMatch.confidence) {
        bestMatch = matchResult;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate comprehensive match score between supplier data and existing supplier
   */
  private static scoreMatch(
    supplierData: SupplierMatchData,
    existing: Supplier,
  ): MatchResult {
    let totalScore = 0;
    let matchType: MatchResult["matchType"] = "none";
    const details: MatchResult["details"] = {};

    // 1. Company number matching (highest priority)
    if (supplierData.identifiers.companyNumber && existing.companyNumber) {
      if (supplierData.identifiers.companyNumber === existing.companyNumber) {
        return {
          matched: true,
          supplierId: existing.id,
          confidence: 100,
          matchType: "company_number",
          details: { identifierScore: MATCH_SCORES.IDENTIFIERS.COMPANY_NUMBER },
        };
      }
    }

    // 2. VAT number matching (second highest priority)
    if (supplierData.identifiers.vatNumber && existing.vatNumber) {
      if (supplierData.identifiers.vatNumber === existing.vatNumber) {
        return {
          matched: true,
          supplierId: existing.id,
          confidence: 95,
          matchType: "vat_number",
          details: { identifierScore: MATCH_SCORES.IDENTIFIERS.VAT_NUMBER },
        };
      }
    }

    // 3. Name matching with fuzzy logic
    const nameScore = calculateNameMatchScore(
      supplierData.name,
      existing.displayName || existing.legalName,
    );
    if (nameScore >= 100) {
      totalScore += MATCH_SCORES.NAME.EXACT;
      matchType = "name";
    } else if (nameScore >= 90) {
      totalScore += MATCH_SCORES.NAME.FUZZY_HIGH;
      matchType = "name";
    } else if (nameScore >= 70) {
      totalScore += MATCH_SCORES.NAME.FUZZY_MEDIUM;
      matchType = "name";
    } else if (nameScore >= 50) {
      totalScore += MATCH_SCORES.NAME.FUZZY_LOW;
      matchType = "name";
    }
    details.nameScore = nameScore;

    // 4. Domain matching
    // Note: We don't have existing supplier domains in the current schema
    // This would need to be added to the supplier model for full functionality
    // For now, we'll skip domain matching but keep the framework
    details.domainScore = 0;

    // 5. Address matching
    if (supplierData.addresses && supplierData.addresses.length > 0) {
      // Note: We'd need to extend the Supplier interface to include address data
      // For now, we'll set a placeholder score
      details.addressScore = 0;
    }

    // 6. Contact matching
    const contactScore = 0;
    if (supplierData.contacts) {
      // This would need existing supplier contact data to compare
      // Placeholder for now
    }
    details.contactScore = contactScore;

    // Determine overall match
    const matched = totalScore > 0;
    const confidence = Math.min(totalScore, 100);

    if (confidence >= 50 && matchType === "none") {
      matchType = "composite";
    }

    return {
      matched,
      supplierId: matched ? existing.id : undefined,
      confidence,
      matchType,
      details,
    };
  }

  /**
   * Calculate minimum data score for supplier creation
   */
  static calculateCreationScore(supplierData: SupplierMatchData): number {
    let score = 0;

    // Name is required
    if (!supplierData.name?.trim()) {
      return 0;
    }
    score += 30; // Base score for having a name

    // Tax identifiers
    if (supplierData.identifiers.companyNumber) {
      score += MATCH_SCORES.IDENTIFIERS.COMPANY_NUMBER;
    }
    if (supplierData.identifiers.vatNumber) {
      score += MATCH_SCORES.IDENTIFIERS.VAT_NUMBER;
    }

    // Address data
    if (supplierData.addresses && supplierData.addresses.length > 0) {
      const addr = supplierData.addresses[0];
      if (addr && addr.line1 && addr.city && addr.country) {
        score += MATCH_SCORES.ADDRESS.FULL_MATCH;
      } else if (addr && addr.city && addr.country) {
        score += MATCH_SCORES.ADDRESS.CITY_COUNTRY;
      } else if (addr && addr.country) {
        score += MATCH_SCORES.ADDRESS.COUNTRY_ONLY;
      }
    }

    // Contact data
    if (supplierData.contacts) {
      const hasEmail = supplierData.contacts.some(
        (c) => c.type === "email" && c.value,
      );
      const hasPhone = supplierData.contacts.some(
        (c) => c.type === "phone" && c.value,
      );
      const hasWebsite = supplierData.contacts.some(
        (c) => c.type === "website" && c.value,
      );

      if (hasEmail) {
        score += MATCH_SCORES.CONTACTS.EMAIL;
        // Bonus for domain information
        score += MATCH_SCORES.DOMAIN.EXACT_MATCH;
      }
      if (hasPhone) score += MATCH_SCORES.CONTACTS.PHONE;
      if (hasWebsite) score += MATCH_SCORES.DOMAIN.EXACT_MATCH;
    }

    return Math.min(score, 100);
  }
}
