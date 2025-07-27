export * from "./development";
export * from "./production";
export * from "./test";

import { type DevelopmentConfig, developmentConfigSchema } from "./development";
import { type ProductionConfig, productionConfigSchema } from "./production";
import { type TestConfig, testConfigSchema } from "./test";

/**
 * Get the appropriate configuration schema based on NODE_ENV
 * @param env - The environment to get the schema for
 * @returns The Zod schema for the specified environment
 */
export function getEnvironmentSchema(
  env: string = process.env.NODE_ENV || "development",
) {
  switch (env) {
    case "production":
      return productionConfigSchema;
    case "test":
      return testConfigSchema;
    default:
      return developmentConfigSchema;
  }
}

/**
 * Union type of all possible environment configurations
 */
export type EnvironmentConfig =
  | DevelopmentConfig
  | ProductionConfig
  | TestConfig;
