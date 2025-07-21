/**
 * Background script for file transfer between Kibly and Xero
 * Handles fetching files from Kibly API when a drag operation starts
 */
import { 
  Message, 
  MessageType, 
  FileFetchRequestPayload,
  FileFetchResponsePayload,
  FileErrorPayload,
  createMessage 
} from '../types/messages';
import { getConfig } from '../utils/config';
import { createLogger } from '../utils/logger';

export default {
  main() {
    const logger = createLogger('background');
    const config = getConfig();
    
    // Handle incoming messages
    chrome.runtime.onMessage.addListener((message: Message, _sender) => {
      logger.debug('Message received', { type: message.type });
      
      switch (message.type) {
        case MessageType.FILE_FETCH_REQUEST:
          return handleFileFetch(message.payload as FileFetchRequestPayload);
          
        default:
          logger.warn('Unknown message type', { type: message.type });
          return Promise.resolve(null);
      }
    });
    
    /**
     * Fetch file from Kibly API
     */
    async function handleFileFetch(
      payload: FileFetchRequestPayload
    ): Promise<Message<FileFetchResponsePayload | FileErrorPayload>> {
      try {
        // Get the stored drag data
        const { currentDragData } = await chrome.storage.local.get(['currentDragData', 'session']);
        
        if (!currentDragData || currentDragData.fileId !== payload.fileId) {
          return createMessage(MessageType.FILE_ERROR, {
            error: 'File data not found. Please drag the file again.',
            fileId: payload.fileId,
            operation: 'fetch'
          });
        }
        
        // Fetch from API
        logger.debug('Attempting API fetch', { fileId: payload.fileId });
        
        try {
          // Get stored auth data
          const { authToken, tenantId: storedTenantId } = await chrome.storage.local.get(['authToken', 'tenantId']);
          const tenantId = payload.tenantId || currentDragData.tenantId || storedTenantId;
          
          if (!tenantId) {
            throw new Error('No tenant ID available. Please ensure you are logged in to Kibly.');
          }
          
          // Construct API URL for file download
          const apiConfig = config.getApiConfig();
          const fileUrl = `${apiConfig.API_URL}/api/files/${payload.fileId}/download`;
          
          logger.debug('Fetching file from API', { fileUrl, tenantId });
          
          // Fetch file from API with tenant header
          const headers: HeadersInit = {
            'X-Tenant-Id': tenantId,
          };
          
          // Add auth token if available
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          const fileResponse = await fetch(fileUrl, { headers });
          
          if (!fileResponse.ok) {
            if (fileResponse.status === 401) {
              throw new Error('Authentication required. Please log in to Kibly first.');
            }
            throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
          }
          
          const blob = await fileResponse.blob();
          
          // Get file metadata from headers
          const contentDisposition = fileResponse.headers.get('content-disposition');
          let fileName = currentDragData.fileName;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
            if (filenameMatch) {
              fileName = filenameMatch[1];
            }
          }
          
          // Convert to base64 for transfer
          const reader = new FileReader();
          const content = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          return createMessage(MessageType.FILE_FETCH_RESPONSE, {
            fileId: payload.fileId,
            fileName: fileName,
            mimeType: currentDragData.mimeType || blob.type || 'application/octet-stream',
            content: content.split(',')[1], // Remove data URL prefix
            size: blob.size
          });
          
        } catch (apiError) {
          logger.error('API fetch failed', { error: apiError, fileId: payload.fileId });
          
          // If API fails, return original error message
          return createMessage(MessageType.FILE_ERROR, {
            error: apiError instanceof Error ? apiError.message : 'Failed to fetch file from API',
            fileId: payload.fileId,
            operation: 'fetch'
          });
        }
        
      } catch (error) {
        logger.error('File fetch failed', { error, fileId: payload.fileId });
        
        return createMessage(MessageType.FILE_ERROR, {
          error: error instanceof Error ? error.message : 'Failed to fetch file',
          fileId: payload.fileId,
          operation: 'fetch'
        });
      }
    }
    
    logger.info('Background script initialized');
  }
}