/**
 * Communication package error types
 */

export enum ERROR_CODES {
  INVALID_PAYLOAD = "INVALID_PAYLOAD",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  PROCESSING_FAILED = "PROCESSING_FAILED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  TENANT_NOT_FOUND = "TENANT_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  // NLQ specific errors
  NLQ_PARSING_FAILED = "NLQ_PARSING_FAILED",
  NLQ_EXECUTION_FAILED = "NLQ_EXECUTION_FAILED",
  NLQ_NO_DATA_FOUND = "NLQ_NO_DATA_FOUND",
  NLQ_DATABASE_ERROR = "NLQ_DATABASE_ERROR",
  NLQ_TIMEOUT = "NLQ_TIMEOUT",
  NLQ_INVALID_QUERY = "NLQ_INVALID_QUERY",
  NLQ_PERMISSION_DENIED = "NLQ_PERMISSION_DENIED",
}

export const ERROR_MESSAGES = {
  INVALID_PAYLOAD: "Invalid message payload",
  USER_NOT_FOUND: "User not found",
  PROCESSING_FAILED: "Failed to process message",
  INTERNAL_ERROR: "Internal server error",
  TENANT_NOT_FOUND: "Tenant not found",
  UNAUTHORIZED: "Unauthorized access",
  // NLQ specific messages
  NLQ_PARSING_FAILED: "I couldn't understand your question",
  NLQ_EXECUTION_FAILED: "I encountered an issue while searching",
  NLQ_NO_DATA_FOUND: "No matching documents found",
  NLQ_DATABASE_ERROR: "There's a temporary issue accessing your files",
  NLQ_TIMEOUT: "Your request took too long to process",
  NLQ_INVALID_QUERY: "Please try rephrasing your question",
  NLQ_PERMISSION_DENIED: "You don't have access to the requested data",
} as const;

export class CommunicationError extends Error {
  constructor(
    message: string,
    public code: ERROR_CODES,
    public override cause?: unknown,
  ) {
    super(message);
    this.name = "CommunicationError";
  }
}

export class UserMappingError extends Error {
  constructor(
    message: string,
    public code: ERROR_CODES,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UserMappingError";
  }
}

export class NLQError extends Error {
  constructor(
    message: string,
    public code: ERROR_CODES,
    public userFriendlyMessage: string,
    public suggestions?: string[],
    public override cause?: unknown,
  ) {
    super(message);
    this.name = "NLQError";
  }

  static fromError(
    error: unknown,
    defaultCode: ERROR_CODES = ERROR_CODES.NLQ_EXECUTION_FAILED,
  ): NLQError {
    if (error instanceof NLQError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try to categorise the error
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out")
    ) {
      return new NLQError(
        errorMessage,
        ERROR_CODES.NLQ_TIMEOUT,
        ERROR_MESSAGES.NLQ_TIMEOUT,
        ["Try a simpler question", "Break your request into smaller parts"],
        error,
      );
    }

    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("access denied")
    ) {
      return new NLQError(
        errorMessage,
        ERROR_CODES.NLQ_PERMISSION_DENIED,
        ERROR_MESSAGES.NLQ_PERMISSION_DENIED,
        ["Check your account permissions", "Contact your administrator"],
        error,
      );
    }

    if (
      errorMessage.includes("database") ||
      errorMessage.includes("connection")
    ) {
      return new NLQError(
        errorMessage,
        ERROR_CODES.NLQ_DATABASE_ERROR,
        ERROR_MESSAGES.NLQ_DATABASE_ERROR,
        [
          "Please try again in a moment",
          "If the issue persists, contact support",
        ],
        error,
      );
    }

    if (errorMessage.includes("parse") || errorMessage.includes("invalid")) {
      return new NLQError(
        errorMessage,
        ERROR_CODES.NLQ_PARSING_FAILED,
        ERROR_MESSAGES.NLQ_PARSING_FAILED,
        [
          "Try asking 'How many files do I have?'",
          "Ask 'Show me invoices from this month'",
          "Try 'List my pending documents'",
        ],
        error,
      );
    }

    if (
      errorMessage.includes("no data") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("no results")
    ) {
      return new NLQError(
        errorMessage,
        ERROR_CODES.NLQ_NO_DATA_FOUND,
        ERROR_MESSAGES.NLQ_NO_DATA_FOUND,
        [
          "Try broadening your search criteria",
          "Check if you have any files uploaded",
          "Try asking about different time periods",
        ],
        error,
      );
    }

    // Default to execution failed
    return new NLQError(
      errorMessage,
      defaultCode,
      ERROR_MESSAGES.NLQ_EXECUTION_FAILED,
      [
        "Please try rephrasing your question",
        "Try a simpler query",
        "If the issue persists, contact support",
      ],
      error,
    );
  }
}
