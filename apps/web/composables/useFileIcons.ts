
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
    
    const iconMap: Record<string, FileIconConfig> = {
      // Documents
      pdf: { icon: 'i-heroicons-document-text', color: 'text-red-500' },
      doc: { icon: 'i-heroicons-document', color: 'text-blue-500' },
      docx: { icon: 'i-heroicons-document', color: 'text-blue-500' },
      
      // Spreadsheets
      xls: { icon: 'i-heroicons-table-cells', color: 'text-emerald-500' },
      xlsx: { icon: 'i-heroicons-table-cells', color: 'text-emerald-500' },
      csv: { icon: 'i-heroicons-table-cells', color: 'text-emerald-500' },
      
      // Images
      jpg: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      jpeg: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      png: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      gif: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      webp: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      svg: { icon: 'i-heroicons-photo', color: 'text-green-500' },
      
      // Archives
      zip: { icon: 'i-heroicons-archive-box', color: 'text-purple-500' },
      rar: { icon: 'i-heroicons-archive-box', color: 'text-purple-500' },
      '7z': { icon: 'i-heroicons-archive-box', color: 'text-purple-500' },
      tar: { icon: 'i-heroicons-archive-box', color: 'text-purple-500' },
      
      // Default
      default: { icon: 'i-heroicons-document', color: 'text-gray-500' }
    }
    
    return iconMap[ext] || iconMap.default
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

  const isDocument = (fileName: string): boolean => {
    const ext = getFileExtension(fileName)
    return ['doc', 'docx', 'pdf', 'txt', 'rtf'].includes(ext)
  }

  const isSpreadsheet = (fileName: string): boolean => {
    const ext = getFileExtension(fileName)
    return ['xls', 'xlsx', 'csv'].includes(ext)
  }

  const isArchive = (fileName: string): boolean => {
    const ext = getFileExtension(fileName)
    return ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)
  }

  return {
    getFileExtension,
    getFileIconConfig,
    getFileIcon,
    getFileIconColor,
    isImage,
    isPDF,
    isDocument,
    isSpreadsheet,
    isArchive
  }
}