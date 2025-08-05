import type { FileAttachment } from "@microsoft/microsoft-graph-types";

/**
 * Options for building Microsoft Graph message queries
 */
export interface MessageQueryOptions {
  folder?: string;
  since?: Date;
  unreadOnly?: boolean;
  limit?: number;
  pageToken?: string;
  includeAttachments?: boolean;
}

/**
 * Microsoft Graph API error response
 */
export interface GraphError {
  statusCode: number;
  code: string;
  message: string;
  requestId: string | null;
  date: string;
  body: string;
  headers: Record<string, string>;
}

/**
 * Type guard for Graph API errors
 */
export function isGraphError(error: unknown): error is GraphError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Type guard for file attachments
 */
export function isFileAttachment(attachment: any): attachment is FileAttachment {
  return attachment?.["@odata.type"] === "#microsoft.graph.fileAttachment";
}

/**
 * Safe message query builder
 */
export class MessageQueryBuilder {
  private filters: string[] = [];
  private selectFields: string[] = [];
  private orderByClause?: string;
  private topValue?: number;
  private skipTokenValue?: string;

  /**
   * Add a filter condition
   */
  filter(condition: string): this {
    this.filters.push(condition);
    return this;
  }

  /**
   * Add date filter with proper formatting
   */
  filterByDate(field: 'receivedDateTime' | 'sentDateTime', operator: 'ge' | 'le' | 'gt' | 'lt', date: Date): this {
    // Format date properly for Graph API (no quotes, with Z suffix)
    const dateStr = date.toISOString();
    this.filters.push(`${field} ${operator} ${dateStr}`);
    return this;
  }

  /**
   * Filter by read status
   */
  filterByReadStatus(isRead: boolean): this {
    this.filters.push(`isRead eq ${isRead}`);
    return this;
  }

  /**
   * Select specific fields
   */
  select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * Order by a field (only if no date filter is present)
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'desc'): this {
    this.orderByClause = `${field} ${direction}`;
    return this;
  }

  /**
   * Limit results
   */
  top(limit: number): this {
    this.topValue = limit;
    return this;
  }

  /**
   * Set skip token for pagination
   */
  skipToken(token: string): this {
    this.skipTokenValue = token;
    return this;
  }

  /**
   * Build the query parameters
   */
  build(): Record<string, string> {
    const params: Record<string, string> = {};

    // Add filter if present
    if (this.filters.length > 0) {
      params.$filter = this.filters.join(' and ');
    }

    // Add select if present
    if (this.selectFields.length > 0) {
      params.$select = this.selectFields.join(',');
    }

    // Only add orderBy if we don't have a date filter (to avoid InefficientFilter)
    const hasDateFilter = this.filters.some(f => 
      f.includes('receivedDateTime') || f.includes('sentDateTime')
    );
    if (this.orderByClause && !hasDateFilter) {
      params.$orderby = this.orderByClause;
    }

    // Add top
    if (this.topValue) {
      params.$top = this.topValue.toString();
    }

    // Add skip token
    if (this.skipTokenValue) {
      params.$skiptoken = this.skipTokenValue;
    }

    return params;
  }
}