import { Identifiers, Supplier } from '../types';

export interface MatchResult {
  matched: boolean;
  supplierId?: string;
  confidence: number;
  matchType: 'company_number' | 'vat_number' | 'name' | 'none';
}

/**
 * Simple deterministic supplier matching
 */
export class SupplierMatcher {
  /**
   * Match by identifiers first, then by name
   */
  static match(
    identifiers: Identifiers,
    name: string,
    existingSuppliers: Supplier[]
  ): MatchResult {
    // Step 1: Check company number
    if (identifiers.companyNumber) {
      const match = existingSuppliers.find(
        s => s.companyNumber === identifiers.companyNumber
      );
      if (match) {
        return {
          matched: true,
          supplierId: match.id,
          confidence: 100,
          matchType: 'company_number',
        };
      }
    }
    
    // Step 2: Check VAT number
    if (identifiers.vatNumber) {
      const match = existingSuppliers.find(
        s => s.vatNumber === identifiers.vatNumber
      );
      if (match) {
        return {
          matched: true,
          supplierId: match.id,
          confidence: 95,
          matchType: 'vat_number',
        };
      }
    }
    
    // Step 3: Name matching (exact match only for now)
    const normalizedInput = this.normalizeName(name);
    const nameMatch = existingSuppliers.find(
      s => this.normalizeName(s.displayName) === normalizedInput
    );
    
    if (nameMatch) {
      return {
        matched: true,
        supplierId: nameMatch.id,
        confidence: 70,
        matchType: 'name',
      };
    }
    
    // No match
    return {
      matched: false,
      confidence: 0,
      matchType: 'none',
    };
  }
  
  /**
   * Basic name normalization
   */
  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*(ltd|limited|inc|llc|plc|corp)\s*\.?$/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}