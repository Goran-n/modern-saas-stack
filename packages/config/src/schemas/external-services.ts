import { z } from "zod";

/**
 * External service API configuration
 */
export const externalServicesSchema = z.object({
  /**
   * Logo.dev API token for fetching company logos
   * Required for supplier logo fetching functionality
   * @see https://logo.dev
   */
  LOGO_DEV_TOKEN: z
    .string()
    .min(1, "LOGO_DEV_TOKEN is required for logo fetching"),

  /**
   * Upstash Search REST URL
   * Alternative search backend for full-text search
   * @see https://upstash.com/docs/search/overall/getstarted
   */
  UPSTASH_SEARCH_REST_URL: z
    .string()
    .url("UPSTASH_SEARCH_REST_URL must be a valid URL")
    .optional(),

  /**
   * Upstash Search REST Token
   * Authentication token for Upstash Search
   */
  UPSTASH_SEARCH_REST_TOKEN: z.string().min(1).optional(),

  /**
   * Serper API Key
   * For domain discovery and search
   * @see https://serper.dev
   */
  SERPER_API_KEY: z
    .string()
    .min(1, "SERPER_API_KEY is required for domain discovery"),

  /**
   * Firecrawl API Key
   * For website content extraction
   * @see https://firecrawl.dev
   */
  FIRECRAWL_API_KEY: z
    .string()
    .min(1, "FIRECRAWL_API_KEY is required for website analysis"),

  /**
   * PDF.co API Key
   * For PDF to image conversion and thumbnail generation
   * @see https://pdf.co
   */
  PDF_CO_API_KEY: z
    .string()
    .min(1, "PDF_CO_API_KEY is required for PDF thumbnail generation")
    .optional(),
});

export type ExternalServicesConfig = z.infer<typeof externalServicesSchema>;
