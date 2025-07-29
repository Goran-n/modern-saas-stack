/**
 * Standardized error codes for the application
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = "AUTH_UNAUTHORIZED",
  INVALID_TOKEN = "AUTH_INVALID_TOKEN",
  TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  
  // Permission errors
  FORBIDDEN = "PERM_FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "PERM_INSUFFICIENT",
  
  // Invitation errors
  INVITATION_NOT_FOUND = "INV_NOT_FOUND",
  INVITATION_EXPIRED = "INV_EXPIRED",
  INVITATION_ALREADY_ACCEPTED = "INV_ALREADY_ACCEPTED",
  INVITATION_EMAIL_MISMATCH = "INV_EMAIL_MISMATCH",
  INVITATION_ALREADY_SENT = "INV_ALREADY_SENT",
  
  // Member errors
  MEMBER_ALREADY_EXISTS = "MEM_ALREADY_EXISTS",
  MEMBER_NOT_FOUND = "MEM_NOT_FOUND",
  CANNOT_REMOVE_LAST_OWNER = "MEM_CANNOT_REMOVE_LAST_OWNER",
  
  // Rate limiting
  TOO_MANY_REQUESTS = "RATE_LIMIT_EXCEEDED",
  
  // General errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
}

/**
 * User-friendly error messages for each error code
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.UNAUTHORIZED]: "Please sign in to continue",
  [ErrorCode.INVALID_TOKEN]: "Invalid authentication token",
  [ErrorCode.TOKEN_EXPIRED]: "Your session has expired. Please sign in again",
  
  // Permissions
  [ErrorCode.FORBIDDEN]: "You don't have permission to perform this action",
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: "Your role doesn't have sufficient permissions",
  
  // Invitations
  [ErrorCode.INVITATION_NOT_FOUND]: "This invitation is no longer valid",
  [ErrorCode.INVITATION_EXPIRED]: "This invitation has expired",
  [ErrorCode.INVITATION_ALREADY_ACCEPTED]: "This invitation has already been accepted",
  [ErrorCode.INVITATION_EMAIL_MISMATCH]: "This invitation was sent to a different email address",
  [ErrorCode.INVITATION_ALREADY_SENT]: "An invitation has already been sent to this email address",
  
  // Members
  [ErrorCode.MEMBER_ALREADY_EXISTS]: "This user is already a member of the team",
  [ErrorCode.MEMBER_NOT_FOUND]: "Member not found",
  [ErrorCode.CANNOT_REMOVE_LAST_OWNER]: "Cannot remove the last owner of the team",
  
  // Rate limiting
  [ErrorCode.TOO_MANY_REQUESTS]: "Too many requests. Please try again later",
  
  // General
  [ErrorCode.INTERNAL_ERROR]: "An unexpected error occurred. Please try again",
  [ErrorCode.VALIDATION_ERROR]: "Please check your input and try again",
  [ErrorCode.NOT_FOUND]: "The requested resource was not found",
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(code: ErrorCode, customMessage?: string) {
  return {
    code,
    message: customMessage || ErrorMessages[code],
  };
}