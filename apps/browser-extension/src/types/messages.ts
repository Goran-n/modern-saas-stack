/**
 * Message types for drag-drop file transfer between Figgy and Xero
 */

// Message types enum - focused on file transfer operations
export enum MessageType {
  // Core drag-drop operations
  FILE_DRAG_START = "FILE_DRAG_START",
  FILE_DOWNLOAD_REQUEST = "FILE_DOWNLOAD_REQUEST",
  FILE_DOWNLOAD_RESPONSE = "FILE_DOWNLOAD_RESPONSE",
  FILE_DROP_READY = "FILE_DROP_READY",
  FILE_DROP_COMPLETE = "FILE_DROP_COMPLETE",
  FILE_COPIED = "FILE_COPIED",

  // Error handling
  FILE_ERROR = "FILE_ERROR",

  // Auth operations
  AUTH_SESSION_REQUEST = "AUTH_SESSION_REQUEST",
  AUTH_SESSION_RESPONSE = "AUTH_SESSION_RESPONSE",
  AUTH_SIGN_OUT = "AUTH_SIGN_OUT",
  AUTH_REQUEST = "AUTH_REQUEST",
  AUTH_SUCCESS = "AUTH_SUCCESS",
}

// Base message interface
export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}

// Payload types
export interface FileDragPayload {
  fileId: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}

export interface FileDownloadRequestPayload {
  fileName: string;
  fileId: string;
  tenantId: string;
}

export interface FileDownloadResponsePayload {
  fileName: string;
  mimeType: string;
  content: string; // Base64 encoded
  size: number;
}

export interface FileDropPayload {
  success: boolean;
  fileName: string;
  error?: string;
}

export interface FileErrorPayload {
  error: string;
  fileId?: string;
  operation: "drag" | "fetch" | "drop";
}

// Auth payload types

export interface AuthSessionResponsePayload {
  session: any | null; // Session type from Supabase
  error?: string;
}

// Type guards
export function isMessage(obj: any): obj is Message {
  return obj && typeof obj.type === "string" && "payload" in obj;
}

// Message creators
export function createMessage<T>(type: MessageType, payload: T): Message<T> {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}
