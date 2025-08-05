/**
 * Calculate Levenshtein distance between two strings
 * This is the minimum number of single-character edits required to change one string into another
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }
  
  // Calculate distances
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length]![str1.length]!;
}

/**
 * Normalize company name by removing common suffixes and punctuation
 */
export function normalizeCompanyName(name: string): string {
  const suffixes = [
    'inc', 'incorporated', 'corp', 'corporation', 'ltd', 'limited',
    'llc', 'llp', 'plc', 'gmbh', 'ag', 'sa', 'srl', 'bv', 'nv',
    'pty', 'pte', 'pvt', 'co', 'company', 'enterprises', 'holdings',
    'group', 'international', 'global'
  ];
  
  let normalized = name.toLowerCase();
  
  // Remove punctuation
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
  
  // Remove common suffixes
  suffixes.forEach(suffix => {
    const regex = new RegExp(`\\s+${suffix}\\s*$`, 'i');
    normalized = normalized.replace(regex, '');
  });
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Check if two company names are similar enough to be considered the same
 */
export function areCompaniesSimilar(
  name1: string,
  name2: string,
  maxDistance: number = 2
): boolean {
  const normalized1 = normalizeCompanyName(name1);
  const normalized2 = normalizeCompanyName(name2);
  
  if (normalized1 === normalized2) {
    return true;
  }
  
  const distance = calculateLevenshteinDistance(normalized1, normalized2);
  return distance <= maxDistance;
}

/**
 * Extract domain from email or URL
 */
export function extractDomain(input: string): string | null {
  // Handle email addresses
  if (input.includes('@')) {
    const parts = input.split('@');
    return parts[1] || null;
  }
  
  // Handle URLs
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return url.hostname;
  } catch {
    // If not a valid URL, check if it looks like a domain
    if (input.includes('.') && !input.includes(' ')) {
      return input;
    }
    return null;
  }
}

/**
 * Validate VAT number format
 */
export function isValidVATNumber(vatNumber: string): boolean {
  const patterns: Record<string, RegExp> = {
    IE: /^IE\d{7}[A-Z]$/,         // Ireland
    EU: /^EU\d{9}$/,              // EU
    GB: /^GB\d{9}$/,              // UK
    DE: /^DE\d{9}$/,              // Germany
    FR: /^FR[A-Z0-9]{2}\d{9}$/,   // France
    IT: /^IT\d{11}$/,             // Italy
    ES: /^ES[A-Z]\d{7}[A-Z0-9]$/, // Spain
    NL: /^NL\d{9}B\d{2}$/,        // Netherlands
    BE: /^BE0\d{9}$/,             // Belgium
    AT: /^ATU\d{8}$/,             // Austria
    PL: /^PL\d{10}$/,             // Poland
    SE: /^SE\d{12}$/,             // Sweden
    DK: /^DK\d{8}$/,              // Denmark
    FI: /^FI\d{8}$/,              // Finland
    PT: /^PT\d{9}$/,              // Portugal
  };

  // Extract country code (first 2 characters)
  const countryCode = vatNumber.substring(0, 2).toUpperCase();
  const pattern = patterns[countryCode];
  
  return pattern ? pattern.test(vatNumber) : false;
}

/**
 * Format date string consistently
 */
export function formatDateString(
  date: string | Date,
  format: 'ISO' | 'US' | 'EU' = 'ISO'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  switch (format) {
    case 'ISO':
      return dateObj.toISOString().split('T')[0]!; // YYYY-MM-DD
    case 'US':
      return `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`; // MM/DD/YYYY
    case 'EU':
      return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`; // DD/MM/YYYY
    default:
      return dateObj.toISOString().split('T')[0]!;
  }
}