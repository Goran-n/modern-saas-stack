/**
 * Fuzzy matching utilities for supplier data
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0]![i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j]![0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1, // deletion
        matrix[j - 1]![i]! + 1, // insertion
        matrix[j - 1]![i - 1]! + indicator, // substitution
      );
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * Calculate similarity percentage between two strings (0-100)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const normalised1 = str1.toLowerCase().trim();
  const normalised2 = str2.toLowerCase().trim();

  if (normalised1 === normalised2) return 100;

  const maxLen = Math.max(normalised1.length, normalised2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(normalised1, normalised2);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Calculate name match score with various heuristics
 */
export function calculateNameMatchScore(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const clean1 = cleanCompanyName(name1);
  const clean2 = cleanCompanyName(name2);

  // Exact match after cleaning
  if (clean1 === clean2) return 100;

  // Check for contained names
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return 85;
  }

  // Check for acronyms
  const acronym1 = extractAcronym(clean1);
  const acronym2 = extractAcronym(clean2);
  if (acronym1.length >= 3 && acronym1 === acronym2) {
    return 75;
  }

  // Fuzzy match
  return calculateStringSimilarity(clean1, clean2);
}

/**
 * Clean company name for matching
 */
function cleanCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(ltd|limited|plc|inc|incorporated|corp|corporation|llc|gmbh|ag|sa|srl|bv|nv|pty|pvt)\b/gi,
      "",
    )
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract acronym from company name
 */
function extractAcronym(name: string): string {
  const words = name.split(/\s+/);
  if (words.length < 2) return "";

  return words
    .map((word) => word[0])
    .filter((char) => char && /[a-z0-9]/i.test(char))
    .join("")
    .toUpperCase();
}

/**
 * Calculate address match score
 */
export function calculateAddressMatchScore(
  addr1: { line1?: string; city?: string; postcode?: string; country?: string },
  addr2: { line1?: string; city?: string; postcode?: string; country?: string },
): number {
  if (!addr1 || !addr2) return 0;

  let score = 0;
  let factors = 0;

  // Country match (most important)
  if (addr1.country && addr2.country) {
    factors++;
    if (addr1.country.toLowerCase() === addr2.country.toLowerCase()) {
      score += 40;
    }
  }

  // City match
  if (addr1.city && addr2.city) {
    factors++;
    const citySimilarity = calculateStringSimilarity(addr1.city, addr2.city);
    score += (citySimilarity / 100) * 30;
  }

  // Postcode match
  if (addr1.postcode && addr2.postcode) {
    factors++;
    if (
      addr1.postcode.replace(/\s+/g, "").toLowerCase() ===
      addr2.postcode.replace(/\s+/g, "").toLowerCase()
    ) {
      score += 20;
    }
  }

  // Street address
  if (addr1.line1 && addr2.line1) {
    factors++;
    const streetSimilarity = calculateStringSimilarity(
      addr1.line1,
      addr2.line1,
    );
    score += (streetSimilarity / 100) * 10;
  }

  // Normalize score based on available factors
  if (factors === 0) return 0;
  return Math.round(score * (4 / factors));
}
