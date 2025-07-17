import { suppliers, eq, and, like } from '@kibly/shared-db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Generate a unique slug for a supplier within a tenant
 * 
 * This function handles race conditions by:
 * 1. Using a SELECT to find the highest suffix
 * 2. The database unique constraint will catch any races
 * 3. The calling code should retry on constraint violations
 */
export async function generateSlug(
  name: string,
  tenantId: string,
  db: PostgresJsDatabase<any>
): Promise<string> {
  // Create base slug
  const baseSlug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
    .substring(0, 50);        // Limit length
  
  // Get all existing slugs that match our base pattern
  const existingSlugs = await db
    .select({ slug: suppliers.slug })
    .from(suppliers)
    .where(
      and(
        eq(suppliers.tenantId, tenantId),
        like(suppliers.slug, `${baseSlug}%`)
      )
    );
  
  // If no existing slugs, use the base
  if (existingSlugs.length === 0) {
    return baseSlug;
  }
  
  // Find the highest numbered suffix
  let maxSuffix = 0;
  const baseSlugExact = existingSlugs.some(s => s.slug === baseSlug);
  if (baseSlugExact) {
    maxSuffix = 0;
  }
  
  // Check for numbered variants
  const suffixPattern = new RegExp(`^${baseSlug}-(\\d+)$`);
  for (const { slug } of existingSlugs) {
    const match = slug.match(suffixPattern);
    if (match && match[1]) {
      const suffix = parseInt(match[1], 10);
      if (suffix > maxSuffix) {
        maxSuffix = suffix;
      }
    }
  }
  
  // Return the next available slug
  if (maxSuffix === 0 && baseSlugExact) {
    return `${baseSlug}-1`;
  } else if (maxSuffix > 0) {
    return `${baseSlug}-${maxSuffix + 1}`;
  } else {
    return baseSlug;
  }
}