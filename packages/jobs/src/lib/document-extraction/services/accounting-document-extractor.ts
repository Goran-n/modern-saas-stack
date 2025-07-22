import type { ExtractedFields } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { PROCESSING_CONFIG } from "../constants";
import { accountingDocumentPrompt } from "../prompts";

export interface AccountingExtractionResult {
  fields: ExtractedFields;
  lineItems: any[];
  overallConfidence: number;
}

export class AccountingDocumentExtractor {
  constructor(private portkey: any) {}

  async extract(text: string): Promise<AccountingExtractionResult> {
    try {
      const completion = await this.portkey.chat.completions.create({
        model: PROCESSING_CONFIG.MODEL_NAME,
        messages: [
          {
            role: "system",
            content:
              accountingDocumentPrompt +
              "\n\nIMPORTANT: Your response must be valid JSON only, with no additional text or markdown formatting.",
          },
          { role: "user", content: text },
        ],
        max_tokens: PROCESSING_CONFIG.MAX_TOKENS,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      logger.info("Raw AI response for accounting document", {
        contentLength: content.length,
        first500:
          typeof content === "string"
            ? content.substring(0, 500)
            : "Non-string content",
      });

      // Clean the response in case it has markdown or extra text
      const jsonMatch =
        typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
      if (!jsonMatch) {
        logger.error("No valid JSON found in AI response", {
          content: typeof content === "string" ? content : "Non-string content",
        });
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      logger.info("Parsed JSON", {
        keys: Object.keys(parsed),
        keysLength: Object.keys(parsed).length,
      });

      // Build structured fields directly
      const fields: ExtractedFields = {};

      if (parsed.fields) {
        Object.entries(parsed.fields).forEach(
          ([fieldName, fieldData]: [string, any]) => {
            fields[fieldName] = {
              value: fieldData.value,
              confidence: fieldData.confidence || 0,
              source: "ai_extraction",
            };
          },
        );
      }

      // Handle line items
      const lineItems = Array.isArray(parsed.lineItems)
        ? parsed.lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            taxAmount: item.taxAmount,
          }))
        : [];

      return {
        fields,
        lineItems,
        overallConfidence: parsed.overallConfidence || 0,
      };
    } catch (error) {
      logger.error("Failed to extract accounting document", { error });
      throw error;
    }
  }
}
