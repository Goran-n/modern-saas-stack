import { logger } from "@kibly/utils";
import { z } from "zod";
import { DOCUMENT_TYPES } from "../constants";
import { documentClassificationPrompt } from "../prompts";
import { type DocumentType, documentTypeEnum } from "../types";

export class DocumentClassifier {
  constructor(private portkey: any) {}

  async classify(
    text: string,
  ): Promise<{ type: DocumentType; confidence: number }> {
    const schema = z.object({
      documentType: documentTypeEnum,
      confidence: z.number().min(0).max(100),
    });

    const completion = await this.portkey.chat.completions.create({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "system", content: documentClassificationPrompt },
        { role: "user", content: text },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_document",
            description: "Classify the document type and confidence",
            parameters: {
              type: "object",
              properties: {
                documentType: {
                  type: "string",
                  enum: [...DOCUMENT_TYPES],
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                },
              },
              required: ["documentType", "confidence"],
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "classify_document" },
      },
      max_tokens: 256,
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function) {
      throw new Error("No tool call in response");
    }

    const args = JSON.parse(toolCall.function.arguments);
    const parsed = schema.parse(args);

    logger.info("Document classified", {
      type: parsed.documentType,
      confidence: parsed.confidence,
    });

    return {
      type: parsed.documentType,
      confidence: parsed.confidence,
    };
  }
}
