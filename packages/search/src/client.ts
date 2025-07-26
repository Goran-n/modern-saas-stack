import { Search } from "@upstash/search";
import { createLogger } from "@figgy/utils";

const logger = createLogger("search-client");

// Cache search clients per tenant (even though we use the same index)
const clientCache = new Map<string, any>();

/**
 * Get Upstash Search index
 * All tenants use the same index with tenant-prefixed IDs
 */
export async function getUpstashIndex(tenantId: string): Promise<any | null> {
  // Check cache first
  if (clientCache.has(tenantId)) {
    return clientCache.get(tenantId)!;
  }

  const searchUrl = process.env.UPSTASH_SEARCH_REST_URL;
  const searchToken = process.env.UPSTASH_SEARCH_REST_TOKEN;

  if (!searchUrl || !searchToken) {
    logger.warn("Upstash Search not configured");
    return null;
  }

  try {
    const searchClient = new Search({
      url: searchUrl,
      token: searchToken,
    });
    
    // All tenants use the same "default" index
    const index = searchClient.index("default");
    clientCache.set(tenantId, index);
    
    return index;
  } catch (error) {
    logger.error("Failed to create Upstash Search client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Clear cache (for testing)
 */
export function clearIndexCache(): void {
  clientCache.clear();
}