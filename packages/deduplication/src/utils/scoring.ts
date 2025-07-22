import { logger } from "@figgy/utils";

export class ScoringUtils {
  /**
   * Calculate similarity score for vendor names using fuzzy matching
   */
  static calculateVendorSimilarity(
    name1: string | null | undefined,
    name2: string | null | undefined,
  ): number {
    if (!name1 || !name2) return 0;

    const normalized1 = name1.trim().toLowerCase();
    const normalized2 = name2.trim().toLowerCase();

    // Exact match
    if (normalized1 === normalized2) return 1.0;

    // Calculate Levenshtein distance
    const distance = ScoringUtils.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const similarity = 1 - distance / maxLength;

    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Calculate date proximity score
   */
  static calculateDateProximity(
    date1: Date | string | null | undefined,
    date2: Date | string | null | undefined,
    toleranceDays: number = 1,
  ): number {
    if (!date1 || !date2) return 0;

    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

    const diffMs = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return 1.0;
    if (diffDays <= toleranceDays) return 0.9;
    if (diffDays <= toleranceDays * 2) return 0.7;
    if (diffDays <= toleranceDays * 7) return 0.5;

    return 0;
  }

  /**
   * Calculate amount match score with tolerance
   */
  static calculateAmountMatch(
    amount1: number | string | null | undefined,
    amount2: number | string | null | undefined,
    tolerance: number = 0.01,
  ): number {
    if (
      amount1 === null ||
      amount1 === undefined ||
      amount2 === null ||
      amount2 === undefined
    )
      return 0;

    const num1 = typeof amount1 === "string" ? parseFloat(amount1) : amount1;
    const num2 = typeof amount2 === "string" ? parseFloat(amount2) : amount2;

    if (isNaN(num1) || isNaN(num2)) return 0;

    const diff = Math.abs(num1 - num2);

    if (diff === 0) return 1.0;
    if (diff <= tolerance) return 0.95; // Rounding difference

    // Calculate percentage difference
    const percentDiff = diff / Math.max(num1, num2);
    if (percentDiff <= 0.01) return 0.9; // 1% difference
    if (percentDiff <= 0.05) return 0.7; // 5% difference

    return 0;
  }

  /**
   * Calculate invoice number match score
   */
  static calculateInvoiceNumberMatch(
    num1: string | null | undefined,
    num2: string | null | undefined,
  ): number {
    if (!num1 || !num2) return 0;

    const normalized1 = num1.trim().toUpperCase();
    const normalized2 = num2.trim().toUpperCase();

    // Exact match
    if (normalized1 === normalized2) return 1.0;

    // Check if one is contained in the other (for prefixes/suffixes)
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      return 0.8;
    }

    return 0;
  }

  /**
   * Calculate overall duplicate score
   */
  static calculateOverallScore(
    scores: {
      vendorMatch: number;
      invoiceNumberMatch: number;
      dateProximity: number;
      amountMatch: number;
    },
    weights: {
      vendorName: number;
      invoiceNumber: number;
      invoiceDate: number;
      totalAmount: number;
    } = {
      vendorName: 0.3,
      invoiceNumber: 0.3,
      invoiceDate: 0.2,
      totalAmount: 0.2,
    },
  ): number {
    const weightedSum =
      scores.vendorMatch * weights.vendorName +
      scores.invoiceNumberMatch * weights.invoiceNumber +
      scores.dateProximity * weights.invoiceDate +
      scores.amountMatch * weights.totalAmount;

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

    return weightedSum / totalWeight;
  }

  /**
   * Levenshtein distance calculation
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
