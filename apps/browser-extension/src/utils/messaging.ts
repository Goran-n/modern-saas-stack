/**
 * Simplified messaging utilities for drag-drop file transfer
 */
import { createLogger } from './logger';
import { 
  Message, 
  MessageType, 
  createMessage,
  isMessage 
} from '../types/messages';

const logger = createLogger('extension:messaging');

/**
 * Send message to background script
 */
export async function sendToBackground<T>(
  type: MessageType, 
  payload: T
): Promise<any> {
  const message = createMessage(type, payload);
  logger.debug('Sending to background', { type });
  
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    logger.error('Failed to send message to background', { error, type });
    throw error;
  }
}

/**
 * Send message to specific tab
 */
export async function sendToTab<T>(
  tabId: number,
  type: MessageType,
  payload: T
): Promise<any> {
  const message = createMessage(type, payload);
  logger.debug('Sending to tab', { tabId, type });
  
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    logger.error('Failed to send message to tab', { error, tabId, type });
    throw error;
  }
}

/**
 * Listen for messages
 */
export function onMessage(
  handler: (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => void | boolean
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isMessage(message)) {
      logger.warn('Received invalid message format', { message });
      return false;
    }
    
    logger.debug('Message received', { 
      type: message.type, 
      from: sender.tab?.url || 'extension' 
    });
    
    return handler(message, sender, sendResponse);
  });
}

/**
 * Find tabs by URL pattern
 */
export async function findTabs(urlPattern: string): Promise<chrome.tabs.Tab[]> {
  try {
    const tabs = await chrome.tabs.query({ url: urlPattern });
    logger.debug('Found tabs', { pattern: urlPattern, count: tabs.length });
    return tabs;
  } catch (error) {
    logger.error('Failed to find tabs', { error, urlPattern });
    return [];
  }
}

/**
 * Get active Xero tab if available
 */
export async function getActiveXeroTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await findTabs('https://*.xero.com/*');
  return tabs.length > 0 ? tabs[0] : null;
}