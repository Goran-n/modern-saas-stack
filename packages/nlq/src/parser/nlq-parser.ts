import { createLogger } from "@figgy/utils";
import { AnthropicProvider } from "../llm/anthropic-provider";
import {
  type LLMProvider,
  NLQError,
  NLQErrorCodes,
  type ParsedQuery,
  type QueryContext,
  QueryIntent,
} from "../types";
import { validateParsedQuery } from "./validation";

const logger = createLogger("nlq-parser");

export class NLQParser {
  private provider: LLMProvider;

  constructor(provider?: LLMProvider) {
    this.provider = provider || new AnthropicProvider();
  }

  async parseQuery(query: string, context: QueryContext): Promise<ParsedQuery> {
    try {
      // Parse with LLM - let the LLM determine if it's a valid query
      const parsed = await this.provider.parseQuery(query, context);

      // Validate the parsed query
      const validation = await validateParsedQuery(parsed, context);
      if (!validation.valid) {
        throw new NLQError(
          `Invalid parsed query: ${validation.errors.join(", ")}`,
          NLQErrorCodes.VALIDATION_ERROR,
          validation.errors,
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof NLQError) {
        throw error;
      }

      logger.error("Failed to parse query", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        query,
        context,
        providerName: this.provider.name,
      });
      throw new NLQError(
        "Failed to parse query",
        NLQErrorCodes.PARSE_ERROR,
        error,
      );
    }
  }

  async isQuerySupported(query: string): Promise<boolean> {
    try {
      // Use LLM to check if query is supported
      // We'll attempt to parse it and check the intent
      const parsed = await this.provider.parseQuery(query);

      // If parsing succeeds and we get a valid intent (not unknown), it's supported
      return parsed.intent !== QueryIntent.UNKNOWN && parsed.confidence > 0.5;
    } catch {
      // If parsing fails, the query is not supported
      return false;
    }
  }
}
