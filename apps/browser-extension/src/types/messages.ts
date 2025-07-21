/**
 * Message types for drag-drop file transfer between Kibly and Xero
 */

// Message types enum - focused on file transfer operations
export enum MessageType {
  // Core drag-drop operations
  FILE_DRAG_START = 'FILE_DRAG_START',
  FILE_FETCH_REQUEST = 'FILE_FETCH_REQUEST',
  FILE_FETCH_RESPONSE = 'FILE_FETCH_RESPONSE',
  FILE_DROP_READY = 'FILE_DROP_READY',
  FILE_DROP_COMPLETE = 'FILE_DROP_COMPLETE',
  
  // Copy-paste operations
  FILE_COPIED = 'FILE_COPIED',
  FILE_PASTE_REQUEST = 'FILE_PASTE_REQUEST',
  
  // Error handling
  FILE_ERROR = 'FILE_ERROR',
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

export interface FileFetchRequestPayload {
  fileId: string;
  tenantId: string;
}

export interface FileFetchResponsePayload {
  fileId: string;
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
  operation: 'drag' | 'fetch' | 'drop';
}

// Type guards
export function isMessage(obj: any): obj is Message {
  return obj && typeof obj.type === 'string' && 'payload' in obj;
}

// Message creators
export function createMessage<T>(type: MessageType, payload: T): Message<T> {
  return {
    type,
    payload,
    timestamp: Date.now()
  };
}