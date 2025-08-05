import { getPortkeyClient } from "@figgy/config";
import { createLogger, logAndRethrow, logError } from "@figgy/utils";
import {
  NLQError,
  NLQErrorCodes,
  type ParsedQuery,
  ParsedQuerySchema,
  type QueryContext,
  type SummaryRequest,
} from "../types";
import {
  FOLLOW_UP_SUGGESTIONS_PROMPT,
  QUERY_UNDERSTANDING_PROMPT,
  SUMMARY_GENERATION_PROMPT,
} from "./prompt-templates";
import { BaseLLMProvider } from "./provider";

const logger = createLogger("nlq-anthropic");

export class AnthropicProvider extends BaseLLMProvider {
  name = "anthropic";
  private portkey;
  private model: string;

  constructor() {
    super();

    try {
      // Use shared Portkey client
      this.portkey = getPortkeyClient();
      this.model =
        process.env.NLQ_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

      logger.info("Anthropic provider initialized via Portkey", {
        model: this.model,
      });
    } catch (error) {
      logger.error("Failed to initialize Anthropic provider", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        model: process.env.NLQ_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
      });
      throw new Error(
        "Failed to initialize Anthropic provider: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  }

  async parseQuery(
    query: string,
    context?: QueryContext,
  ): Promise<ParsedQuery> {
    try {
      // Debug logging
      // Parsing query with Anthropic

      logger.info("Parsing query with Anthropic", { query, context });

      const currentDate = this.getCurrentDate(context?.timezone);
      const systemPrompt = QUERY_UNDERSTANDING_PROMPT.replace(
        "{{currentDate}}",
        currentDate,
      );

      // Use Portkey client like OpenAI SDK - it handles routing to Anthropic
      logger.info("Making Portkey request", {
        model: this.model,
        systemPromptLength: systemPrompt.length,
        queryLength: query.length,
      });

      const response = await this.portkey.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      // Debug: Log full response content for debugging
      // const responseContent = response.choices[0]?.message?.content;
      // Full Anthropic response
      // Response length

      logger.info("Received Portkey response", {
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length,
        firstChoiceHasMessage: !!response.choices?.[0]?.message,
        firstChoiceHasContent: !!response.choices?.[0]?.message?.content,
        contentType: typeof response.choices?.[0]?.message?.content,
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new NLQError(
          "No response from Anthropic",
          NLQErrorCodes.LLM_ERROR,
        );
      }

      // Extract JSON from the response content (Anthropic may include extra text)
      let parsed;

      try {
        // First try parsing the whole content
        parsed = JSON.parse(content);
      } catch (_error) {
        logger.debug("Initial JSON parse failed, attempting extraction", {
          contentLength: content.length,
          contentPreview: content.substring(0, 200),
        });

        // Try multiple extraction methods
        let jsonString: string | null = null;

        // Method 1: Look for JSON between first { and last }
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = content.substring(firstBrace, lastBrace + 1);
          logger.debug("Extracted JSON using brace positions", {
            jsonLength: jsonString.length,
            jsonPreview: jsonString.substring(0, 100),
          });
        }

        // Method 2: Try regex that properly handles multiline JSON
        if (!jsonString) {
          const jsonMatch = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
            logger.debug("Extracted JSON using regex", {
              jsonLength: jsonString.length,
            });
          }
        }

        if (jsonString) {
          try {
            parsed = JSON.parse(jsonString);
            logger.debug("Successfully parsed extracted JSON");
          } catch (parseError) {
            logger.error("Failed to parse extracted JSON", {
              jsonString,
              error:
                parseError instanceof Error ? parseError.message : parseError,
            });

            // Last resort: try to clean up the JSON
            try {
              // Remove any trailing commas before closing braces/brackets
              const cleanedJson = jsonString
                .replace(/,\s*}/g, "}")
                .replace(/,\s*]/g, "]")
                .trim();

              parsed = JSON.parse(cleanedJson);
              logger.debug("Successfully parsed cleaned JSON");
            } catch (_finalError) {
              throw new NLQError(
                "Failed to parse JSON response from LLM",
                NLQErrorCodes.LLM_ERROR,
                { originalContent: content.substring(0, 500) },
              );
            }
          }
        } else {
          throw new NLQError(
            "No JSON found in LLM response",
            NLQErrorCodes.LLM_ERROR,
            { originalContent: content.substring(0, 500) },
          );
        }
      }

      // Validate the response
      const validated = ParsedQuerySchema.parse(parsed);

      // The LLM should handle date parsing directly based on the current date provided in the prompt
      // No need for hardcoded date keyword detection

      logger.info("Query parsed successfully", {
        intent: validated.intent,
        confidence: validated.confidence,
      });

      return validated;
    } catch (error) {
      if (error instanceof NLQError) {
        throw error;
      }

      logAndRethrow(logger, "Failed to parse query", error, {
        query,
        context,
        model: this.model,
      });
    }
  }

  async generateSummary(data: SummaryRequest): Promise<string> {
    try {
      const { query, results } = data;

      const systemPrompt = SUMMARY_GENERATION_PROMPT.replace(
        "{{query}}",
        JSON.stringify(query),
      )
        .replace("{{intent}}", query.intent)
        .replace("{{resultCount}}", results.length.toString())
        .replace("{{platform}}", "whatsapp"); // Default to WhatsApp for MVP

      const response = await this.portkey.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(results.slice(0, 10)) }, // Limit results for context
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary || typeof summary !== "string") {
        throw new NLQError("No summary generated", NLQErrorCodes.LLM_ERROR);
      }

      return summary;
    } catch (error) {
      logError(logger, "Failed to generate summary", error, {
        queryIntent: data.query.intent,
        resultsCount: data.results.length,
        model: this.model,
      });
      throw new NLQError(
        "Failed to generate summary",
        NLQErrorCodes.LLM_ERROR,
        error,
      );
    }
  }

  async generateFollowUp(
    query: ParsedQuery,
    results: any[],
  ): Promise<string[]> {
    try {
      const resultsSummary = `Found ${results.length} results for ${query.intent} query`;

      const prompt = FOLLOW_UP_SUGGESTIONS_PROMPT.replace(
        "{{query}}",
        JSON.stringify(query),
      ).replace("{{resultsSummary}}", resultsSummary);

      const response = await this.portkey.chat.completions.create({
        model: this.model,
        messages: [{ role: "system", content: prompt }],
        temperature: 0.5,
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        return [];
      }

      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : parsed.suggestions || [];
    } catch (error) {
      logger.error("Failed to generate follow-up suggestions", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        query,
        resultsCount: results.length,
      });
      // Don't throw, just return empty suggestions
      return [];
    }
  }
}
