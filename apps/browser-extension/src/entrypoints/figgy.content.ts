/**
 * Content script for Figgy pages
 * Detects when files are being dragged and notifies the extension
 */
import { defineContentScript } from "wxt/utils/define-content-script";
import { type FileDragPayload, MessageType } from "../types/messages";
import { createLogger } from "../utils/logger";
import { sendToBackground } from "../utils/messaging";

export default defineContentScript({
  matches: ["https://*.figgy.com/*", "*://localhost/*", "*://127.0.0.1/*"],

  main() {
    const logger = createLogger("content:figgy");
    logger.info("Figgy content script loaded");

    // Store the current drag data
    let currentDragData: any = null;

    // Try to extract and store tenant ID and auth info
    extractAndStoreAuthInfo();

    // Intercept dataTransfer.setData to capture the drag data
    const originalSetData = DataTransfer.prototype.setData;
    DataTransfer.prototype.setData = function (format: string, data: string) {
      // Always set as text/plain for cross-origin compatibility
      if (format === "application/x-figgy-file") {
        // Convert custom MIME type to text/plain
        originalSetData.call(this, "text/plain", data);

        try {
          const parsedData = JSON.parse(data);
          if (parsedData.type === "figgy-file") {
            currentDragData = parsedData;
            logger.debug(
              "Intercepted Figgy file drag data (converted to text/plain)",
              {
                fileId: parsedData.fileId,
                fileName: parsedData.fileName,
                originalFormat: format,
              },
            );
          }
        } catch (_e) {
          // Not JSON or not our data, ignore
        }
      } else {
        // Call the original method for other formats
        originalSetData.call(this, format, data);

        // Still check text/plain for our data
        if (format === "text/plain") {
          try {
            const parsedData = JSON.parse(data);
            if (parsedData.type === "figgy-file") {
              currentDragData = parsedData;
              logger.debug("Intercepted Figgy file drag data", {
                fileId: parsedData.fileId,
                fileName: parsedData.fileName,
                format: format,
              });
            }
          } catch (_e) {
            // Not JSON or not our data, ignore
          }
        }
      }
    };

    // Listen for drag events on file elements
    document.addEventListener(
      "dragstart",
      async (event) => {
        const target = event.target as HTMLElement;

        // Check if this is a draggable element
        if (!event.dataTransfer || !target.closest('[draggable="true"]')) {
          return;
        }

        // Wait a bit for the drag data to be set
        setTimeout(async () => {
          if (!currentDragData || currentDragData.type !== "figgy-file") {
            return;
          }

          try {
            logger.debug("Processing Figgy file drag", {
              fileId: currentDragData.fileId,
              fileName: currentDragData.fileName,
              hasSignedUrl: !!currentDragData.downloadUrl,
              allDragDataKeys: Object.keys(currentDragData),
              dragDataSample: {
                type: currentDragData.type,
                fileId: currentDragData.fileId,
                fileName: currentDragData.fileName,
                downloadUrl: currentDragData.downloadUrl
                  ? "PRESENT"
                  : "MISSING",
              },
            });

            // Store the drag data with fileId and tenantId for REST API calls
            await chrome.storage.local.set({
              currentDragData: {
                fileId: currentDragData.fileId,
                fileName: currentDragData.fileName,
                mimeType: currentDragData.mimeType,
                tenantId: currentDragData.tenantId,
              },
            });

            // Notify background script that a drag has started
            const payload: FileDragPayload = {
              fileId: currentDragData.fileId,
              fileName: currentDragData.fileName,
              fileSize: currentDragData.fileSize,
              mimeType: currentDragData.mimeType,
            };

            await sendToBackground(MessageType.FILE_DRAG_START, payload);
          } catch (error) {
            logger.error("Error handling drag start", { error });
          }
        }, 0);
      },
      true,
    ); // Use capture phase

    // Clear drag data on drag end
    document.addEventListener(
      "dragend",
      () => {
        currentDragData = null;
      },
      true,
    );

    // Listen for copy messages from the page
    window.addEventListener("message", async (event) => {
      // Only accept messages from the same origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "figgy-file-copied") {
        const fileData = event.data.data;
        logger.info("File copied to clipboard", {
          fileId: fileData.fileId,
          fileName: fileData.fileName,
        });

        // Store in Chrome storage for the extension with fileId and tenantId
        await chrome.storage.local.set({
          copiedFileData: {
            fileId: fileData.fileId,
            fileName: fileData.fileName,
            mimeType: fileData.mimeType,
            tenantId: fileData.tenantId,
          },
        });

        // Notify background script
        await sendToBackground(MessageType.FILE_COPIED, {
          fileId: fileData.fileId,
          fileName: fileData.fileName,
          mimeType: fileData.mimeType,
        });
      }
    });

    // Extract and store authentication information
    async function extractAndStoreAuthInfo() {
      try {
        // Try to extract tenant ID from various sources
        let tenantId: string | null = null;
        let authToken: string | null = null;

        // Method 1: Check localStorage for Supabase auth
        const supabaseAuth = localStorage.getItem("supabase.auth.token");
        if (supabaseAuth) {
          try {
            const authData = JSON.parse(supabaseAuth);
            authToken =
              authData.access_token || authData.currentSession?.access_token;
          } catch (_e) {
            logger.debug("Failed to parse Supabase auth data");
          }
        }

        // Method 2: Check for tenant ID in URL
        const urlMatch = window.location.pathname.match(/tenant\/([a-f0-9-]+)/);
        if (urlMatch) {
          tenantId = urlMatch[1];
        }

        // Method 3: Check localStorage for tenant info
        const tenantInfo = localStorage.getItem("currentTenant");
        if (tenantInfo) {
          try {
            const tenant = JSON.parse(tenantInfo);
            tenantId = tenant.id || tenant.tenantId;
          } catch (_e) {
            logger.debug("Failed to parse tenant info");
          }
        }

        // Method 4: Check meta tags
        const tenantMeta = document.querySelector('meta[name="tenant-id"]');
        if (tenantMeta) {
          tenantId = tenantMeta.getAttribute("content");
        }

        // Store in Chrome storage if found
        if (tenantId || authToken) {
          const storageData: any = {};
          if (tenantId) storageData.tenantId = tenantId;
          if (authToken) storageData.authToken = authToken;

          await chrome.storage.local.set(storageData);
          logger.info("Stored auth info", {
            hasTenantId: !!tenantId,
            hasAuthToken: !!authToken,
          });
        }

        // Re-check periodically as the user navigates
        setTimeout(extractAndStoreAuthInfo, 5000);
      } catch (error) {
        logger.error("Failed to extract auth info", { error });
      }
    }
  },
});
