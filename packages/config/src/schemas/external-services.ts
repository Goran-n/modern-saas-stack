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
});

export type ExternalServicesConfig = z.infer<typeof externalServicesSchema>;