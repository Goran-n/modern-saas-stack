/**
 * Xero content script with paste and drag-drop support
 */
import { defineContentScript } from 'wxt/utils/define-content-script';
import { sendToBackground } from '../utils/messaging';
import { 
  MessageType, 
  FileFetchRequestPayload,
  FileFetchResponsePayload,
  FileDropPayload
} from '../types/messages';
import { createLogger } from '../utils/logger';

export default defineContentScript({
  matches: ['https://*.xero.com/*'],
  
  main() {
    const logger = createLogger('content:xero');
    logger.info('Xero content script loaded (paste + drag-drop support)');
    
    let isProcessingPaste = false;
    let isProcessingDrop = false;
    let pasteIndicator: HTMLDivElement | null = null;
    let dropIndicator: HTMLDivElement | null = null;
    
    // Common file processing function
    async function processFile(fileData: any, fileInput: HTMLInputElement, operation: 'paste' | 'drop') {
      try {
        logger.debug(`Processing file ${operation}`, {
          fileId: fileData.fileId,
          fileName: fileData.fileName
        });
        
        // Get stored data and tenant ID
        const { currentDragData, copiedFileData, currentTenantId } = await chrome.storage.local.get([
          'currentDragData', 
          'copiedFileData', 
          'currentTenantId'
        ]);
        
        // For drag operations, use currentDragData; for paste, use copiedFileData
        const storedData = operation === 'drop' ? currentDragData : copiedFileData;
        
        // Request file from background
        const request: FileFetchRequestPayload = {
          fileId: fileData.fileId,
          tenantId: fileData.tenantId || storedData?.tenantId || currentTenantId
        };
        
        const response = await sendToBackground(MessageType.FILE_FETCH_REQUEST, request);
        
        if (response.type === MessageType.FILE_ERROR) {
          throw new Error(response.payload.error);
        }
        
        if (response.type === MessageType.FILE_FETCH_RESPONSE) {
          const responseData = response.payload as FileFetchResponsePayload;
          
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
            lastModified: Date.now()
          });
          
          // Set file on input
          const dt = new DataTransfer();
          dt.items.add(file);
          
          try {
            fileInput.files = dt.files;
          } catch (err) {
            logger.warn('Could not directly set files property');
          }
          
          // Trigger events
          const events = ['change', 'input'];
          for (const eventName of events) {
            fileInput.dispatchEvent(new Event(eventName, { 
              bubbles: true, 
              cancelable: true 
            }));
          }
          
          // For Moxie/Plupload, dispatch drop event on container
          const moxieContainer = fileInput.closest('.moxie-shim');
          if (moxieContainer && operation === 'drop') {
            const dropEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dt
            });
            moxieContainer.dispatchEvent(dropEvent);
          }
          
          // Click the input to trigger any handlers
          fileInput.click();
          
          // Flash success
          fileInput.style.outline = '3px solid #10b981';
          setTimeout(() => {
            fileInput.style.outline = '';
          }, 1000);
          
          logger.info(`File ${operation} successful`, { fileName: file.name });
          
          // Notify background
          const result: FileDropPayload = {
            success: true,
            fileName: file.name
          };
          await sendToBackground(MessageType.FILE_DROP_COMPLETE, result);
        }
      } catch (error) {
        logger.error(`${operation} failed`, { error });
        
        const result: FileDropPayload = {
          success: false,
          fileName: fileData.fileName || 'unknown',
          error: error instanceof Error ? error.message : `${operation} failed`
        };
        await sendToBackground(MessageType.FILE_DROP_COMPLETE, result);
        
        throw error;
      }
    }
    
    // Find suitable file input
    function findFileInput(preferredContext?: Element | null): HTMLInputElement | null {
      let fileInput: HTMLInputElement | null = null;
      
      // First check preferred context (e.g., active element for paste)
      if (preferredContext) {
        // Check if it's a file input
        if (preferredContext.tagName === 'INPUT' && 
            (preferredContext as HTMLInputElement).type === 'file') {
          fileInput = preferredContext as HTMLInputElement;
        } else {
          // Search up from preferred context
          let searchElement: Element | null = preferredContext;
          while (searchElement && !fileInput) {
            fileInput = searchElement.querySelector('input[type="file"]') as HTMLInputElement;
            searchElement = searchElement.parentElement;
          }
        }
      }
      
      // If not found, look for any visible file input
      if (!fileInput) {
        const allInputs = document.querySelectorAll('input[type="file"]');
        for (const input of allInputs) {
          if (input instanceof HTMLInputElement && 
              (input.offsetParent || input.style.display !== 'none')) {
            fileInput = input;
            logger.debug('Using first visible file input');
            break;
          }
        }
      }
      
      return fileInput;
    }
    
    // Show indicator when clipboard contains Kibly file
    async function checkClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        const data = JSON.parse(text);
        
        if (data.type === 'kibly-file') {
          showPasteIndicator(data.fileName);
        }
      } catch (e) {
        // Not our data or no clipboard access
      }
    }
    
    function showPasteIndicator(fileName: string) {
      if (!pasteIndicator) {
        pasteIndicator = document.createElement('div');
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
    window.addEventListener('focus', checkClipboard);
    
    // Global paste handler
    document.addEventListener('paste', async (e) => {
      if (isProcessingPaste) return;
      
      logger.debug('Paste event detected');
      
      try {
        // Get clipboard text
        const clipboardText = e.clipboardData?.getData('text/plain') || 
                             await navigator.clipboard.readText();
        
        // Try to parse as JSON
        let fileData;
        try {
          fileData = JSON.parse(clipboardText);
        } catch (err) {
          // Not JSON, ignore
          return;
        }
        
        // Check if it's our file data
        if (fileData.type !== 'kibili-file') return;
        
        logger.info('Kibly file paste detected', {
          fileId: fileData.fileId,
          fileName: fileData.fileName
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
          throw new Error('No file upload area found. Click near an upload button and try again.');
        }
        
        await processFile(fileData, fileInput, 'paste');
        
      } catch (error) {
        logger.error('Paste failed', { error });
        alert(error instanceof Error ? error.message : 'Failed to paste file');
      } finally {
        isProcessingPaste = false;
      }
    });
    
    // Drag and drop handlers
    let draggedOver: Element | null = null;
    
    // Enhanced dragover handler
    document.addEventListener('dragover', (e) => {
      // Check if this might be a Kibly file drag
      if (!e.dataTransfer || !e.dataTransfer.types.includes('text/plain')) {
        return;
      }
      
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      
      // Track what element we're dragging over
      draggedOver = e.target as Element;
      
      // Show drop indicator on bank reconciliation pages
      if (window.location.href.includes('BankRec') && !dropIndicator) {
        dropIndicator = document.createElement('div');
        dropIndicator.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(59, 130, 246, 0.05);
          border: 4px dashed #3b82f6;
          pointer-events: none;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        dropIndicator.innerHTML = `
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 10px 0; color: #3b82f6;">Drop file here to attach</h2>
            <p style="margin: 0; color: #666;">The file will be attached to the current transaction</p>
          </div>
        `;
        document.body.appendChild(dropIndicator);
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      // Only remove indicator if we're leaving the document
      if (e.clientX === 0 && e.clientY === 0) {
        if (dropIndicator) {
          dropIndicator.remove();
          dropIndicator = null;
        }
        draggedOver = null;
      }
    });
    
    // Global drop handler
    document.addEventListener('drop', async (e) => {
      // Remove drop indicator
      if (dropIndicator) {
        dropIndicator.remove();
        dropIndicator = null;
      }
      
      if (isProcessingDrop) return;
      
      // Check for drag data
      const dragData = e.dataTransfer?.getData('text/plain');
      if (!dragData) return;
      
      try {
        const data = JSON.parse(dragData);
        if (data.type !== 'kibly-file') return;
        
        e.preventDefault();
        e.stopPropagation();
        isProcessingDrop = true;
        
        logger.debug('Processing Kibly file drop', { 
          fileId: data.fileId,
          dropTarget: draggedOver?.tagName
        });
        
        // Find file input - prefer one near the drop target
        const fileInput = findFileInput(draggedOver) || findFileInput();
        
        if (!fileInput) {
          // Special handling for bank reconciliation
          if (window.location.href.includes('BankRec')) {
            throw new Error('No file upload area found. Please open the file attachments section first.');
          } else {
            throw new Error('No file upload area found on this page.');
          }
        }
        
        await processFile(data, fileInput, 'drop');
        
      } catch (error) {
        logger.error('Drop failed', { error });
        alert(error instanceof Error ? error.message : 'Failed to upload file');
      } finally {
        isProcessingDrop = false;
        draggedOver = null;
      }
    });
    
    // Enhance file inputs with drop zones
    function enhanceFileInputs() {
      const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
      
      fileInputs.forEach(input => {
        if (input.dataset.kiblyEnhanced) return;
        input.dataset.kiblyEnhanced = 'true';
        
        const parent = input.parentElement;
        if (!parent) return;
        
        // Add drop handlers to the parent element
        parent.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          parent.style.outline = '2px dashed #3b82f6';
        });
        
        parent.addEventListener('dragleave', () => {
          parent.style.outline = '';
        });
        
        parent.addEventListener('drop', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          parent.style.outline = '';
          
          if (isProcessingDrop) return;
          
          const dragData = e.dataTransfer?.getData('text/plain');
          if (!dragData) return;
          
          try {
            const data = JSON.parse(dragData);
            if (data.type === 'kibly-file') {
              isProcessingDrop = true;
              await processFile(data, input, 'drop');
            }
          } catch (error) {
            logger.error('Failed to handle enhanced drop', { error });
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
      subtree: true
    });
    
    // Initial clipboard check
    checkClipboard();
    
    logger.info('Paste and drag-drop handlers registered');
  }
});