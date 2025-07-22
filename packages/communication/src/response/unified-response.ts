import {
  QueryIntent,
  type QueryResult,
  type UnifiedResponse,
} from "@figgy/nlq";
import { createLogger } from "@figgy/utils";
import { v4 as uuidv4 } from "uuid";

const logger = createLogger("unified-response");

export interface ResponseGeneratorOptions {
  platform: "whatsapp" | "slack" | "api";
  locale?: string;
  includeActions?: boolean;
  includeSuggestions?: boolean;
}

export class UnifiedResponseGenerator {
  generateResponse(
    query: string,
    intent: QueryIntent,
    result: QueryResult,
    options: ResponseGeneratorOptions,
  ): UnifiedResponse {
    const startTime = Date.now();

    try {
      // Determine result type based on intent
      const resultType = this.getResultType(intent);

      // Build visualization hints
      const visualization = this.getVisualizationHints(intent, result);

      // Generate filter descriptions
      const filtersApplied: string[] = [];

      // Build the response
      const response: UnifiedResponse = {
        query,
        intent,
        results: {
          type: resultType,
          data: result.data,
          ...(visualization && { visualization }),
        },
        metadata: {
          processingTimeMs:
            Date.now() - startTime + (result.metadata.executionTimeMs || 0),
          confidence: result.metadata.confidence,
          filtersApplied,
          queryId: uuidv4(),
        },
      };

      // Add suggestions if requested
      if (options.includeSuggestions) {
        const suggestions = this.generateSuggestions(intent, result);
        if (suggestions.length > 0) {
          response.suggestions = suggestions;
        }
      }

      // Add actions if requested
      if (options.includeActions) {
        const actions = this.generateActions(intent, result, options.platform);
        if (actions && actions.length > 0) {
          response.actions = actions;
        }
      }

      return response;
    } catch (error) {
      logger.error("Failed to generate unified response", error);

      // Return error response
      return {
        query,
        intent,
        results: {
          type: "summary",
          data: null,
        },
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 0,
          filtersApplied: [],
          queryId: uuidv4(),
        },
      };
    }
  }

  private getResultType(
    intent: QueryIntent,
  ): "count" | "list" | "aggregate" | "summary" {
    switch (intent) {
      case QueryIntent.COUNT:
        return "count";
      case QueryIntent.LIST:
      case QueryIntent.SEARCH:
        return "list";
      case QueryIntent.AGGREGATE:
        return "aggregate";
      case QueryIntent.STATUS:
        return "summary";
      default:
        return "summary";
    }
  }

  private getVisualizationHints(
    intent: QueryIntent,
    result: QueryResult,
  ): UnifiedResponse["results"]["visualization"] | undefined {
    switch (intent) {
      case QueryIntent.COUNT:
        return {
          type: "number",
          config: {
            value: result.data,
            label: "Files",
          },
        };

      case QueryIntent.LIST:
      case QueryIntent.SEARCH:
        return {
          type: "list",
          config: {
            columns: ["fileName", "status", "createdAt"],
            pageSize: 10,
          },
        };

      case QueryIntent.AGGREGATE:
        if (Array.isArray(result.data)) {
          return {
            type: "chart",
            config: {
              chartType: "bar",
              data: result.data,
            },
          };
        }
        return {
          type: "number",
          config: {
            value: result.data,
            label: "Total",
          },
        };

      case QueryIntent.STATUS:
        return {
          type: "chart",
          config: {
            chartType: "pie",
            data: result.data,
          },
        };

      default:
        return undefined;
    }
  }

  private generateSuggestions(
    intent: QueryIntent,
    result: QueryResult,
  ): string[] {
    const suggestions: string[] = [];

    switch (intent) {
      case QueryIntent.COUNT:
        suggestions.push("Show me the list of these files");
        suggestions.push("Which files failed processing?");
        break;

      case QueryIntent.LIST:
        if (result.metadata.totalCount && result.metadata.totalCount > 20) {
          suggestions.push("Show me the next page");
        }
        suggestions.push("Filter by failed status");
        suggestions.push("Show only invoices");
        break;

      case QueryIntent.SEARCH:
        suggestions.push("Narrow down by date");
        suggestions.push("Show high confidence results only");
        break;

      case QueryIntent.AGGREGATE:
        suggestions.push("Break down by vendor");
        suggestions.push("Show monthly trend");
        break;

      case QueryIntent.STATUS:
        suggestions.push("Show failed files");
        suggestions.push("Retry failed processing");
        break;
    }

    return suggestions;
  }

  private generateActions(
    intent: QueryIntent,
    result: QueryResult,
    platform: string,
  ): UnifiedResponse["actions"] {
    const actions: UnifiedResponse["actions"] = [];

    switch (intent) {
      case QueryIntent.LIST:
      case QueryIntent.SEARCH:
        if (Array.isArray(result.data) && result.data.length > 0) {
          actions.push({
            label: "View details",
            action: "view_file",
            data: { fileId: result.data[0].id },
          });

          if (result.data.length > 1) {
            actions.push({
              label: "Export list",
              action: "export_list",
              data: { format: "csv" },
            });
          }
        }
        break;

      case QueryIntent.COUNT:
        if (result.data > 0) {
          actions.push({
            label: "Show list",
            action: "show_list",
          });
        }
        break;

      case QueryIntent.STATUS: {
        const failedStatus = result.data?.find(
          (s: any) => s.status === "failed",
        );
        if (failedStatus && failedStatus.count > 0) {
          actions.push({
            label: "Retry failed",
            action: "retry_failed",
          });
        }
        break;
      }
    }

    // Platform-specific actions
    if (platform === "whatsapp") {
      actions.push({
        label: "Help",
        action: "show_help",
      });
    }

    return actions;
  }
}
