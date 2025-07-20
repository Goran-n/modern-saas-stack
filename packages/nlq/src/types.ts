import { z } from "zod";

// Query intent types
export enum QueryIntent {
  COUNT = "count",
  LIST = "list",
  SEARCH = "search",
  AGGREGATE = "aggregate",
  STATUS = "status",
  GREETING = "greeting",
  CASUAL = "casual", 
  FINANCIAL = "financial",
  HELP = "help",
  UNKNOWN = "unknown",
}

// Entity schemas
export const DateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const ConfidenceFilterSchema = z.object({
  operator: z.enum(["gt", "lt", "eq", "gte", "lte"]),
  value: z.number().min(0).max(1),
});

export const AggregationSchema = z.object({
  type: z.enum(["sum", "avg", "min", "max", "count"]),
  field: z.string(),
  groupBy: z.string().optional(),
});

export const SortingSchema = z.object({
  field: z.string(),
  order: z.enum(["asc", "desc"]),
});

// Main parsed query schema
export const ParsedQuerySchema = z.object({
  intent: z.nativeEnum(QueryIntent),
  entities: z.object({
    status: z.array(z.string()).optional(),
    source: z.array(z.string()).optional(),
    documentType: z.array(z.string()).optional(),
    dateRange: DateRangeSchema.optional(),
    vendor: z.string().optional(),
    confidence: ConfidenceFilterSchema.optional(),
    limit: z.number().min(1).max(100).optional(),
    searchTerm: z.string().optional(),
  }),
  aggregation: AggregationSchema.optional(),
  sorting: SortingSchema.optional(),
  confidence: z.number().min(0).max(1),
});

export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type ConfidenceFilter = z.infer<typeof ConfidenceFilterSchema>;
export type Aggregation = z.infer<typeof AggregationSchema>;
export type Sorting = z.infer<typeof SortingSchema>;

// Query context for enhanced parsing
export interface QueryContext {
  tenantId: string;
  userId?: string;
  platform: "whatsapp" | "slack" | "api";
  previousQueries?: ParsedQuery[];
  timezone?: string;
}

// LLM provider interface
export interface LLMProvider {
  name: string;
  parseQuery(
    query: string,
    context?: QueryContext,
  ): Promise<ParsedQuery>;
  generateSummary(
    data: SummaryRequest,
  ): Promise<string>;
  generateFollowUp(
    query: ParsedQuery,
    results: any[],
  ): Promise<string[]>;
}

// Summary request for response generation
export interface SummaryRequest {
  query: ParsedQuery;
  results: any[];
  template?: string;
  maxLength?: number;
}

// Query result structure
export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    totalCount?: number;
    executionTimeMs: number;
    cacheHit?: boolean;
    confidence: number;
  };
}

// Unified response structure
export interface UnifiedResponse {
  query: string;
  intent: QueryIntent;
  results: {
    type: "count" | "list" | "aggregate" | "summary";
    data: any;
    visualization?: {
      type: "number" | "list" | "chart";
      config?: any;
    };
  };
  metadata: {
    processingTimeMs: number;
    confidence: number;
    filtersApplied: string[];
    queryId: string;
  };
  suggestions?: string[];
  actions?: ResponseAction[];
}

export interface ResponseAction {
  label: string;
  action: string;
  data?: any;
}

// Error types
export class NLQError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = "NLQError";
  }
}

export const NLQErrorCodes = {
  PARSE_ERROR: "NLQ_PARSE_ERROR",
  LLM_ERROR: "NLQ_LLM_ERROR",
  VALIDATION_ERROR: "NLQ_VALIDATION_ERROR",
  EXECUTION_ERROR: "NLQ_EXECUTION_ERROR",
  PERMISSION_ERROR: "NLQ_PERMISSION_ERROR",
} as const;