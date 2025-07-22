import {
  and,
  count,
  documentExtractions,
  eq,
  files,
  type PostgresJsDatabase,
  sql,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import {
  NLQError,
  NLQErrorCodes,
  type ParsedQuery,
  type QueryResult,
} from "../types";
import { QueryBuilder } from "./query-builder";

const logger = createLogger("nlq-query-executor");

export class QueryExecutor {
  private queryBuilder: QueryBuilder;

  constructor() {
    this.queryBuilder = new QueryBuilder();
  }

  async execute(
    query: ParsedQuery,
    db: PostgresJsDatabase,
    tenantId: string,
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      let result: any;
      let totalCount: number | undefined;

      switch (query.intent) {
        case "count":
          result = await this.executeCountQuery(query, db, tenantId);
          break;
        case "list":
        case "search": {
          const listResult = await this.executeListQuery(query, db, tenantId);
          result = listResult.items;
          totalCount = listResult.total;
          break;
        }
        case "aggregate":
          result = await this.executeAggregateQuery(query, db, tenantId);
          break;
        case "status":
          result = await this.executeStatusQuery(query, db, tenantId);
          break;
        default:
          throw new NLQError(
            `Unsupported query intent: ${query.intent}`,
            NLQErrorCodes.EXECUTION_ERROR,
          );
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          ...(totalCount !== undefined && { totalCount }),
          executionTimeMs,
          confidence: query.confidence,
        },
      };
    } catch (error) {
      logger.error("Query execution failed", error);

      const executionTimeMs = Date.now() - startTime;

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Query execution failed",
        metadata: {
          executionTimeMs,
          confidence: query.confidence,
        },
      };
    }
  }

  private async executeCountQuery(
    query: ParsedQuery,
    db: PostgresJsDatabase,
    tenantId: string,
  ): Promise<number> {
    const filters = this.queryBuilder.buildFilters(query, tenantId);
    const requiresJoin = this.queryBuilder.requiresJoinWithExtractions(query);

    if (requiresJoin) {
      const docFilters = this.queryBuilder.buildDocumentFilters(query);
      const [result] = await db
        .select({ count: count() })
        .from(files)
        .leftJoin(documentExtractions, eq(files.id, documentExtractions.fileId))
        .where(and(...filters, ...docFilters));

      return result?.count || 0;
    } else {
      const [result] = await db
        .select({ count: count() })
        .from(files)
        .where(and(...filters));

      return result?.count || 0;
    }
  }

  private async executeListQuery(
    query: ParsedQuery,
    db: PostgresJsDatabase,
    tenantId: string,
  ): Promise<{ items: any[]; total: number }> {
    const filters = this.queryBuilder.buildFilters(query, tenantId);
    const requiresJoin = this.queryBuilder.requiresJoinWithExtractions(query);
    const limit = this.queryBuilder.getLimit(query);
    const orderBy = this.queryBuilder.getOrderBy(query);

    if (requiresJoin) {
      const docFilters = this.queryBuilder.buildDocumentFilters(query);

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(files)
        .leftJoin(documentExtractions, eq(files.id, documentExtractions.fileId))
        .where(and(...filters, ...docFilters));

      const total = countResult?.count || 0;

      // Get items
      const items = await db
        .select({
          file: files,
          extraction: documentExtractions,
        })
        .from(files)
        .leftJoin(documentExtractions, eq(files.id, documentExtractions.fileId))
        .where(and(...filters, ...docFilters))
        .orderBy(...orderBy)
        .limit(limit);

      return { items, total };
    } else {
      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(files)
        .where(and(...filters));

      const total = countResult?.count || 0;

      // Get items
      const items = await db
        .select()
        .from(files)
        .where(and(...filters))
        .orderBy(...orderBy)
        .limit(limit);

      return { items, total };
    }
  }

  private async executeAggregateQuery(
    query: ParsedQuery,
    db: PostgresJsDatabase,
    tenantId: string,
  ): Promise<any> {
    if (!query.aggregation) {
      throw new NLQError(
        "Aggregation query requires aggregation configuration",
        NLQErrorCodes.EXECUTION_ERROR,
      );
    }

    const filters = this.queryBuilder.buildFilters(query, tenantId);
    const aggregationSQL = this.queryBuilder.getAggregationSQL(query);

    if (!aggregationSQL) {
      throw new NLQError(
        "Invalid aggregation configuration",
        NLQErrorCodes.EXECUTION_ERROR,
      );
    }

    const requiresJoin = this.queryBuilder.requiresJoinWithExtractions(query);

    if (requiresJoin) {
      const docFilters = this.queryBuilder.buildDocumentFilters(query);

      if (query.aggregation.groupBy) {
        // Group by query
        const groupByField = this.getGroupByField(query.aggregation.groupBy);

        const results = await db
          .select({
            group: groupByField,
            value: aggregationSQL,
          })
          .from(files)
          .leftJoin(
            documentExtractions,
            eq(files.id, documentExtractions.fileId),
          )
          .where(and(...filters, ...docFilters))
          .groupBy(groupByField);

        return results;
      } else {
        // Simple aggregation
        const [result] = await db
          .select({ value: aggregationSQL })
          .from(files)
          .leftJoin(
            documentExtractions,
            eq(files.id, documentExtractions.fileId),
          )
          .where(and(...filters, ...docFilters));

        return result?.value || 0;
      }
    } else {
      if (query.aggregation.groupBy) {
        // Group by query without extraction join
        const groupByField = this.getGroupByField(query.aggregation.groupBy);

        const results = await db
          .select({
            group: groupByField,
            value: aggregationSQL,
          })
          .from(files)
          .where(and(...filters))
          .groupBy(groupByField);

        return results;
      } else {
        // Simple aggregation without extraction join
        const [result] = await db
          .select({ value: aggregationSQL })
          .from(files)
          .where(and(...filters));

        return result?.value || 0;
      }
    }
  }

  private async executeStatusQuery(
    _query: ParsedQuery,
    db: PostgresJsDatabase,
    tenantId: string,
  ): Promise<any> {
    // Status query returns a summary of files by status
    const results = await db
      .select({
        status: files.processingStatus,
        count: count(),
      })
      .from(files)
      .where(eq(files.tenantId, tenantId))
      .groupBy(files.processingStatus);

    return results;
  }

  private getGroupByField(field: string): any {
    switch (field) {
      case "status":
        return files.processingStatus;
      case "source":
        return files.source;
      case "documentType":
        return documentExtractions.documentType;
      case "date":
        return sql`DATE(${files.createdAt})`;
      default:
        return files.processingStatus;
    }
  }
}
