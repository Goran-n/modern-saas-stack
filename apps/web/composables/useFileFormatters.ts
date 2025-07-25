export function useFileFormatters() {
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
  }

  const formatDate = (dateString: string | Date): string => {
    if (!dateString) return ''
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  const formatTime = (dateString: string | Date): string => {
    if (!dateString) return ''
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatCurrency = (amount: string | number, currency = 'GBP'): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    
    if (Number.isNaN(numAmount)) return '£0.00'
    
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numAmount)
  }

  const formatFieldName = (key: string): string => {
    if (!key) return ''
    
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return {
    formatFileSize,
    formatDate,
    formatTime,
    formatCurrency,
    formatFieldName
  }
}