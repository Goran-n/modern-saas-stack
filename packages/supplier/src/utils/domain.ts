/**
 * Domain extraction and normalisation utilities
 */

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
  if (!email || !email.includes("@")) {
    return null;
  }

  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain || null;
}

/**
 * Extract domain from website URL
 */
export function extractDomainFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(urlWithProtocol);
    return urlObj.hostname.toLowerCase().replace("www.", "");
  } catch {
    // Fallback for malformed URLs
    if (!url) return null;
    const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
    const parts = cleanUrl.split("/");
    const domain = parts[0]?.split("?")[0]?.trim();

    return domain || null;
  }
}

/**
 * Check if two domains match, handling common variations
 */
export function domainsMatch(
  domain1: string | null,
  domain2: string | null,
): boolean {
  if (!domain1 || !domain2) return false;

  const normalized1 = domain1.toLowerCase().replace("www.", "");
  const normalized2 = domain2.toLowerCase().replace("www.", "");

  return normalized1 === normalized2;
}

/**
 * Check if domains match including subdomain matching
 * e.g., invoices.company.com matches company.com
 */
export function domainsMatchWithSubdomains(
  domain1: string | null,
  domain2: string | null,
): boolean {
  if (!domain1 || !domain2) return false;

  const normalized1 = domain1.toLowerCase().replace("www.", "");
  const normalized2 = domain2.toLowerCase().replace("www.", "");

  // Exact match
  if (normalized1 === normalized2) return true;

  // Check if one is a subdomain of the other
  const parts1 = normalized1.split(".");
  const parts2 = normalized2.split(".");

  // Ensure we have valid domain parts
  if (parts1.length < 2 || parts2.length < 2) return false;

  // Get the main domain (last two parts for most domains)
  const mainDomain1 = parts1.slice(-2).join(".");
  const mainDomain2 = parts2.slice(-2).join(".");

  // Check if main domains match
  if (mainDomain1 === mainDomain2) return true;

  // Handle special TLDs like .co.uk, .com.au
  if (parts1.length > 2 && parts2.length > 2) {
    // Check if one domain ends with the other
    if (
      normalized1.endsWith(`.${normalized2}`) ||
      normalized2.endsWith(`.${normalized1}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extract all domains from supplier data
 */
export function extractDomainsFromSupplier(data: {
  contacts?: Array<{ type: string; value: string }>;
  website?: string;
  email?: string;
}): string[] {
  const domains: string[] = [];

  // From email contacts
  if (data.contacts) {
    for (const contact of data.contacts) {
      if (contact.type === "email") {
        const domain = extractDomain(contact.value);
        if (domain) domains.push(domain);
      }
      if (contact.type === "website") {
        const domain = extractDomainFromUrl(contact.value);
        if (domain) domains.push(domain);
      }
    }
  }

  // From direct email field
  if (data.email) {
    const domain = extractDomain(data.email);
    if (domain) domains.push(domain);
  }

  // From website field
  if (data.website) {
    const domain = extractDomainFromUrl(data.website);
    if (domain) domains.push(domain);
  }

  // Remove duplicates
  return [...new Set(domains)];
}
