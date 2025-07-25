import type { FileItem } from '@figgy/types'

/**
 * Centralised composable for all file operations
 * Wraps the file service with app-specific logic
 */
export const useFileOperations = () => {
  const tenantStore = useTenantStore()
  const config = useRuntimeConfig()
  const toast = useToast()
  const trpc = useTrpc()
  
  // Get the file service
  const fileService = useFileService()

  /**
   * Download a file
   */
  const downloadFile = async (file: FileItem) => {
    const success = await fileService.downloadFile(file, {
      apiUrl: config.public.apiUrl,
      tenantId: tenantStore.selectedTenantId.value || undefined
    })
    
    if (!success) {
      toast.add({
        title: 'Download failed',
        description: fileService.latestError.value?.message || 'Failed to download file',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    }
    
    return success
  }

  /**
   * Reprocess a file
   */
  const reprocessFile = async (fileId: string): Promise<boolean> => {
    const success = await fileService.reprocessFile(
      fileId,
      async (id) => {
        await trpc.files.reprocess.mutate({ fileId: id })
      }
    )
    
    if (success) {
      toast.add({
        title: 'Reprocessing started',
        description: 'The file will be processed again from scratch',
        color: 'primary',
        icon: 'i-heroicons-arrow-path',
      })
    } else {
      toast.add({
        title: 'Reprocess failed',
        description: fileService.latestError.value?.message || 'Failed to reprocess file',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    }
    
    return success
  }

  /**
   * Get proxy URL for file preview
   */
  const getProxyUrl = (fileId: string): string | null => {
    return fileService.getProxyUrl(fileId, {
      apiUrl: config.public.apiUrl,
      tenantId: tenantStore.selectedTenantId.value || undefined,
      toolbar: false
    })
  }

  /**
   * Get download URL for a file
   */
  const getDownloadUrl = (fileId: string): string | null => {
    return fileService.getDownloadUrl(fileId, {
      apiUrl: config.public.apiUrl,
      tenantId: tenantStore.selectedTenantId.value || undefined
    })
  }

  /**
   * Handle file drag start for drag & drop
   */
  const handleFileDragStart = (event: DragEvent, file: FileItem) => {
    fileService.handleFileDragStart(
      event, 
      file, 
      tenantStore.selectedTenantId.value || undefined
    )
  }

  /**
   * Batch download files
   */
  const batchDownload = async (files: FileItem[]) => {
    const results = await fileService.batchDownload(files, {
      apiUrl: config.public.apiUrl,
      tenantId: tenantStore.selectedTenantId.value || undefined
    })
    
    if (results.failed.length > 0) {
      toast.add({
        title: 'Some downloads failed',
        description: `${results.failed.length} of ${files.length} files failed to download`,
        color: 'warning',
        icon: 'i-heroicons-exclamation-triangle',
      })
    } else if (results.successful.length > 0) {
      toast.add({
        title: 'Downloads started',
        description: `Downloading ${results.successful.length} files`,
        color: 'success',
        icon: 'i-heroicons-arrow-down-tray',
      })
    }
    
    return results
  }

  return {
    // Core operations
    downloadFile,
    reprocessFile,
    getProxyUrl,
    getDownloadUrl,
    handleFileDragStart,
    batchDownload,
    
    // Operation states from service
    isReprocessing: (fileId: string) => fileService.isOperationInProgress(fileId, 'reprocess'),
    isDownloading: (fileId: string) => fileService.isOperationInProgress(fileId, 'download'),
    activeOperations: fileService.activeOperations,
    
    // Error handling
    errors: fileService.errors,
    clearErrors: fileService.clearErrors
  }
}