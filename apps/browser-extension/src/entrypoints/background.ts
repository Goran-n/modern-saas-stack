/**
 * Background script for file transfer between Figgy and Xero
 * Handles fetching files from Figgy API when a drag operation starts
 */
import {
  createMessage,
  type FileErrorPayload,
  type FileDownloadRequestPayload,
  type FileDownloadResponsePayload,
  type Message,
  MessageType,
} from "../types/messages";
import { getConfig } from "../utils/config";
import { createLogger } from "../utils/logger";
import { getSession, initializeAuth } from "../utils/supabase";
import { createConsole } from "../utils/console";

export default {
  main() {
    const logger = createLogger("background");
    const console = createConsole("background");
    const config = getConfig();

    // Initialize Supabase auth on startup (async but not awaited)
    initializeAuth().catch(error => {
      logger.error("Failed to initialize auth", { error });
    });

    // Handle incoming messages
    chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
      logger.debug("Message received", { type: message.type });

      // Handle async messages properly
      const handleAsync = async () => {
        switch (message.type) {
          case MessageType.FILE_DOWNLOAD_REQUEST:
            return await handleFileDownload(message.payload as FileDownloadRequestPayload);

          case MessageType.AUTH_SESSION_REQUEST:
            return await handleSessionRequest();
            
          case MessageType.AUTH_REQUEST:
            return await handleAuthRequest();
            
          case MessageType.AUTH_SUCCESS:
            return await handleAuthSuccess(message.payload);

          case MessageType.FILE_DROP_COMPLETE:
            return await handleFileDropComplete(message.payload);

          default:
            logger.warn("Unknown message type", { type: message.type });
            return null;
        }
      };

      // Execute the async handler and send response
      handleAsync()
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          logger.error("Message handler error", { error, type: message.type });
          sendResponse({ error: String(error) });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    });


    /**
     * Handle session request from popup
     */
    async function handleSessionRequest() {
      try {
        const session = await getSession();
        return createMessage(MessageType.AUTH_SESSION_RESPONSE, {
          session,
          error: null,
        });
      } catch (error) {
        logger.error("Failed to get session", { error });
        return createMessage(MessageType.AUTH_SESSION_RESPONSE, {
          session: null,
          error: String(error),
        });
      }
    }

    /**
     * Handle auth request - opens web app auth page and polls for result
     */
    async function handleAuthRequest() {
      try {
        logger.info("Opening web app auth page");
        
        const config = getConfig();
        const extensionId = chrome.runtime.id;
        const callbackUrl = chrome.runtime.getURL('callback.html');
        const authUrl = `${config.getApiConfig().APP_URL}/auth/login?source=extension&callback=${encodeURIComponent(callbackUrl)}`;
        
        console.debug("Extension Auth URL Generation:", {
          extensionId,
          callbackUrl,
          authUrl,
          runtimeId: chrome.runtime.id,
          manifestVersion: chrome.runtime.getManifest()?.manifest_version
        });
        
        logger.info("Auth URL details", {
          extensionId,
          callbackUrl,
          authUrl
        });
        
        const tab = await chrome.tabs.create({
          url: authUrl,
          active: true
        });
        
        // Start polling for auth completion
        startAuthPolling(tab.id!);
        
        return { success: true, tabId: tab.id };
      } catch (error) {
        logger.error("Failed to open web app auth tab", { error });
        return { success: false, error: String(error) };
      }
    }

    /**
     * Poll for auth completion by checking localStorage/sessionStorage
     */
    function startAuthPolling(tabId: number) {
      let pollCount = 0;
      const maxPolls = 120; // 2 minutes (1 second intervals)
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        try {
          // Execute script in the auth tab to check for auth result
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              // Check both storage types
              const sessionResult = window.sessionStorage.getItem('figgy_extension_auth_result');
              const localResult = window.localStorage.getItem('figgy_extension_auth_result');
              
              const result = sessionResult || localResult;
              if (result) {
                // Clean up storage
                window.sessionStorage.removeItem('figgy_extension_auth_result');
                window.localStorage.removeItem('figgy_extension_auth_result');
                return JSON.parse(result);
              }
              return null;
            }
          });
          
          const authResult = results[0]?.result;
          
          if (authResult) {
            clearInterval(pollInterval);
            logger.info("Auth result detected via polling", { approved: authResult.approved });
            
            if (authResult.approved && authResult.sessionData) {
              // Handle successful auth
              await handleAuthSuccess({
                method: 'web_app_polling',
                sessionData: authResult.sessionData,
                timestamp: authResult.timestamp
              });
            } else {
              // Handle rejection
              await handleAuthSuccess({
                method: 'web_app_polling',
                rejected: true,
                timestamp: authResult.timestamp
              });
            }
            
            // Close the auth tab
            chrome.tabs.remove(tabId);
            return;
          }
          
        } catch (error) {
          logger.error("Error during auth polling", { error });
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          logger.warn("Auth polling timed out");
          // Tab will remain open for user to handle manually
        }
      }, 1000); // Poll every second
    }

    /**
     * Handle successful authentication - close auth tabs and refresh content
     */
    async function handleAuthSuccess(payload: any) {
      try {
        logger.info("Authentication response received", { 
          method: payload.method, 
          hasSession: !!payload.sessionData,
          rejected: !!payload.rejected 
        });
        
        // Handle rejection case
        if (payload.rejected) {
          logger.info("User rejected extension access");
          
          // Close auth callback tabs
          const callbackTabs = await chrome.tabs.query({
            url: chrome.runtime.getURL('callback.html*')
          });
          
          for (const tab of callbackTabs) {
            if (tab.id) {
              await chrome.tabs.remove(tab.id);
            }
          }
          
          return { success: false, error: payload.error || 'access_denied' };
        }
        
        // Handle success case - if we have session data from web app, set it in extension
        if (payload.sessionData) {
          try {
            logger.info("Setting session in extension", { 
              userEmail: payload.sessionData.user?.email 
            });
            
            // Try to use Supabase's setSession method, but fall back to manual storage if it fails
            logger.info("Attempting to set session via Supabase client");
            
            try {
              const { getSupabaseClient } = await import("../utils/supabase");
              const client = getSupabaseClient();
              
              const { data, error } = await client.auth.setSession({
                access_token: payload.sessionData.access_token,
                refresh_token: payload.sessionData.refresh_token
              });

              if (error) {
                throw error;
              } else {
                logger.info("Session set successfully via Supabase client", {
                  hasSession: !!data.session,
                  userEmail: data.session?.user?.email
                });
              }
            } catch (supabaseError) {
              logger.warn("Supabase setSession failed, using manual storage approach", { error: supabaseError });
              
              // Manual storage approach - store the session data in the format Supabase expects
              const storageKey = "supabase.auth.token";
              const sessionData = {
                access_token: payload.sessionData.access_token,
                token_type: "bearer",
                expires_in: payload.sessionData.expires_in || 3600,
                expires_at: payload.sessionData.expires_at,
                refresh_token: payload.sessionData.refresh_token,
                user: payload.sessionData.user
              };
              
              // Store in the format that Supabase's storage adapter expects
              await chrome.storage.local.set({
                [storageKey]: JSON.stringify(sessionData)
              });
              
              logger.info("Session stored manually in Chrome storage", {
                hasAccessToken: !!sessionData.access_token,
                expiresAt: sessionData.expires_at,
                userEmail: sessionData.user?.email
              });
              
              // Manually trigger auth state change since we bypassed Supabase's setSession
              try {
                const client = getSupabaseClient();
                // Force the client to re-read the session from storage
                await client.auth.getSession();
              } catch (refreshError) {
                logger.warn("Could not refresh session after manual storage", { error: refreshError });
              }
            }

            // Also store tenant ID if available
            const tenantId = payload.sessionData.user?.user_metadata?.tenant_id;
            if (tenantId) {
              await chrome.storage.local.set({ tenantId });
            }
            
            logger.info("Session processing completed", {
              hasAccessToken: !!payload.sessionData.access_token,
              expiresAt: payload.sessionData.expires_at,
              tenantId
            });
          } catch (error) {
            logger.error("Failed to set session from web app", { error });
          }
        }
        
        // Close auth callback tabs
        const callbackTabs = await chrome.tabs.query({
          url: chrome.runtime.getURL('callback.html*')
        });
        
        for (const tab of callbackTabs) {
          if (tab.id) {
            await chrome.tabs.remove(tab.id);
          }
        }
        
        // Also close any web app auth tabs that might still be open
        const config = getConfig();
        const webAppAuthTabs = await chrome.tabs.query({
          url: `${config.getApiConfig().APP_URL}/auth/*`
        });
        
        for (const tab of webAppAuthTabs) {
          if (tab.id) {
            await chrome.tabs.remove(tab.id);
          }
        }
        
        // Don't call initializeAuth here as it may interfere with the session we just set
        // The Supabase client will handle the auth state change automatically
        
        // Notify any listening content scripts about auth success
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'AUTH_UPDATED',
                payload: { authenticated: true }
              }).catch(() => {
                // Ignore errors for tabs without content scripts
              });
            }
          });
        });
        
        return { success: true };
      } catch (error) {
        logger.error("Failed to handle auth success", { error });
        return { success: false, error: String(error) };
      }
    }

    /**
     * Handle file drop complete notification
     */
    async function handleFileDropComplete(payload: any) {
      try {
        logger.info("File drop completed", {
          success: payload.success,
          fileName: payload.fileName,
          error: payload.error
        });

        // Could add additional handling here like:
        // - Updating UI badges
        // - Tracking usage statistics
        // - Showing notifications
        
        return { received: true };
      } catch (error) {
        logger.error("Failed to handle file drop complete", { error });
        return { received: false, error: String(error) };
      }
    }

    /**
     * Download file by getting signed URL from REST API
     */
    async function handleFileDownload(
      payload: FileDownloadRequestPayload,
    ): Promise<Message<FileDownloadResponsePayload | FileErrorPayload>> {
      try {
        logger.debug("Downloading file via REST API signed URL", {
          fileName: payload.fileName,
          fileId: payload.fileId,
          tenantId: payload.tenantId,
        });

        // Get current session for authentication
        let session;
        try {
          session = await getSession();
          if (!session) {
            throw new Error("Not authenticated. Please log in to Figgy first.");
          }
        } catch (sessionError) {
          logger.warn("Failed to get session, user may need to re-authenticate", { error: sessionError });
          throw new Error("Authentication failed. Please log in to Figgy again.");
        }

        // Call REST API to get signed URL (REST API runs on port 5010)
        const apiConfig = config.getApiConfig();
        const restApiBase = apiConfig.API_URL.replace(/:\d+/, ':5010'); // Replace port with 5010
        const signedUrlEndpoint = `${restApiBase}/api/files/${payload.fileId}/signed-url`;

        logger.debug("Calling REST API for signed URL", { 
          endpoint: signedUrlEndpoint,
          fileId: payload.fileId 
        });

        const signedUrlResponse = await fetch(signedUrlEndpoint, {
          method: "GET",
          headers: {
            "X-Tenant-ID": payload.tenantId,
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!signedUrlResponse.ok) {
          throw new Error(`Failed to get signed URL: ${signedUrlResponse.statusText}`);
        }

        const { signedUrl } = await signedUrlResponse.json();
        
        if (!signedUrl) {
          throw new Error("No signed URL returned from API");
        }

        logger.debug("Got signed URL from REST API", { 
          fileName: payload.fileName,
          hasSignedUrl: !!signedUrl,
          signedUrlSample: signedUrl.substring(0, 100) + "..."
        });

        // Now download the file using the signed URL (in-memory, not to disk)
        logger.debug("Starting in-memory file fetch", { fileName: payload.fileName });
        const fileResponse = await fetch(signedUrl, {
          method: "GET",
          headers: {
            // Prevent browser from treating this as a download
            "Cache-Control": "no-cache",
          },
          // Explicitly specify we want the response for programmatic use
          mode: "cors",
        });

        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }

        logger.debug("File fetched successfully, creating blob", { 
          contentType: fileResponse.headers.get("content-type"),
          contentLength: fileResponse.headers.get("content-length")
        });

        const blob = await fileResponse.blob();

        logger.debug("Blob created, converting to base64", { 
          blobSize: blob.size,
          blobType: blob.type
        });

        // Convert to base64 for transfer
        const reader = new FileReader();
        const content = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        return createMessage(MessageType.FILE_DOWNLOAD_RESPONSE, {
          fileName: payload.fileName,
          mimeType: blob.type || "application/octet-stream",
          content: content.split(",")[1], // Remove data URL prefix
          size: blob.size,
        });
      } catch (error) {
        logger.error("File download failed", { 
          error, 
          fileName: payload.fileName,
          fileId: payload.fileId
        });

        return createMessage(MessageType.FILE_ERROR, {
          error: error instanceof Error ? error.message : "Failed to download file",
          operation: "download",
        });
      }
    }

    logger.info("Background script initialized");
  },
};
