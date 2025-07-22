/**
 * Auth callback handler - runs when web app redirects back to extension
 * This detects the successful authentication and notifies the background script
 */

import { MessageType, createMessage } from '../../types/messages';
import { createLogger } from '../../utils/logger';

const logger = createLogger('auth-callback');

export default {
  async main() {
    logger.info('Auth callback page loaded');
    
    try {
      // Extract auth data from URL parameters or fragments
      const urlParams = new URLSearchParams(window.location.search);
      const urlHash = window.location.hash;
      
      // Check if we have authentication indicators
      const authSuccess = urlParams.get('auth_success');
      const hasAuthSuccess = authSuccess === 'true' || 
                           urlParams.has('access_token') ||
                           urlHash.includes('access_token') ||
                           urlParams.get('status') === 'success';
      
      const authRejected = authSuccess === 'false' || urlParams.get('error') === 'access_denied';
      
      if (hasAuthSuccess) {
        logger.info('Authentication success detected');
        
        // Try to get session data from URL first, then fallback to sessionStorage
        let sessionData = null;
        
        // Method 1: Try URL parameter (legacy)
        const sessionParam = urlParams.get('session');
        if (sessionParam) {
          try {
            sessionData = JSON.parse(decodeURIComponent(sessionParam));
            logger.info('Session data received from URL parameter');
          } catch (error) {
            logger.error('Failed to parse session data from URL', { error });
          }
        }
        
        // Method 2: Try sessionStorage (new approach)
        if (!sessionData) {
          try {
            const storedData = window.sessionStorage.getItem('figgy_extension_session');
            if (storedData) {
              const parsed = JSON.parse(storedData);
              if (parsed.approved && parsed.sessionData) {
                sessionData = parsed.sessionData;
                // Clean up after use
                window.sessionStorage.removeItem('figgy_extension_session');
                logger.info('Session data received from sessionStorage');
              }
            }
          } catch (error) {
            logger.error('Failed to get session data from sessionStorage', { error });
          }
        }
        
        logger.info('Final session data status', { 
          hasSessionData: !!sessionData,
          hasAccessToken: !!sessionData?.access_token,
          userEmail: sessionData?.user?.email 
        });
        
        // Notify background script of successful auth with session data
        chrome.runtime.sendMessage(createMessage(MessageType.AUTH_SUCCESS, {
          method: 'web_app',
          timestamp: Date.now(),
          sessionData
        }));
        
        logger.info('Auth success message sent to background');
        
        // Close this tab after a brief delay
        setTimeout(() => {
          logger.info('Closing callback tab');
          window.close();
        }, 2000);
      } else if (authRejected) {
        logger.info('Authentication was rejected by user');
        
        // Update UI to show rejection message
        const contentEl = document.getElementById('content');
        if (contentEl) {
          contentEl.innerHTML = `
            <div class="error">✗ Access Denied</div>
            <div class="message">You have denied access to the browser extension.</div>
            <div class="closing">This tab will close automatically...</div>
          `;
        }
        
        // Notify background script of rejection
        chrome.runtime.sendMessage(createMessage(MessageType.AUTH_SUCCESS, {
          method: 'web_app',
          timestamp: Date.now(),
          rejected: true,
          error: urlParams.get('error') || 'access_denied'
        }));
        
        // Close this tab after a brief delay
        setTimeout(() => {
          logger.info('Closing callback tab (rejected)');
          window.close();
        }, 3000); // Longer delay to show rejection message
      } else {
        logger.warn('No authentication success or rejection detected in URL');
        // Still close the tab after a delay
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    } catch (error) {
      logger.error('Error processing auth callback', { error });
      
      // Close tab even on error
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  }
};