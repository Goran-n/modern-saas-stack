/**
 * Xero content script with paste and drag-drop support
 */
import { defineContentScript } from "wxt/utils/define-content-script";
import {
  type FileDropPayload,
  type FileDownloadRequestPayload,
  type FileDownloadResponsePayload,
  MessageType,
} from "../types/messages";
import { createLogger } from "../utils/logger";
import { sendToBackground } from "../utils/messaging";

export default defineContentScript({
  matches: ["https://*.xero.com/*"],

  main() {
    const logger = createLogger("content:xero");
    logger.info("Xero content script loaded (paste + drag-drop support)");

    let isProcessingPaste = false;
    let isProcessingDrop = false;
    let pasteIndicator: HTMLDivElement | null = null;

    // Common file processing function
    async function processFile(
      fileData: any,
      fileInput: HTMLInputElement,
      operation: "paste" | "drop",
    ) {
      try {
        logger.debug(`Processing file ${operation}`, {
          fileName: fileData.fileName,
          fileId: fileData.fileId,
          tenantId: fileData.tenantId,
        });

        // Check if we have required data
        if (!fileData.fileId || !fileData.fileName) {
          throw new Error("Missing required file data (fileId or fileName)");
        }

        // Get tenant ID from various sources
        let tenantId = fileData.tenantId;
        if (!tenantId) {
          const storage = await chrome.storage.local.get([
            "currentTenantId",
            "copiedFileData", 
            "currentDragData"
          ]);
          
          tenantId = storage.currentTenantId || 
            (operation === "paste" ? storage.copiedFileData?.tenantId : storage.currentDragData?.tenantId);
        }

        if (!tenantId) {
          throw new Error("No tenant ID available. Please ensure you are logged in to Figgy.");
        }

        // Request file download from background (it will get signed URL from REST API)
        const request: FileDownloadRequestPayload = {
          fileName: fileData.fileName,
          fileId: fileData.fileId,
          tenantId: tenantId,
        };

        const response = await sendToBackground(
          MessageType.FILE_DOWNLOAD_REQUEST,
          request,
        );

        if (!response) {
          throw new Error("No response received from background script");
        }

        if (response.type === MessageType.FILE_ERROR) {
          throw new Error(response.payload.error);
        }

        if (response.type === MessageType.FILE_DOWNLOAD_RESPONSE) {
          const responseData = response.payload as FileDownloadResponsePayload;

          // Convert base64 to blob
          const byteString = atob(responseData.content);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: responseData.mimeType });

          // Create file
          const file = new File([blob], responseData.fileName, {
            type: responseData.mimeType,
            lastModified: Date.now(),
          });

          // Simple file input approach for fallback cases
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          try {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            logger.debug("File set on input", { fileName: file.name });
          } catch (err) {
            logger.warn("Failed to set file on input", { error: err });
          }

          // Flash success
          fileInput.style.outline = "3px solid #10b981";
          setTimeout(() => {
            fileInput.style.outline = "";
          }, 1000);

          logger.info(`File ${operation} successful`, { fileName: file.name });

          // Notify background
          const result: FileDropPayload = {
            success: true,
            fileName: file.name,
          };
          await sendToBackground(MessageType.FILE_DROP_COMPLETE, result);
        }
      } catch (error) {
        logger.error(`${operation} failed`, { error });

        const result: FileDropPayload = {
          success: false,
          fileName: fileData.fileName || "unknown",
          error: error instanceof Error ? error.message : `${operation} failed`,
        };
        await sendToBackground(MessageType.FILE_DROP_COMPLETE, result);

        throw error;
      }
    }

    // Find upload buttons in the page
    function findUploadButtons(): Element[] {
      const buttonSelectors = [
        // Button text selectors
        'button[title*="attach" i], button[title*="upload" i]',
        'a[title*="attach" i], a[title*="upload" i]',
        // Common button text patterns
        'button:is([aria-label*="attach" i], [aria-label*="upload" i])',
        // Text content matching
        'button, a[role="button"]'
      ];

      const buttons: Element[] = [];
      
      for (const selector of buttonSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          const title = el.getAttribute('title')?.toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          
          if (text.includes('attach') || text.includes('upload') ||
              title.includes('attach') || title.includes('upload') ||
              ariaLabel.includes('attach') || ariaLabel.includes('upload')) {
            buttons.push(el);
          }
        });
      }

      // Look for paperclip icons (common attachment symbol)
      const iconButtons = document.querySelectorAll('button, a[role="button"]');
      iconButtons.forEach(btn => {
        const hasClipIcon = btn.querySelector('svg, i, span')?.textContent?.includes('📎') ||
                           btn.innerHTML.includes('clip') ||
                           btn.className.toLowerCase().includes('attach');
        if (hasClipIcon) {
          buttons.push(btn);
        }
      });

      return [...new Set(buttons)]; // Remove duplicates
    }

    // Highlight upload buttons during drag
    function highlightUploadButtons(): void {
      const buttons = findUploadButtons();
      buttons.forEach(btn => {
        btn.setAttribute('data-figgy-highlighted', 'true');
        (btn as HTMLElement).style.outline = '3px solid #10b981';
        (btn as HTMLElement).style.outlineOffset = '2px';
        (btn as HTMLElement).style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      });
      
      logger.debug("Highlighted upload buttons", { count: buttons.length });
    }

    // Remove upload button highlighting
    function removeUploadButtonHighlighting(): void {
      const highlightedButtons = document.querySelectorAll('[data-figgy-highlighted="true"]');
      highlightedButtons.forEach(btn => {
        btn.removeAttribute('data-figgy-highlighted');
        (btn as HTMLElement).style.outline = '';
        (btn as HTMLElement).style.outlineOffset = '';
        (btn as HTMLElement).style.backgroundColor = '';
      });
    }

    // Find the nearest upload button to the drop target
    function findNearestUploadButton(nearElement: Element | null): Element | null {
      const buttons = findUploadButtons();
      if (buttons.length === 0) return null;
      if (!nearElement) return buttons[0];

      // Find the closest button to the drop target
      let nearestButton = buttons[0];
      let nearestDistance = Number.MAX_SAFE_INTEGER;

      const targetRect = nearElement.getBoundingClientRect();
      const targetCenter = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };

      buttons.forEach(btn => {
        const btnRect = btn.getBoundingClientRect();
        const btnCenter = {
          x: btnRect.left + btnRect.width / 2,
          y: btnRect.top + btnRect.height / 2
        };

        const distance = Math.sqrt(
          Math.pow(targetCenter.x - btnCenter.x, 2) + 
          Math.pow(targetCenter.y - btnCenter.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestButton = btn;
        }
      });

      return nearestButton;
    }

    // Process file by clicking upload button and waiting for file input
    async function processFileViaButton(fileData: any, uploadButton: Element): Promise<void> {
      try {
        logger.debug("Processing file via upload button", {
          buttonText: uploadButton.textContent?.trim(),
          fileName: fileData.fileName
        });

        // Download the file first
        const response = await sendToBackground(
          MessageType.FILE_DOWNLOAD_REQUEST,
          {
            fileName: fileData.fileName,
            fileId: fileData.fileId,
            tenantId: fileData.tenantId || await getTenantId()
          }
        );

        if (!response || response.type !== MessageType.FILE_DOWNLOAD_RESPONSE) {
          throw new Error("Failed to download file");
        }

        const responseData = response.payload;
        
        // Create File object
        const byteString = atob(responseData.content);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: responseData.mimeType });
        const file = new File([blob], responseData.fileName, {
          type: responseData.mimeType,
          lastModified: Date.now(),
        });

        // Click the upload button
        (uploadButton as HTMLElement).click();

        // Wait for file input to appear and set our file
        setTimeout(async () => {
          const fileInputs = document.querySelectorAll('input[type="file"]');
          const newFileInput = Array.from(fileInputs).find(input => 
            !input.hasAttribute('data-figgy-processed')
          ) as HTMLInputElement;

          if (newFileInput) {
            newFileInput.setAttribute('data-figgy-processed', 'true');
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            newFileInput.files = dataTransfer.files;
            newFileInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            logger.info("File set on upload button input", { fileName: file.name });
          } else {
            logger.warn("No new file input found after clicking upload button");
          }
        }, 100);

      } catch (error) {
        logger.error("Failed to process file via button", { error });
        throw error;
      }
    }

    // Get tenant ID from various sources
    async function getTenantId(): Promise<string> {
      const storage = await chrome.storage.local.get([
        "currentTenantId",
        "copiedFileData", 
        "currentDragData"
      ]);
      
      return storage.currentTenantId || 
        storage.copiedFileData?.tenantId || 
        storage.currentDragData?.tenantId || 
        "";
    }


    // Enhanced visibility check for modern web apps that hide file inputs
    function isFileInputUsable(input: HTMLInputElement): boolean {
      // Check if input is completely removed from layout
      if (input.style.display === "none") {
        return false;
      }
      
      // Check if input is actually in the DOM
      if (!document.contains(input)) {
        return false;
      }
      
      // For hidden inputs, we can still use them programmatically
      // Modern file upload UIs often hide the actual input with opacity: 0 or position: absolute
      return true;
    }

    // Find suitable file input with enhanced detection
    function findFileInput(
      preferredContext?: Element | null,
    ): HTMLInputElement | null {
      let fileInput: HTMLInputElement | null = null;

      logger.debug("Searching for file input", { 
        hasPreferredContext: !!preferredContext
      });

      // First check preferred context (e.g., active element for paste)
      if (preferredContext) {
        // Check if it's a file input
        if (
          preferredContext.tagName === "INPUT" &&
          (preferredContext as HTMLInputElement).type === "file"
        ) {
          fileInput = preferredContext as HTMLInputElement;
          logger.debug("Found file input from preferred context");
        } else {
          // Search up from preferred context
          let searchElement: Element | null = preferredContext;
          while (searchElement && !fileInput) {
            fileInput = searchElement.querySelector(
              'input[type="file"]',
            ) as HTMLInputElement;
            if (fileInput) {
              logger.debug("Found file input near preferred context");
            }
            searchElement = searchElement.parentElement;
          }
        }
      }

      // If not found, look for any usable file input
      if (!fileInput) {
        const allInputs = document.querySelectorAll('input[type="file"]');
        logger.debug("Scanning all file inputs");
        
        for (const input of allInputs) {
          if (input instanceof HTMLInputElement && isFileInputUsable(input)) {
            fileInput = input;
            
            logger.debug("Found usable file input", {
              id: input.id,
              className: input.className,
              accept: input.accept
            });
            break;
          }
        }
      }

      // Try Xero-specific selectors if still no input found
      if (!fileInput) {
        const xeroSelectors = [
          // Common Xero file upload selectors
          '.file-upload input[type="file"]',
          '.attachment-upload input[type="file"]',
          '.document-upload input[type="file"]',
          '[data-automation-id*="file"] input[type="file"]',
          '[data-automation-id*="upload"] input[type="file"]',
          '[data-automation-id*="attachment"] input[type="file"]',
          // Bank reconciliation specific
          '.bank-reconciliation input[type="file"]',
          '.transaction-attachments input[type="file"]'
        ];

        for (const selector of xeroSelectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input && isFileInputUsable(input)) {
            fileInput = input;
            logger.debug("Found file input using Xero-specific selector", { selector });
            break;
          }
        }
      }

      // Last resort: create a temporary file input if none found
      if (!fileInput) {
        logger.warn("No existing file input found, attempting to create temporary one");
        fileInput = createTemporaryFileInput();
      }

      return fileInput;
    }

    // Create a temporary file input as a last resort
    function createTemporaryFileInput(): HTMLInputElement | null {
      try {
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.style.opacity = '0';
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        tempInput.style.pointerEvents = 'none';
        
        // Add to DOM temporarily
        document.body.appendChild(tempInput);
        
        // Set up cleanup after use
        tempInput.addEventListener('change', () => {
          setTimeout(() => {
            if (tempInput.parentNode) {
              tempInput.parentNode.removeChild(tempInput);
            }
          }, 1000);
        });
        
        logger.info("Created temporary file input as fallback");
        return tempInput;
      } catch (error) {
        logger.error("Failed to create temporary file input", { error });
        return null;
      }
    }

    // Show indicator when clipboard contains Figgy file
    async function checkClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        const data = JSON.parse(text);

        if (data.type === "figgy-file") {
          showPasteIndicator(data.fileName);
        }
      } catch (e) {
        // Not our data or no clipboard access
      }
    }

    function showPasteIndicator(fileName: string) {
      if (!pasteIndicator) {
        pasteIndicator = document.createElement("div");
        pasteIndicator.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #3b82f6;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          z-index: 999999;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          gap: 10px;
        `;
        pasteIndicator.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 3H6C4.89543 3 4 3.89543 4 5V17C4 18.1046 4.89543 19 6 19H14C15.1046 19 16 18.1046 16 17V5C16 3.89543 15.1046 3 14 3H12" stroke="currentColor" stroke-width="2"/>
            <rect x="7" y="1" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
          </svg>
          <div>
            <div style="font-weight: 600;">Ready to paste: ${fileName}</div>
            <div style="font-size: 12px; opacity: 0.9;">Press Ctrl+V near a file upload area</div>
          </div>
        `;
        document.body.appendChild(pasteIndicator);

        // Remove after 10 seconds
        setTimeout(() => {
          if (pasteIndicator) {
            pasteIndicator.remove();
            pasteIndicator = null;
          }
        }, 10000);
      }
    }

    // Check clipboard on focus
    window.addEventListener("focus", checkClipboard);

    // Global paste handler
    document.addEventListener("paste", async (e) => {
      if (isProcessingPaste) return;

      logger.debug("Paste event detected");

      try {
        // Get clipboard text
        const clipboardText =
          e.clipboardData?.getData("text/plain") ||
          (await navigator.clipboard.readText());

        // Try to parse as JSON
        let fileData;
        try {
          fileData = JSON.parse(clipboardText);
        } catch (err) {
          // Not JSON, ignore
          return;
        }

        // Check if it's our file data
        if (!fileData || fileData.type !== "figgy-file") return;

        logger.info("Figgy file paste detected", {
          fileId: fileData.fileId,
          fileName: fileData.fileName,
        });

        // Prevent default paste
        e.preventDefault();
        isProcessingPaste = true;

        // Remove indicator
        if (pasteIndicator) {
          pasteIndicator.remove();
          pasteIndicator = null;
        }

        // Find file input
        const fileInput = findFileInput(document.activeElement);

        if (!fileInput) {
          throw new Error(
            "No file upload area found for paste operation.\n" +
            "Please:\n" +
            "1. Click near or on a file upload button\n" +
            "2. Or open the file attachments section\n" +
            "3. Then try pasting again (Ctrl+V)"
          );
        }

        await processFile(fileData, fileInput, "paste");
      } catch (error) {
        logger.error("Paste failed", { error });
        alert(error instanceof Error ? error.message : "Failed to paste file");
      } finally {
        isProcessingPaste = false;
      }
    });

    // Drag and drop handlers
    let draggedOver: Element | null = null;

    // Enhanced dragover handler
    document.addEventListener("dragover", (e) => {
      // Check if this might be a Figgy file drag
      if (!e.dataTransfer || !e.dataTransfer.types.includes("text/plain")) {
        return;
      }

      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";

      // Track what element we're dragging over
      draggedOver = e.target as Element;

      // Highlight upload buttons instead of showing custom overlay
      highlightUploadButtons();
    });

    document.addEventListener("dragleave", (e) => {
      // Only remove highlighting if we're leaving the document
      if (e.clientX === 0 && e.clientY === 0) {
        removeUploadButtonHighlighting();
        draggedOver = null;
      }
    });

    // Global drop handler
    document.addEventListener("drop", async (e) => {
      // Remove button highlighting
      removeUploadButtonHighlighting();

      if (isProcessingDrop) return;

      // Check for drag data
      const dragData = e.dataTransfer?.getData("text/plain");
      if (!dragData) return;

      try {
        const data = JSON.parse(dragData);
        if (!data || data.type !== "figgy-file") return;

        e.preventDefault();
        e.stopPropagation();
        isProcessingDrop = true;

        logger.debug("Processing Figgy file drop", {
          fileId: data.fileId,
          fileName: data.fileName,
        });

        // Find nearest upload button and click it
        const uploadButton = findNearestUploadButton(draggedOver);
        if (uploadButton) {
          await processFileViaButton(data, uploadButton);
        } else {
          // Fallback to file input approach
          const fileInput = findFileInput();
          if (fileInput) {
            await processFile(data, fileInput, "drop");
          } else {
            throw new Error(
              "No upload button or file input found. Please look for 'Attach files' or 'Upload' buttons on this page."
            );
          }
        }
      } catch (error) {
        logger.error("Drop failed", { error });
        alert(error instanceof Error ? error.message : "Failed to upload file");
      } finally {
        isProcessingDrop = false;
        draggedOver = null;
      }
    });

    // Enhance file inputs with drop zones
    function enhanceFileInputs() {
      const fileInputs =
        document.querySelectorAll<HTMLInputElement>('input[type="file"]');

      fileInputs.forEach((input) => {
        if (input.dataset.figgyEnhanced) return;
        input.dataset.figgyEnhanced = "true";

        const parent = input.parentElement;
        if (!parent) return;

        // Add drop handlers to the parent element
        parent.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.stopPropagation();
          parent.style.outline = "2px dashed #3b82f6";
        });

        parent.addEventListener("dragleave", () => {
          parent.style.outline = "";
        });

        parent.addEventListener("drop", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          parent.style.outline = "";

          if (isProcessingDrop) return;

          const dragData = e.dataTransfer?.getData("text/plain");
          if (!dragData) return;

          try {
            const data = JSON.parse(dragData);
            if (data && data.type === "figgy-file") {
              isProcessingDrop = true;
              await processFile(data, input, "drop");
            }
          } catch (error) {
            logger.error("Failed to handle enhanced drop", { error });
          } finally {
            isProcessingDrop = false;
          }
        });
      });
    }

    // Initial enhancement
    enhanceFileInputs();

    // Watch for new file inputs
    const observer = new MutationObserver(() => {
      enhanceFileInputs();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial clipboard check
    checkClipboard();

    logger.info("Paste and drag-drop handlers registered");
  },
});
