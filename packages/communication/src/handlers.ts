import { createLogger } from '@kibly/utils';
import { WhatsAppMessageHandler } from './handlers/whatsapp.handler';
import { SlackMessageHandler } from './handlers/slack.handler';
import { MessageProcessingError } from './interfaces/message-handler';
import type { ProcessingResult } from './types';

const logger = createLogger('communication-handlers');

// Lazy-loaded handlers to avoid config initialization issues
let whatsAppHandler: WhatsAppMessageHandler | null = null;
let slackHandler: SlackMessageHandler | null = null;

function getWhatsAppHandler(): WhatsAppMessageHandler {
  if (!whatsAppHandler) {
    whatsAppHandler = new WhatsAppMessageHandler();
  }
  return whatsAppHandler;
}

function getSlackHandler(): SlackMessageHandler {
  if (!slackHandler) {
    slackHandler = new SlackMessageHandler();
  }
  return slackHandler;
}

/**
 * Handle incoming Twilio WhatsApp webhook
 * This function should be called from the API server's webhook endpoint
 */
export async function handleTwilioWhatsAppWebhook(
  payload: unknown,
  tenantId: string,
  userId: string
): Promise<ProcessingResult> {
  try {
    // Parse webhook payload to platform-agnostic format
    const messagePayload = WhatsAppMessageHandler.parseWebhookPayload(payload);
    
    if (!messagePayload) {
      return {
        success: false,
        error: 'Invalid Twilio WhatsApp payload'
      };
    }
    
    // Validate the payload
    const handler = getWhatsAppHandler();
    const validation = await handler.validate(messagePayload);
    if (!validation.isValid) {
      logger.warn('WhatsApp payload validation failed', { 
        errors: validation.errors,
        messageId: messagePayload.messageId 
      });
      return {
        success: false,
        error: `Validation failed: ${validation.errors?.join(', ')}`
      };
    }
    
    // Process the message
    return await handler.process(messagePayload, tenantId, userId);
  } catch (error) {
    if (error instanceof MessageProcessingError) {
      logger.error('WhatsApp processing error', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return {
        success: false,
        error: error.message
      };
    }
    
    logger.error('Unexpected error handling WhatsApp webhook', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle incoming Slack event webhook
 * This function should be called from the API server's webhook endpoint
 */
export async function handleSlackEventWebhook(
  payload: unknown,
  tenantId: string,
  userId: string
): Promise<ProcessingResult | { challenge: string }> {
  try {
    // Check if this is a URL verification challenge
    const verificationResponse = SlackMessageHandler.handleUrlVerification(payload);
    if (verificationResponse) {
      return verificationResponse;
    }
    
    // Parse webhook payload to platform-agnostic format
    const messagePayload = SlackMessageHandler.parseWebhookPayload(payload);
    
    if (!messagePayload) {
      return {
        success: false,
        error: 'Invalid Slack event payload'
      };
    }
    
    // Validate the payload
    const handler = getSlackHandler();
    const validation = await handler.validate(messagePayload);
    if (!validation.isValid) {
      logger.warn('Slack payload validation failed', { 
        errors: validation.errors,
        messageId: messagePayload.messageId 
      });
      return {
        success: false,
        error: `Validation failed: ${validation.errors?.join(', ')}`
      };
    }
    
    // Process the message
    return await handler.process(messagePayload, tenantId, userId);
  } catch (error) {
    if (error instanceof MessageProcessingError) {
      logger.error('Slack processing error', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return {
        success: false,
        error: error.message
      };
    }
    
    logger.error('Unexpected error handling Slack webhook', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle WhatsApp verification challenge
 * Twilio sends a GET request to verify the webhook URL
 */
export function handleWhatsAppVerification(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  expectedToken: string
): { verified: boolean; challenge?: string } {
  if (mode === 'subscribe' && token === expectedToken && challenge) {
    logger.info('WhatsApp webhook verified');
    return { verified: true, challenge };
  }
  
  logger.warn('WhatsApp webhook verification failed', { mode, token });
  return { verified: false };
}