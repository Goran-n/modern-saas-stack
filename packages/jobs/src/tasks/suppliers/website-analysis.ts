import { getConfig } from "@figgy/config";
import { getPortkeyClient } from "@figgy/llm-utils";
import { globalSuppliers } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { task } from "@trigger.dev/sdk/v3";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";

// Schema for extracted website information
const websiteInfoSchema = z.object({
  industry: z.string().optional(),
  companyType: z.string().optional(),
  services: z.array(z.string()).optional(),
  companySize: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  targetMarket: z.string().optional(),
});

type WebsiteInfo = z.infer<typeof websiteInfoSchema>;

/**
 * Fetches and converts website content to markdown using Firecrawl
 */
async function fetchWebsiteContent(
  url: string,
  retryCount = 0,
): Promise<string | null> {
  const config = getConfig().get();
  const apiKey = config.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured");
  }

  const maxRetries = 2;
  const retryDelay = 5000; // 5 seconds

  try {
    const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `https://${url}`,
        pageOptions: {
          onlyMainContent: true,
          waitFor: 5000, // Wait 5 seconds for page to load
          timeout: 30000, // 30 second timeout
        },
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle specific error codes
      if (response.status === 408 || response.status === 504) {
        logger.warn("Firecrawl timeout error", {
          url,
          status: response.status,
          error: errorText,
        });
        throw new Error(
          `Website took too long to respond (timeout: ${response.status})`,
        );
      } else if (response.status === 403) {
        throw new Error("Firecrawl API authentication failed - check API key");
      } else if (response.status === 429) {
        throw new Error("Firecrawl API rate limit exceeded");
      }

      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.success || !data.data?.markdown) {
      logger.warn("No content extracted from website", { url });
      return null;
    }

    return data.data.markdown;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if we should retry for timeout or rate limit errors
    const shouldRetry =
      retryCount < maxRetries &&
      (errorMessage.includes("timeout") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("took too long"));

    if (shouldRetry) {
      logger.warn("Retrying Firecrawl request after error", {
        url,
        error: errorMessage,
        retryCount: retryCount + 1,
        delayMs: retryDelay * (retryCount + 1),
      });

      // Wait before retrying with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * (retryCount + 1)),
      );
      return fetchWebsiteContent(url, retryCount + 1);
    }

    logger.error("Failed to fetch website content", {
      url,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      retriesExhausted: retryCount >= maxRetries,
    });
    throw error;
  }
}

/**
 * Analyzes website content using LLM to extract business information
 */
async function analyzeWebsiteContent(
  websiteContent: string,
): Promise<WebsiteInfo> {
  const portkey = getPortkeyClient();

  try {
    const systemPrompt = `You are an expert business analyst. Analyze website content and extract structured business information. 
IMPORTANT: Return your response as a valid JSON object only, with no additional text, markdown formatting, or code blocks.`;

    const userPrompt = `Analyze the following website content and extract business information.
      
Website Content:
${websiteContent.substring(0, 10000)} // Limit content to avoid token limits

Extract the following information and return ONLY a valid JSON object (no markdown, no explanation, no code blocks):
{
  "industry": "The primary industry or sector the company operates in",
  "companyType": "e.g., Software, Manufacturing, Retail, Service Provider, etc.",
  "services": ["List", "of", "main", "services", "or", "products"],
  "companySize": "Estimate based on content (e.g., Small, Medium, Large, Enterprise)",
  "certifications": ["Any", "certifications", "or", "compliance", "standards"],
  "targetMarket": "The primary customer segment or market they serve"
}

IMPORTANT: Return ONLY the JSON object, no other text or formatting. If information is not available, omit that field from the JSON.`;

    const response = await portkey.chat.completions.create({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent || typeof responseContent !== "string") {
      throw new Error("No content in LLM response");
    }

    // Try to extract JSON from the response
    let parsed: any;
    try {
      // First, try direct JSON parsing
      parsed = JSON.parse(responseContent);
    } catch (_jsonError) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch?.[1]) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch (_innerError) {
          // If that also fails, try to find JSON-like content
          const jsonStartIndex = responseContent.indexOf("{");
          const jsonEndIndex = responseContent.lastIndexOf("}");
          if (
            jsonStartIndex !== -1 &&
            jsonEndIndex !== -1 &&
            jsonEndIndex > jsonStartIndex
          ) {
            const possibleJson = responseContent.substring(
              jsonStartIndex,
              jsonEndIndex + 1,
            );
            try {
              parsed = JSON.parse(possibleJson);
            } catch (finalError) {
              logger.error("Failed to parse LLM response as JSON", {
                responseContent: responseContent.substring(0, 500),
                error:
                  finalError instanceof Error
                    ? finalError.message
                    : String(finalError),
              });
              throw new Error(
                `Failed to parse LLM response as JSON: ${finalError instanceof Error ? finalError.message : String(finalError)}`,
              );
            }
          } else {
            throw new Error("No JSON content found in LLM response");
          }
        }
      } else {
        throw new Error(
          "Failed to parse LLM response as JSON and no code block found",
        );
      }
    }

    // Validate against schema
    const result = websiteInfoSchema.parse(parsed);
    return result;
  } catch (error) {
    logger.error("Failed to analyze website content", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export const websiteAnalysis = task({
  id: "website-analysis",
  maxDuration: 300, // 5 minutes
  run: async (payload: { globalSupplierIds: string[] }) => {
    const { globalSupplierIds } = payload;

    if (!globalSupplierIds || globalSupplierIds.length === 0) {
      logger.warn("No supplier IDs provided for website analysis");
      return {
        success: true,
        processed: 0,
        results: [],
      };
    }

    // Validate configuration
    getConfig().validate();

    const db = getDb();

    logger.info("Starting website analysis task", {
      supplierCount: globalSupplierIds.length,
    });

    const results = {
      analyzed: 0,
      failed: 0,
      skipped: 0,
    };

    const detailedResults = [];

    try {
      // Get suppliers that need website analysis
      const suppliers = await db
        .select()
        .from(globalSuppliers)
        .where(inArray(globalSuppliers.id, globalSupplierIds));

      logger.info("Found suppliers for website analysis", {
        requested: globalSupplierIds.length,
        found: suppliers.length,
      });

      // Process each supplier
      for (const supplier of suppliers) {
        try {
          // Skip if no domain
          if (!supplier.primaryDomain) {
            logger.debug("Supplier has no domain for analysis", {
              globalSupplierId: supplier.id,
            });
            results.skipped++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "skipped",
              reason: "No domain available",
            });
            continue;
          }

          // Skip if already enriched recently (within 30 days)
          if (
            supplier.enrichmentStatus === "completed" &&
            supplier.lastEnrichmentAt
          ) {
            const daysSinceEnrichment =
              (Date.now() - supplier.lastEnrichmentAt.getTime()) /
              (1000 * 60 * 60 * 24);

            if (daysSinceEnrichment < 30) {
              logger.debug("Supplier recently enriched", {
                globalSupplierId: supplier.id,
                daysSinceEnrichment,
              });
              results.skipped++;
              detailedResults.push({
                globalSupplierId: supplier.id,
                status: "skipped",
                reason: "Recently enriched",
              });
              continue;
            }
          }

          // Fetch website content
          const content = await fetchWebsiteContent(supplier.primaryDomain);

          if (!content) {
            logger.warn("No content extracted from website", {
              globalSupplierId: supplier.id,
              domain: supplier.primaryDomain,
            });

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
              status: "failed",
              reason: "No content extracted",
            });
            continue;
          }

          // Analyze content
          const websiteInfo = await analyzeWebsiteContent(content);

          // Update supplier with enrichment data
          await db
            .update(globalSuppliers)
            .set({
              enrichmentStatus: "completed",
              enrichmentData: {
                ...websiteInfo,
                websiteAnalyzedAt: new Date().toISOString(),
              },
              lastEnrichmentAt: new Date(),
              enrichmentAttempts: supplier.enrichmentAttempts + 1,
              updatedAt: new Date(),
            })
            .where(eq(globalSuppliers.id, supplier.id));

          results.analyzed++;
          detailedResults.push({
            globalSupplierId: supplier.id,
            status: "analyzed",
            enrichmentData: websiteInfo,
          });

          logger.info("Website analyzed successfully", {
            globalSupplierId: supplier.id,
            domain: supplier.primaryDomain,
            industry: websiteInfo.industry,
            companyType: websiteInfo.companyType,
          });
        } catch (error) {
          logger.error("Failed to analyze website for supplier", {
            supplierId: supplier.id,
            domain: supplier.primaryDomain,
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

      logger.info("Website analysis task completed", {
        event: "website_analysis_completed",
        ...results,
        total: globalSupplierIds.length,
        timestamp: new Date().toISOString(),
        metrics: {
          api: "firecrawl",
          task: "website-analysis",
          requests_made: results.analyzed + results.failed,
          successful_analyses: results.analyzed,
        },
      });

      // Consider the job failed if all items failed
      const success =
        results.analyzed > 0 ||
        results.skipped > 0 ||
        (results.failed === 0 && suppliers.length === 0);

      if (!success) {
        const errorMessage = `Website analysis failed for all ${results.failed} supplier(s)`;
        logger.error(errorMessage, {
          stats: results,
          failedSuppliers: detailedResults.filter((r) => r.status === "error"),
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
      logger.error("Website analysis task failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});

// Export a function to manually trigger the task
export async function triggerWebsiteAnalysis(globalSupplierIds: string[]) {
  return await websiteAnalysis.trigger({ globalSupplierIds });
}
