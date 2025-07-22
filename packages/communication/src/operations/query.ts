import {
  NLQParser,
  type ParsedQuery,
  type QueryContext,
  QueryExecutor,
  type QueryResult,
  type UnifiedResponse,
} from "@figgy/nlq";
import {
  and,
  communicationMessages,
  eq,
  type NewCommunicationMessage,
  type NewQueryAnalytic,
  queryAnalytics,
} from "@figgy/shared-db";
import { createLogger, logError } from "@figgy/utils";
import { getDb } from "../db";
import type { FormattedMessage } from "../response/formatters/base";
import { WhatsAppFormatter } from "../response/formatters/whatsapp";
import {
  type ResponseGeneratorOptions,
  UnifiedResponseGenerator,
} from "../response/unified-response";
import { ERROR_CODES, NLQError } from "../types/errors";

const logger = createLogger("communication-query");

let nlqParser: NLQParser | null = null;
let queryExecutor: QueryExecutor | null = null;
let responseGenerator: UnifiedResponseGenerator | null = null;
let whatsappFormatter: WhatsAppFormatter | null = null;

function getComponents() {
  if (!nlqParser) {
    nlqParser = new NLQParser();
    queryExecutor = new QueryExecutor();
    responseGenerator = new UnifiedResponseGenerator();
    whatsappFormatter = new WhatsAppFormatter();
  }
  return {
    nlqParser: nlqParser!,
    queryExecutor: queryExecutor!,
    responseGenerator: responseGenerator!,
    whatsappFormatter: whatsappFormatter!,
  };
}

/**
 * Process a natural language query
 */
export async function processNaturalQuery(
  query: string,
  tenantId: string,
  userId?: string,
  platform: "whatsapp" | "slack" = "whatsapp",
): Promise<{ response: UnifiedResponse; parsedQuery: ParsedQuery }> {
  const startTime = Date.now();

  try {
    logger.info("STEP 1: Starting natural language query processing", {
      query,
      tenantId,
      platform,
      userId,
    });

    // Create query context
    const context: QueryContext = {
      tenantId,
      ...(userId && { userId }),
      platform,
    };

    logger.info("STEP 2: Context created, getting components", { context });

    // Parse the query
    const { nlqParser: parser } = getComponents();

    logger.info("STEP 3: Components retrieved, starting parse", {
      hasParser: !!parser,
    });

    const parsedQuery = await parser.parseQuery(query, context);

    logger.info("STEP 4: Query parsed successfully", {
      intent: parsedQuery.intent,
      confidence: parsedQuery.confidence,
      entities: Object.keys(parsedQuery.entities),
      query: query.length > 100 ? query.substring(0, 100) + "..." : query,
    });

    // Handle conversational intents without database queries
    if (
      ["greeting", "casual", "financial", "help", "unknown"].includes(
        parsedQuery.intent,
      )
    ) {
      logger.info("STEP 5: Detected conversational intent - handling locally", {
        intent: parsedQuery.intent,
        confidence: parsedQuery.confidence,
        query: query.length > 50 ? query.substring(0, 50) + "..." : query,
      });

      const response = handleConversationalIntent(
        query,
        parsedQuery,
        platform,
        Date.now() - startTime,
      );

      logger.info("STEP 6: Conversational response generated successfully", {
        intent: parsedQuery.intent,
        hasResponseText: !!(response.metadata as any).responseText,
        responseLength: (response.metadata as any).responseText?.length || 0,
      });

      return { response, parsedQuery };
    }

    // Execute the query for file-related intents
    logger.info("Executing database query", {
      intent: parsedQuery.intent,
      tenantId,
      entityCount: Object.keys(parsedQuery.entities).length,
    });

    const db = getDb();
    const { queryExecutor: executor } = getComponents();
    const queryResult = await executor.execute(
      parsedQuery,
      db as any,
      tenantId,
    );

    logger.info("Database query executed", {
      intent: parsedQuery.intent,
      hasData: !!queryResult.data,
      dataLength: Array.isArray(queryResult.data)
        ? queryResult.data.length
        : queryResult.data
          ? 1
          : 0,
      hasError: !!queryResult.error,
    });

    // Generate unified response
    const responseOptions: ResponseGeneratorOptions = {
      platform,
      includeActions: true,
      includeSuggestions: true,
    };

    const { responseGenerator: generator } = getComponents();
    const response = generator.generateResponse(
      query,
      parsedQuery.intent,
      queryResult,
      responseOptions,
    );

    // Generate conversational response using LLM for file queries
    try {
      const { nlqParser: parser } = getComponents();
      // Access the LLM provider through the parser
      const llmResponse = await (parser as any).provider.generateSummary({
        query: parsedQuery,
        results: Array.isArray(queryResult.data)
          ? queryResult.data
          : [queryResult.data],
      });

      if (llmResponse) {
        // Add the LLM-generated response as responseText to bypass formatter templates
        (response.metadata as any).responseText = llmResponse;

        logger.info("LLM conversational response generated for file query", {
          intent: parsedQuery.intent,
          responseLength: llmResponse.length,
        });
      }
    } catch (llmError) {
      logger.warn(
        "Failed to generate LLM summary, falling back to structured response",
        {
          error: llmError instanceof Error ? llmError.message : llmError,
          intent: parsedQuery.intent,
        },
      );
      // Continue with structured response if LLM fails
    }

    // Track analytics
    await trackQueryAnalytics({
      parsedQuery,
      queryResult,
      response,
      executionTimeMs: Date.now() - startTime,
    });

    return { response, parsedQuery };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    // Convert to NLQError for better categorisation
    const nlqError = NLQError.fromError(error);

    logError(logger, "Failed to process natural language query", error, {
      nlqErrorCode: nlqError.code,
      nlqUserMessage: nlqError.userFriendlyMessage,
      query: query.length > 200 ? query.substring(0, 200) + "..." : query,
      tenantId,
      userId,
      platform,
      processingTimeMs,
      componentsInitialized: {
        parser: !!nlqParser,
        executor: !!queryExecutor,
        responseGenerator: !!responseGenerator,
      },
    });

    // Create meaningful error response - use responseText to bypass result formatting
    const errorResponseText = createErrorResponseText(nlqError);

    const errorResponse: UnifiedResponse = {
      query,
      intent: "unknown" as any,
      results: {
        type: "summary",
        data: null,
      },
      metadata: {
        processingTimeMs,
        confidence: 0,
        filtersApplied: [],
        queryId: `error-${Date.now()}`,
        responseText: errorResponseText,
        errorCode: nlqError.code,
        suggestions: nlqError.suggestions,
      } as any,
    };

    const errorParsedQuery: ParsedQuery = {
      intent: "unknown" as any,
      confidence: 0,
      entities: {},
    };

    return { response: errorResponse, parsedQuery: errorParsedQuery };
  }
}

/**
 * Check if a message is a natural language query
 */
export async function isNaturalQuery(content: string): Promise<boolean> {
  try {
    const { nlqParser: parser } = getComponents();
    return await parser.isQuerySupported(content);
  } catch (error) {
    logger.error("Failed to check if message is a query", error);
    return false;
  }
}

/**
 * Store a communication message
 */
export async function storeMessage(data: {
  messageId: string;
  platform: "whatsapp" | "slack";
  sender: string;
  content: string;
  tenantId: string;
  userId?: string;
}): Promise<string> {
  const db = getDb();

  try {
    // Always check for existing message first
    const existing = await db
      .select()
      .from(communicationMessages)
      .where(eq(communicationMessages.messageId, data.messageId))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      logger.info("Message already exists, returning existing ID", {
        messageId: data.messageId,
        existingId: existing[0].id,
      });
      return existing[0].id;
    }

    // Ensure content is never null or undefined
    if (!data.content || data.content.trim() === "") {
      logger.warn("storeMessage received empty content, using default", {
        messageId: data.messageId,
        platform: data.platform,
        sender: data.sender,
      });
      data.content = "[Empty message]";
    }

    logger.info("Storing new message", {
      messageId: data.messageId,
      platform: data.platform,
      sender: data.sender,
      contentLength: data.content.length,
      tenantId: data.tenantId,
      userId: data.userId,
    });

    // Check if this is a query (only for messages with actual content)
    const isQuery =
      data.content !== "[Empty message]" &&
      data.content !== "[Message with no text content]" &&
      !data.content.startsWith("Uploaded ") &&
      (await isNaturalQuery(data.content));

    const message: NewCommunicationMessage = {
      messageId: data.messageId,
      platform: data.platform,
      sender: data.sender,
      content: data.content,
      tenantId: data.tenantId,
      userId: data.userId,
      isQuery,
    };

    // Use atomic upsert to handle race conditions
    const result = await db
      .insert(communicationMessages)
      .values(message)
      .onConflictDoUpdate({
        target: communicationMessages.messageId,
        set: {
          // Update timestamp on conflict to show it was accessed again
          updatedAt: new Date(),
        },
      })
      .returning();

    const upserted = result[0];
    if (!upserted) {
      throw new Error("Failed to upsert message");
    }

    logger.info("Message stored successfully", {
      id: upserted.id,
      messageId: data.messageId,
      isQuery,
      wasExisting: upserted.createdAt.getTime() < Date.now() - 1000, // Check if this was an existing record
    });

    return upserted.id;
  } catch (error) {
    logger.error("Failed to store message", {
      error: error instanceof Error ? error.message : error,
      messageId: data.messageId,
      platform: data.platform,
    });

    throw error;
  }
}

/**
 * Update message with query results
 */
export async function updateMessageWithQueryResult(
  messageId: string,
  parsedQuery: ParsedQuery,
  response: UnifiedResponse,
  processingTimeMs: number,
): Promise<void> {
  try {
    const db = getDb();

    await db
      .update(communicationMessages)
      .set({
        parsedQuery: parsedQuery as any,
        queryConfidence: parsedQuery.confidence.toString(),
        response: response as any,
        processingTimeMs: Math.round(processingTimeMs) as any,
        updatedAt: new Date(),
      })
      .where(eq(communicationMessages.id, messageId));

    logger.info("Message updated with query result", { messageId });
  } catch (error) {
    logger.error("Failed to update message with query result", {
      error: error instanceof Error ? error.message : error,
      messageId,
      parsedQuery,
      response,
      processingTimeMs,
    });
  }
}

/**
 * Track query analytics
 */
async function trackQueryAnalytics(data: {
  parsedQuery: ParsedQuery;
  queryResult: QueryResult;
  response: UnifiedResponse;
  executionTimeMs: number;
  messageId?: string | undefined;
}): Promise<void> {
  try {
    const db = getDb();

    if (!data.messageId) {
      // Skip analytics if no messageId
      return;
    }

    const analytics: NewQueryAnalytic = {
      messageId: data.messageId,
      intent: data.parsedQuery.intent,
      entities: data.parsedQuery.entities as any,
      executionTimeMs: data.executionTimeMs,
      resultCount: Array.isArray(data.queryResult.data)
        ? data.queryResult.data.length
        : data.queryResult.data
          ? 1
          : 0,
      error: data.queryResult.error,
      llmTokensUsed: 0, // TODO: Track actual token usage
    };

    await db.insert(queryAnalytics).values(analytics);

    logger.info("Query analytics tracked", {
      intent: analytics.intent,
      executionTimeMs: analytics.executionTimeMs,
    });
  } catch (error) {
    logger.error("Failed to track query analytics", error);
    // Don't throw - analytics is not critical
  }
}

/**
 * Format response for WhatsApp
 */
export function formatResponseForWhatsApp(
  response: UnifiedResponse,
): FormattedMessage {
  const { whatsappFormatter: formatter } = getComponents();
  return formatter.format(response);
}

/**
 * Get recent queries for a tenant
 */
export async function getRecentQueries(
  tenantId: string,
  limit = 10,
): Promise<
  Array<{
    id: string;
    content: string;
    intent: string;
    confidence: number;
    resultCount: number;
    createdAt: Date;
  }>
> {
  try {
    const db = getDb();

    const results = await db
      .select({
        id: communicationMessages.id,
        content: communicationMessages.content,
        parsedQuery: communicationMessages.parsedQuery,
        confidence: communicationMessages.queryConfidence,
        createdAt: communicationMessages.createdAt,
        analytics: queryAnalytics,
      })
      .from(communicationMessages)
      .leftJoin(
        queryAnalytics,
        eq(communicationMessages.id, queryAnalytics.messageId),
      )
      .where(
        and(
          eq(communicationMessages.tenantId, tenantId),
          eq(communicationMessages.isQuery, true),
        ),
      )
      .orderBy(communicationMessages.createdAt)
      .limit(limit);

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      intent: (r.parsedQuery as any)?.intent || "unknown",
      confidence: Number(r.confidence) || 0,
      resultCount: r.analytics?.resultCount || 0,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    logger.error("Failed to get recent queries", error);
    return [];
  }
}

/**
 * Create error response text for WhatsApp
 */
function createErrorResponseText(nlqError: NLQError): string {
  let responseText = `❌ ${nlqError.userFriendlyMessage}`;

  if (nlqError.suggestions && nlqError.suggestions.length > 0) {
    responseText += "\n\n💡 *Suggestions:*";
    nlqError.suggestions.forEach((suggestion) => {
      responseText += `\n• ${suggestion}`;
    });
  }

  // Add helpful examples based on error type
  if (
    nlqError.code === ERROR_CODES.NLQ_PARSING_FAILED ||
    nlqError.code === ERROR_CODES.NLQ_INVALID_QUERY
  ) {
    responseText += "\n\n*Example questions:*";
    responseText += "\n• How many files do I have?";
    responseText += "\n• Show me invoices from this month";
    responseText += "\n• List pending documents";
  }

  return responseText;
}

/**
 * Handle conversational intents with predefined responses
 */
function handleConversationalIntent(
  query: string,
  parsedQuery: ParsedQuery,
  _platform: "whatsapp" | "slack",
  processingTimeMs: number,
): UnifiedResponse {
  logger.info("CONVERSATIONAL HANDLER: Starting", {
    intent: parsedQuery.intent,
    query,
    confidence: parsedQuery.confidence,
  });

  let responseText: string;

  switch (parsedQuery.intent) {
    case "greeting":
      responseText =
        "Hi there! I'm here to help you manage your files and documents. You can ask me things like 'How many unprocessed files do I have?' or 'Show me invoices from this month'.";
      logger.info("CONVERSATIONAL HANDLER: Greeting response prepared", {
        responseLength: responseText.length,
      });
      break;

    case "help":
      responseText =
        "I can help you find and manage your documents! Try asking me:\n\n• How many files are pending?\n• Show me invoices from OpenAI\n• What's the total of my receipts this month?\n• List failed file uploads\n\nWhat would you like to know?";
      break;

    case "casual":
      responseText =
        "I'm designed to help with your files and documents. Is there something specific you'd like to find or check on your files?";
      break;

    case "financial":
      if (parsedQuery.entities.vendor) {
        responseText = `I can help you find financial documents! Try asking "Show me invoices from ${parsedQuery.entities.vendor}" or "List receipts from ${parsedQuery.entities.vendor}".`;
      } else {
        responseText =
          "I can help you find financial documents like invoices and receipts. Try asking for specific vendors or date ranges, like 'Show me invoices from this month'.";
      }
      break;

    case "unknown":
    default:
      responseText =
        "I'm not sure I understand. I can help you find files, check document status, or search for invoices and receipts. What would you like to look for?";
      break;
  }

  const response: UnifiedResponse = {
    query,
    intent: parsedQuery.intent as any,
    results: {
      type: "summary" as const,
      data: null,
    },
    metadata: {
      processingTimeMs,
      confidence: parsedQuery.confidence,
      filtersApplied: [],
      queryId: `conv-${Date.now()}`,
      ...(responseText && { responseText }),
    } as any,
  };

  logger.info("CONVERSATIONAL HANDLER: Response created successfully", {
    intent: parsedQuery.intent,
    hasResponseText: !!responseText,
    responseLength: responseText?.length || 0,
    queryId: response.metadata.queryId,
  });

  return response;
}
