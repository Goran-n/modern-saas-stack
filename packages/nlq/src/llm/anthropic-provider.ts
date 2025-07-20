import { createLogger, logError, logAndRethrow } from "@kibly/utils";
import { getPortkeyClient } from "@kibly/llm-utils";
import {
  NLQError,
  NLQErrorCodes,
  ParsedQuerySchema,
  type ParsedQuery,
  type QueryContext,
  type SummaryRequest,
} from "../types";
import { BaseLLMProvider } from "./provider";
import {
  FOLLOW_UP_SUGGESTIONS_PROMPT,
  QUERY_UNDERSTANDING_PROMPT,
  SUMMARY_GENERATION_PROMPT,
} from "./prompt-templates";

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
      this.model = process.env.NLQ_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
      
      logger.info("Anthropic provider initialized via Portkey", {
        model: this.model,
      });
    } catch (error) {
      logger.error("Failed to initialize Anthropic provider", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        model: process.env.NLQ_ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
      });
      throw new Error("Failed to initialize Anthropic provider: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async parseQuery(
    query: string,
    context?: QueryContext,
  ): Promise<ParsedQuery> {
    try {
      // Debug logging
      console.log("Parsing query with Anthropic:", query);
      
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
      const responseContent = response.choices[0]?.message?.content;
      console.log("Full Anthropic response:", responseContent);
      console.log("Response length:", responseContent?.length || 0, "characters");
      
      logger.info("Received Portkey response", {
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length,
        firstChoiceHasMessage: !!response.choices?.[0]?.message,
        firstChoiceHasContent: !!response.choices?.[0]?.message?.content,
        contentType: typeof response.choices?.[0]?.message?.content,
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new NLQError(
          "No response from Anthropic",
          NLQErrorCodes.LLM_ERROR,
        );
      }

      // Extract JSON from the response content (Anthropic may include extra text)
      let jsonString = content;
      let parsed;
      
      try {
        // First try parsing the whole content
        parsed = JSON.parse(content);
      } catch (error) {
        console.log("Initial JSON parse failed. Content:", content);
        console.log("Parse error:", error);
        
        // If that fails, try to extract just the JSON part
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log("Extracted JSON string:", jsonString);
          try {
            parsed = JSON.parse(jsonString);
          } catch (secondError) {
            console.log("Second JSON parse failed. Extracted string:", jsonString);
            console.log("Second parse error:", secondError);
            
            // Try to fix common JSON issues
            let fixedJson = jsonString.trim();
            
            // Count braces to see if we need to add closing braces
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            const missingBraces = openBraces - closeBraces;
            
            if (missingBraces > 0) {
              fixedJson += '}}'.repeat(missingBraces);
              console.log("Attempting to fix JSON with missing braces:", fixedJson);
              
              try {
                parsed = JSON.parse(fixedJson);
                console.log("Successfully parsed fixed JSON!");
              } catch (thirdError) {
                console.log("Failed to parse fixed JSON:", thirdError);
                throw new NLQError(
                  "No valid JSON found in response after attempted fixes",
                  NLQErrorCodes.LLM_ERROR,
                );
              }
            } else {
              throw new NLQError(
                "No valid JSON found in response",
                NLQErrorCodes.LLM_ERROR,
              );
            }
          }
        } else {
          throw new NLQError(
            "No valid JSON found in response",
            NLQErrorCodes.LLM_ERROR,
          );
        }
      }
      
      // Validate the response
      const validated = ParsedQuerySchema.parse(parsed);
      
      // The LLM should handle date parsing directly based on the current date provided in the prompt
      // No need for hardcoded date keyword detection

      logger.info("Query parsed successfully", { 
        intent: validated.intent,
        confidence: validated.confidence 
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
      
      const systemPrompt = SUMMARY_GENERATION_PROMPT
        .replace("{{query}}", JSON.stringify(query))
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
      if (!summary || typeof summary !== 'string') {
        throw new NLQError(
          "No summary generated",
          NLQErrorCodes.LLM_ERROR,
        );
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
      
      const prompt = FOLLOW_UP_SUGGESTIONS_PROMPT
        .replace("{{query}}", JSON.stringify(query))
        .replace("{{resultsSummary}}", resultsSummary);

      const response = await this.portkey.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
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