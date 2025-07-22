import {
  between,
  count,
  desc,
  documentExtractions,
  eq,
  files,
  ilike,
  inArray,
  or,
  type SQL,
  sql,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import type { ParsedQuery } from "../types";

const logger = createLogger("nlq-query-builder");

export class QueryBuilder {
  buildFilters(query: ParsedQuery, tenantId: string): SQL[] {
    const filters: SQL[] = [eq(files.tenantId, tenantId)];

    const { entities } = query;

    // Status filter
    if (entities.status && entities.status.length > 0) {
      filters.push(inArray(files.processingStatus, entities.status as any));
    }

    // Source filter
    if (entities.source && entities.source.length > 0) {
      filters.push(inArray(files.source, entities.source as any));
    }

    // Date range filter
    if (entities.dateRange) {
      filters.push(
        between(
          files.createdAt,
          new Date(entities.dateRange.start),
          new Date(entities.dateRange.end),
        ),
      );
    }

    // Search term (file name)
    if (entities.searchTerm) {
      filters.push(ilike(files.fileName, `%${entities.searchTerm}%`));
    }

    return filters;
  }

  buildDocumentFilters(query: ParsedQuery): SQL[] {
    const filters: SQL[] = [];
    const { entities } = query;

    // Document type filter
    if (entities.documentType && entities.documentType.length > 0) {
      filters.push(
        inArray(documentExtractions.documentType, entities.documentType as any),
      );
    }

    // Vendor filter (fuzzy match on company profile)
    if (entities.vendor) {
      // Search in both extracted vendor name and normalized name
      filters.push(
        or(
          ilike(
            sql`${documentExtractions.extractedFields}->>'vendorName'->>'value'`,
            `%${entities.vendor}%`,
          ),
          ilike(
            sql`${documentExtractions.companyProfile}->>'normalizedName'`,
            `%${entities.vendor}%`,
          ),
          ilike(
            sql`${documentExtractions.companyProfile}->>'legalName'`,
            `%${entities.vendor}%`,
          ),
        )!,
      );
    }

    // Confidence filter
    if (entities.confidence) {
      const { operator, value } = entities.confidence;
      switch (operator) {
        case "gt":
          filters.push(
            sql`${documentExtractions.overallConfidence}::numeric > ${value}`,
          );
          break;
        case "gte":
          filters.push(
            sql`${documentExtractions.overallConfidence}::numeric >= ${value}`,
          );
          break;
        case "lt":
          filters.push(
            sql`${documentExtractions.overallConfidence}::numeric < ${value}`,
          );
          break;
        case "lte":
          filters.push(
            sql`${documentExtractions.overallConfidence}::numeric <= ${value}`,
          );
          break;
        case "eq":
          filters.push(
            sql`${documentExtractions.overallConfidence}::numeric = ${value}`,
          );
          break;
      }
    }

    return filters;
  }

  getAggregationSQL(query: ParsedQuery): SQL | null {
    if (!query.aggregation) return null;

    const { type, field } = query.aggregation;

    switch (field) {
      case "totalAmount":
        return this.getAmountAggregation(type, "totalAmount");
      case "subtotalAmount":
        return this.getAmountAggregation(type, "subtotalAmount");
      case "taxAmount":
        return this.getAmountAggregation(type, "taxAmount");
      case "size":
        return this.getFileSizeAggregation(type);
      case "count":
        return count();
      default:
        logger.warn("Unknown aggregation field", { field });
        return null;
    }
  }

  private getAmountAggregation(type: string, field: string): SQL {
    const fieldPath = sql`${documentExtractions.extractedFields}->>'${sql.raw(field)}'->>'value'`;

    switch (type) {
      case "sum":
        return sql`COALESCE(SUM(CAST(${fieldPath} AS NUMERIC)), 0)`;
      case "avg":
        return sql`COALESCE(AVG(CAST(${fieldPath} AS NUMERIC)), 0)`;
      case "min":
        return sql`COALESCE(MIN(CAST(${fieldPath} AS NUMERIC)), 0)`;
      case "max":
        return sql`COALESCE(MAX(CAST(${fieldPath} AS NUMERIC)), 0)`;
      case "count":
        return sql`COUNT(CASE WHEN ${fieldPath} IS NOT NULL THEN 1 END)`;
      default:
        return sql`COALESCE(SUM(CAST(${fieldPath} AS NUMERIC)), 0)`;
    }
  }

  private getFileSizeAggregation(type: string): SQL {
    switch (type) {
      case "sum":
        return sql`COALESCE(SUM(${files.size}), 0)`;
      case "avg":
        return sql`COALESCE(AVG(${files.size}), 0)`;
      case "min":
        return sql`COALESCE(MIN(${files.size}), 0)`;
      case "max":
        return sql`COALESCE(MAX(${files.size}), 0)`;
      default:
        return sql`COALESCE(SUM(${files.size}), 0)`;
    }
  }

  getOrderBy(query: ParsedQuery): SQL[] {
    if (!query.sorting) {
      // Default sorting by created date
      return [desc(files.createdAt)];
    }

    const { field, order } = query.sorting;
    const orderFn = order === "desc" ? desc : (col: any) => col;

    let orderResult: SQL;
    switch (field) {
      case "createdAt":
        orderResult = orderFn(files.createdAt);
        break;
      case "updatedAt":
        orderResult = orderFn(files.updatedAt);
        break;
      case "size":
        orderResult = orderFn(files.size);
        break;
      case "fileName":
        orderResult = orderFn(files.fileName);
        break;
      case "confidence":
        orderResult = orderFn(documentExtractions.overallConfidence);
        break;
      case "totalAmount":
        orderResult = orderFn(
          sql`CAST(${documentExtractions.extractedFields}->>'totalAmount'->>'value' AS NUMERIC)`,
        );
        break;
      default:
        return orderFn(files.createdAt);
    }
    return [orderResult];
  }

  getLimit(query: ParsedQuery): number {
    return query.entities.limit || 20;
  }

  requiresJoinWithExtractions(query: ParsedQuery): boolean {
    // Check if we need to join with document_extractions table
    return !!(
      query.entities.documentType?.length ||
      query.entities.vendor ||
      query.entities.confidence ||
      (query.aggregation &&
        ["totalAmount", "subtotalAmount", "taxAmount"].includes(
          query.aggregation.field,
        )) ||
      (query.sorting &&
        ["confidence", "totalAmount"].includes(query.sorting.field))
    );
  }
}
