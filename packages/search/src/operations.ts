import { createLogger } from "@figgy/utils";
import { getUpstashIndex } from "./client";
import type { ResourceType, SearchFilters, SearchResult } from "./types";

const logger = createLogger("search-operations");

/**
 * Generate a unique ID for a resource in the index
 * Format: tenantId:type:id
 */
function getResourceId(
  type: ResourceType,
  id: string,
  tenantId: string,
): string {
  return `${tenantId}:${type}:${id}`;
}

/**
 * Index a file in Upstash Search
 */
export async function indexFile(data: {
  id: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  supplierName?: string;
  category?: string;
  size?: number;
  createdAt?: Date;
}): Promise<void> {
  const index = await getUpstashIndex(data.tenantId);
  if (!index) return;

  try {
    // Create searchable text from all relevant fields
    const text = [
      data.fileName,
      data.supplierName,
      data.category,
      data.mimeType,
    ]
      .filter(Boolean)
      .join(" ");

    await index.upsert({
      id: getResourceId("file", data.id, data.tenantId),
      content: {
        text, // Main searchable text
        tenantId: data.tenantId,
        type: "file",
        fileName: data.fileName,
        mimeType: data.mimeType,
        supplierName: data.supplierName,
        category: data.category,
        size: data.size,
        createdAt: data.createdAt?.toISOString(),
      },
    });

    logger.debug("Indexed file", { fileId: data.id, tenantId: data.tenantId });
  } catch (error) {
    logger.error("Failed to index file", {
      fileId: data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update a file in the index
 */
export async function updateFile(
  id: string,
  tenantId: string,
  updates: {
    category?: string;
    extractedText?: string;
    supplierName?: string;
    supplierId?: string;
    documentType?: string;
    invoiceNumber?: string;
    amount?: number;
  },
): Promise<void> {
  const index = await getUpstashIndex(tenantId);
  if (!index) return;

  try {
    const resourceId = getResourceId("file", id, tenantId);

    // For updates, we need to re-index the entire document
    // Upstash Search doesn't support partial updates

    // Create new searchable text including updates
    const text = [
      updates.supplierName,
      updates.category || updates.documentType,
      updates.invoiceNumber,
      updates.extractedText,
    ]
      .filter(Boolean)
      .join(" ");

    await index.upsert({
      id: resourceId,
      content: {
        text,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    });

    logger.debug("Updated file", { fileId: id, tenantId, updates });
  } catch (error) {
    logger.error("Failed to update file", {
      fileId: id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Remove a file from the index
 */
export async function removeFile(id: string, tenantId: string): Promise<void> {
  const index = await getUpstashIndex(tenantId);
  if (!index) return;

  try {
    await index.delete(getResourceId("file", id, tenantId));
    logger.debug("Removed file from index", { fileId: id, tenantId });
  } catch (error) {
    logger.error("Failed to remove file", {
      fileId: id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Index a supplier in Upstash Search
 */
export async function indexSupplier(data: {
  id: string;
  tenantId: string;
  displayName: string;
  legalName: string;
  companyNumber?: string;
  vatNumber?: string;
  createdAt?: Date;
}): Promise<void> {
  const index = await getUpstashIndex(data.tenantId);
  if (!index) return;

  try {
    const text = [
      data.displayName,
      data.legalName,
      data.companyNumber,
      data.vatNumber,
    ]
      .filter(Boolean)
      .join(" ");

    await index.upsert({
      id: getResourceId("supplier", data.id, data.tenantId),
      content: {
        text,
        tenantId: data.tenantId,
        type: "supplier",
        displayName: data.displayName,
        legalName: data.legalName,
        companyNumber: data.companyNumber,
        vatNumber: data.vatNumber,
        createdAt: data.createdAt?.toISOString(),
      },
    });

    logger.debug("Indexed supplier", {
      supplierId: data.id,
      tenantId: data.tenantId,
    });
  } catch (error) {
    logger.error("Failed to index supplier", {
      supplierId: data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update a supplier in the index
 */
export async function updateSupplier(
  id: string,
  tenantId: string,
  updates: {
    logoUrl?: string;
    enriched?: boolean;
    fileCount?: number;
  },
): Promise<void> {
  const index = await getUpstashIndex(tenantId);
  if (!index) return;

  try {
    const resourceId = getResourceId("supplier", id, tenantId);

    // For minor updates that don't affect searchability,
    // we can just update the metadata
    await index.upsert({
      id: resourceId,
      content: {
        ...updates,
        hasLogo: !!updates.logoUrl,
        updatedAt: new Date().toISOString(),
      },
    });

    logger.debug("Updated supplier", { supplierId: id, tenantId, updates });
  } catch (error) {
    logger.error("Failed to update supplier", {
      supplierId: id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Remove a supplier from the index
 */
export async function removeSupplier(
  id: string,
  tenantId: string,
): Promise<void> {
  const index = await getUpstashIndex(tenantId);
  if (!index) return;

  try {
    await index.delete(getResourceId("supplier", id, tenantId));
    logger.debug("Removed supplier from index", { supplierId: id, tenantId });
  } catch (error) {
    logger.error("Failed to remove supplier", {
      supplierId: id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Search across all resources
 */
export async function search(
  tenantId: string,
  query: string,
  filters?: SearchFilters,
  limit: number = 20,
): Promise<SearchResult[]> {
  const index = await getUpstashIndex(tenantId);
  if (!index) return [];

  try {
    const searchOptions: any = {
      query: query || "*",
      limit,
    };

    // Upstash Search returns results directly as an array
    const results = await index.search(searchOptions);

    if (!results || !Array.isArray(results)) {
      return [];
    }

    // Filter results by tenant ID (since all tenants share the same index)
    const tenantResults = results.filter((result: any) => {
      return String(result.id).startsWith(`${tenantId}:`);
    });

    // Apply additional filters if needed
    let filteredResults = tenantResults;

    if (filters?.type) {
      filteredResults = filteredResults.filter(
        (r) => r.content?.type === filters.type,
      );
    }
    if (filters?.category) {
      filteredResults = filteredResults.filter(
        (r) => r.content?.category === filters.category,
      );
    }
    if (filters?.supplierId) {
      filteredResults = filteredResults.filter(
        (r) => r.content?.supplierId === filters.supplierId,
      );
    }

    return filteredResults.map((result: any) => ({
      id: String(result.id).replace(`${tenantId}:`, ""), // Remove tenant prefix
      score: result.score || 0,
      metadata: result.content || {}, // Content contains the data
    }));
  } catch (error) {
    logger.error("Search failed", {
      tenantId,
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get suggestions for autocomplete
 */
export async function suggest(
  tenantId: string,
  prefix: string,
  limit: number = 10,
): Promise<string[]> {
  // Use regular search with the prefix
  const results = await search(tenantId, prefix, undefined, limit);

  // Extract unique display names from results
  const suggestions = new Set<string>();

  results.forEach((result) => {
    if (result.metadata.displayName) {
      suggestions.add(result.metadata.displayName);
    } else if (result.metadata.fileName) {
      suggestions.add(result.metadata.fileName);
    }
  });

  return Array.from(suggestions).slice(0, limit);
}
