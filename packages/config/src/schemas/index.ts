import type { z } from "zod";

// Export the three main schemas
export * from "./backend";
export * from "./frontend";
export * from "./extension";

import { backendSchema } from "./backend";
import { frontendSchema } from "./frontend";
import { extensionSchema } from "./extension";

/**
 * Backend configuration schema
 * Use this for API, jobs, and all backend services
 */
export { backendSchema };

/**
 * Frontend configuration schema
 * Use this for web applications
 */
export { frontendSchema };

/**
 * Extension configuration schema
 * Use this for browser extensions
 */
export { extensionSchema };

// Type exports
export type BackendConfig = z.infer<typeof backendSchema>;
export type FrontendConfig = z.infer<typeof frontendSchema>;
export type ExtensionConfig = z.infer<typeof extensionSchema>;