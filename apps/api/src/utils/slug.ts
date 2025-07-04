/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Ensure we have something
    || 'tenant'
}

/**
 * Validate if a slug meets our requirements
 */
export function validateSlug(slug: string): boolean {
  // Must be 1-100 characters
  if (slug.length < 1 || slug.length > 100) {
    return false
  }
  
  // Must only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return false
  }
  
  // Cannot start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false
  }
  
  // Cannot have consecutive hyphens
  if (slug.includes('--')) {
    return false
  }
  
  return true
}

/**
 * Reserved slugs that cannot be used
 */
const RESERVED_SLUGS = [
  'api',
  'admin',
  'www',
  'app',
  'dashboard',
  'auth',
  'login',
  'register',
  'signup',
  'settings',
  'billing',
  'support',
  'help',
  'docs',
  'blog',
  'about',
  'contact',
  'privacy',
  'terms',
  'kibly',
  'system',
  'root',
  'null',
  'undefined',
]

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}