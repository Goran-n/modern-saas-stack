import { Platform, ProcessingResult } from '../types';

/**
 * Represents an attachment in a message
 */
export interface MessageAttachment {
  id: string;
  fileName?: string | undefined;
  mimeType: string;
  size?: number | undefined;
  url?: string | undefined;
}

/**
 * Platform-agnostic message payload
 */
export interface MessagePayload {
  messageId: string;
  platform: Platform;
  sender: string;
  timestamp: Date;
  content?: string | undefined;
  attachments: MessageAttachment[];
  metadata?: Record<string, any> | undefined;
}

/**
 * Validation result for message payloads
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[] | undefined;
}

/**
 * Base error class for message processing failures
 */
export class MessageProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any | undefined
  ) {
    super(message);
    this.name = 'MessageProcessingError';
  }
}

/**
 * Abstract interface for platform-agnostic message handling
 */
export interface IMessageHandler {
  /**
   * Validate a message payload before processing
   */
  validate(payload: MessagePayload): Promise<ValidationResult>;

  /**
   * Process a message and its attachments
   */
  process(
    payload: MessagePayload,
    tenantId: string,
    userId: string
  ): Promise<ProcessingResult>;

  /**
   * Get supported platforms for this handler
   */
  getSupportedPlatforms(): Platform[];
}

/**
 * Base implementation of message handler with common logic
 */
export abstract class BaseMessageHandler implements IMessageHandler {
  constructor(protected readonly supportedPlatforms: Platform[]) {}

  getSupportedPlatforms(): Platform[] {
    return this.supportedPlatforms;
  }

  async validate(payload: MessagePayload): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!payload.messageId) {
      errors.push('Message ID is required');
    }

    if (!payload.platform) {
      errors.push('Platform is required');
    }

    if (!this.supportedPlatforms.includes(payload.platform)) {
      errors.push(`Platform ${payload.platform} is not supported by this handler`);
    }

    if (!payload.sender) {
      errors.push('Sender is required');
    }

    if (!payload.timestamp) {
      errors.push('Timestamp is required');
    }

    // Platform-specific validation
    const platformValidation = await this.validatePlatformSpecific(payload);
    if (!platformValidation.isValid && platformValidation.errors) {
      errors.push(...platformValidation.errors);
    }

    const result: ValidationResult = {
      isValid: errors.length === 0
    };
    
    if (errors.length > 0) {
      result.errors = errors;
    }
    
    return result;
  }

  /**
   * Platform-specific validation to be implemented by subclasses
   */
  protected abstract validatePlatformSpecific(
    payload: MessagePayload
  ): Promise<ValidationResult>;

  /**
   * Abstract process method to be implemented by subclasses
   */
  abstract process(
    payload: MessagePayload,
    tenantId: string,
    userId: string
  ): Promise<ProcessingResult>;
}