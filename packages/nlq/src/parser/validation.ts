import { getValidationConfig } from "../config/validation-config";
import type { ParsedQuery, QueryContext } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateParsedQuery(
  query: ParsedQuery,
  _context: QueryContext,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const config = getValidationConfig();

  // Validate intent
  if (!config.intents.includes(query.intent)) {
    errors.push(`Invalid intent: ${query.intent}`);
  }

  // Validate entities
  if (query.entities) {
    // Validate status values
    if (query.entities.status) {
      const invalidStatuses = query.entities.status.filter(
        (s) => !config.entities.status.includes(s),
      );
      if (invalidStatuses.length > 0) {
        errors.push(`Invalid status values: ${invalidStatuses.join(", ")}`);
      }
    }

    // Validate source values
    if (query.entities.source) {
      const invalidSources = query.entities.source.filter(
        (s) => !config.entities.source.includes(s),
      );
      if (invalidSources.length > 0) {
        errors.push(`Invalid source values: ${invalidSources.join(", ")}`);
      }
    }

    // Validate document types
    if (query.entities.documentType) {
      const invalidTypes = query.entities.documentType.filter(
        (t) => !config.entities.documentType.includes(t),
      );
      if (invalidTypes.length > 0) {
        errors.push(`Invalid document types: ${invalidTypes.join(", ")}`);
      }
    }

    // Validate date range
    if (query.entities.dateRange) {
      const start = new Date(query.entities.dateRange.start);
      const end = new Date(query.entities.dateRange.end);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.push("Invalid date range format");
      } else if (start > end) {
        errors.push("Start date must be before end date");
      } else if (end > new Date()) {
        // Allow future dates but warn
        // errors.push("End date cannot be in the future");
      }
    }

    // Validate confidence filter
    if (query.entities.confidence) {
      const { min, max } = config.constraints.confidence;
      if (
        query.entities.confidence.value < min ||
        query.entities.confidence.value > max
      ) {
        errors.push(`Confidence value must be between ${min} and ${max}`);
      }
    }

    // Validate limit
    if (query.entities.limit) {
      const { min, max } = config.constraints.limit;
      if (query.entities.limit < min || query.entities.limit > max) {
        errors.push(`Limit must be between ${min} and ${max}`);
      }
    }
  }

  // Validate aggregation
  if (query.aggregation) {
    if (!config.fields.aggregation.includes(query.aggregation.field)) {
      errors.push(`Invalid aggregation field: ${query.aggregation.field}`);
    }

    if (query.aggregation.groupBy) {
      if (!config.fields.groupBy.includes(query.aggregation.groupBy)) {
        errors.push(`Invalid groupBy field: ${query.aggregation.groupBy}`);
      }
    }
  }

  // Validate sorting
  if (query.sorting) {
    if (!config.fields.sorting.includes(query.sorting.field)) {
      errors.push(`Invalid sort field: ${query.sorting.field}`);
    }
  }

  // Intent-specific validation
  switch (query.intent) {
    case "aggregate":
      if (!query.aggregation) {
        errors.push("Aggregate intent requires aggregation configuration");
      }
      break;
    case "list":
    case "search":
      // These intents should have some filters or search terms
      if (
        !query.entities.searchTerm &&
        !query.entities.status &&
        !query.entities.source &&
        !query.entities.documentType &&
        !query.entities.vendor &&
        !query.entities.dateRange
      ) {
        // Allow but set a default limit
        if (!query.entities.limit) {
          query.entities.limit = config.constraints.limit.default;
        }
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
