import { getConfig } from "@figgy/config";
import { globalSuppliers, eq, inArray } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { task } from "@trigger.dev/sdk/v3";
import { getDb } from "../../db";
import { triggerLogoFetch } from "./fetch-logo";
import { triggerWebsiteAnalysis } from "./website-analysis";

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SerperSearchResult[];
}

/**
 * Validates if a URL is likely to be the official website
 * and not a directory, aggregator, or social media profile
 */
function isValidOfficialWebsite(url: string, companyName: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerCompanyName = companyName.toLowerCase();

  // List of directory/aggregator domains to exclude
  const excludedDomains = [
    "linkedin.com",
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "youtube.com",
    "wikipedia.org",
    "bloomberg.com",
    "crunchbase.com",
    "glassdoor.com",
    "indeed.com",
    "yelp.com",
    "trustpilot.com",
    "companieshouse.gov.uk",
    "dnb.com",
    "zoominfo.com",
    "yellow-pages",
    "yell.com",
    "cylex",
    "bizapedia",
    "manta.com",
  ];

  // Check if URL is from an excluded domain
  for (const domain of excludedDomains) {
    if (lowerUrl.includes(domain)) {
      return false;
    }
  }

  // Check if the domain contains part of the company name
  // This helps ensure we're finding the actual company website
  const companyWords = lowerCompanyName
    .split(/[\s\-&]+/)
    .filter((word) => word.length > 2);

  const urlDomain = new URL(url).hostname.replace("www.", "");
  const domainHasCompanyWord = companyWords.some((word) =>
    urlDomain.includes(word),
  );

  return domainHasCompanyWord;
}

/**
 * Performs a web search to find the official website for a supplier
 */
async function searchForDomain(
  companyName: string,
  vatNumber?: string | null,
  companyNumber?: string | null,
): Promise<string | null> {
  let config;
  try {
    config = getConfig().get();
  } catch (error) {
    logger.error("Failed to get config", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Configuration not available");
  }

  const apiKey = config.SERPER_API_KEY;

  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured");
  }

  // Build search query
  let searchQuery = `"${companyName}" official website`;

  // Add VAT number if available (helps with accuracy)
  if (vatNumber) {
    searchQuery += ` OR "${vatNumber}"`;
  }

  // Add company number if available
  if (companyNumber) {
    searchQuery += ` OR "${companyNumber}"`;
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10, // Get top 10 results
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    const data = (await response.json()) as SerperResponse;

    // Look through results to find a valid official website
    for (const result of data.organic || []) {
      if (isValidOfficialWebsite(result.link, companyName)) {
        logger.info("Found potential official website", {
          companyName,
          url: result.link,
          position: result.position,
        });

        return new URL(result.link).hostname.replace("www.", "");
      }
    }

    logger.warn("No valid official website found", {
      companyName,
      resultsChecked: data.organic?.length || 0,
    });

    return null;
  } catch (error) {
    logger.error("Domain search failed", {
      companyName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export const domainDiscovery = task({
  id: "domain-discovery",
  maxDuration: 300, // 5 minutes
  run: async (payload: { globalSupplierIds: string[] }) => {
    const { globalSupplierIds } = payload;

    if (!globalSupplierIds || globalSupplierIds.length === 0) {
      logger.warn("No supplier IDs provided for domain discovery");
      return {
        success: true,
        processed: 0,
        results: [],
      };
    }

    // Validate configuration
    getConfig().validate();

    const db = getDb();

    logger.info("Starting domain discovery task", {
      supplierCount: globalSupplierIds.length,
    });

    const results = {
      discovered: 0,
      failed: 0,
      skipped: 0,
    };

    const detailedResults = [];

    try {
      // Get suppliers that need domain discovery
      const suppliers = await db
        .select()
        .from(globalSuppliers)
        .where(inArray(globalSuppliers.id, globalSupplierIds));

      logger.info("Found suppliers for domain discovery", {
        requested: globalSupplierIds.length,
        found: suppliers.length,
      });

      // Process each supplier
      for (const supplier of suppliers) {
        try {
          // Skip if already has a domain
          if (supplier.primaryDomain) {
            logger.debug("Supplier already has domain", {
              globalSupplierId: supplier.id,
              domain: supplier.primaryDomain,
            });
            results.skipped++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "skipped",
              reason: "Already has domain",
            });
            continue;
          }

          // Search for domain
          const domain = await searchForDomain(
            supplier.canonicalName,
            supplier.vatNumber,
            supplier.companyNumber,
          );

          if (domain) {
            // Update supplier with discovered domain
            await db
              .update(globalSuppliers)
              .set({
                primaryDomain: domain,
                updatedAt: new Date(),
              })
              .where(eq(globalSuppliers.id, supplier.id));

            results.discovered++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "discovered",
              domain,
            });

            // Trigger logo fetch and website analysis
            await Promise.all([
              triggerLogoFetch([supplier.id]),
              triggerWebsiteAnalysis([supplier.id]),
            ]);

            logger.info("Domain discovered and enrichment triggered", {
              globalSupplierId: supplier.id,
              domain,
            });
          } else {
            // Mark as insufficient data if no domain found
            await db
              .update(globalSuppliers)
              .set({
                enrichmentStatus: "failed",
                enrichmentAttempts: supplier.enrichmentAttempts + 1,
                lastEnrichmentAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(globalSuppliers.id, supplier.id));

            results.failed++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "not_found",
              reason: "No valid domain found",
            });
          }
        } catch (error) {
          logger.error("Failed to discover domain for supplier", {
            supplierId: supplier.id,
            name: supplier.canonicalName,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Update enrichment attempts
          await db
            .update(globalSuppliers)
            .set({
              enrichmentStatus: "failed",
              enrichmentAttempts: supplier.enrichmentAttempts + 1,
              lastEnrichmentAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(globalSuppliers.id, supplier.id));

          results.failed++;
          detailedResults.push({
            globalSupplierId: supplier.id,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      logger.info("Domain discovery task completed", {
        event: "domain_discovery_completed",
        ...results,
        total: globalSupplierIds.length,
        timestamp: new Date().toISOString(),
      });

      // Consider the job failed if all items failed
      const success =
        results.discovered > 0 ||
        results.skipped > 0 ||
        (results.failed === 0 && suppliers.length === 0);

      if (!success) {
        const errorMessage = `Domain discovery failed for all ${results.failed} supplier(s)`;
        logger.error(errorMessage, {
          stats: results,
          failedSuppliers: detailedResults.filter(
            (r) => r.status === "error" || r.status === "not_found",
          ),
        });
        throw new Error(errorMessage);
      }

      return {
        success,
        processed: suppliers.length,
        stats: results,
        results: detailedResults,
      };
    } catch (error) {
      logger.error("Domain discovery task failed", { error });
      throw error;
    }
  },
});

// Export a function to manually trigger the task
export async function triggerDomainDiscovery(globalSupplierIds: string[]) {
  return await domainDiscovery.trigger({ globalSupplierIds });
}
