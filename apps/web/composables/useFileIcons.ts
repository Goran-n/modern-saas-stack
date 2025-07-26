
export interface FileIconConfig {
  icon: string
  color: string
}

export function useFileIcons() {
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || ''
  }

  const getFileIconConfig = (fileName: string): FileIconConfig => {
    const ext = getFileExtension(fileName)
    
    // Only support images and PDFs
    const iconMap: Record<string, FileIconConfig> = {
      // PDFs
      pdf: { icon: 'i-heroicons-document-text', color: 'text-red-500' },
      
      // Images
      jpg: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      jpeg: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      png: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      gif: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      webp: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      svg: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      
      // Default (unsupported file type)
      default: { icon: 'i-heroicons-document', color: 'text-gray-400' }
    }
    
    return iconMap[ext] || iconMap.default!
  }

  const getFileIcon = (fileName: string): string => {
    return getFileIconConfig(fileName).icon
  }

  const getFileIconColor = (fileName: string): string => {
    return getFileIconConfig(fileName).color
  }

  const isImage = (fileName: string): boolean => {
    const ext = getFileExtension(fileName)
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  }

  const isPDF = (fileName: string): boolean => {
    return getFileExtension(fileName) === 'pdf'
  }

  const isSupportedFileType = (fileName: string): boolean => {
    return isImage(fileName) || isPDF(fileName)
  }

  return {
    getFileExtension,
    getFileIconConfig,
    getFileIcon,
    getFileIconColor,
    isImage,
    isPDF,
    isSupportedFileType
  }
}