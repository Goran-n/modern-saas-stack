import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import type { MessageDirection, PublicConversationMessage } from '@kibly/shared-types'

/**
 * Composable for message formatting and display utilities
 */
export function useMessageHelpers() {
  /**
   * Format time for message display
   */
  const formatMessageTime = (date: Date | string): string => {
    return format(new Date(date), 'HH:mm')
  }

  /**
   * Format date for date separators in conversation
   */
  const formatDateSeparator = (date: Date | string): string => {
    const d = new Date(date)
    if (isToday(d)) {
      return 'Today'
    } else if (isYesterday(d)) {
      return 'Yesterday'
    } else {
      return format(d, 'MMMM d, yyyy')
    }
  }

  /**
   * Check if a date separator should be shown between messages
   */
  const shouldShowDateSeparator = (
    currentMessage: PublicConversationMessage,
    previousMessage: PublicConversationMessage | undefined
  ): boolean => {
    if (!previousMessage) return true
    
    const currentDate = new Date(currentMessage.createdAt).toDateString()
    const previousDate = new Date(previousMessage.createdAt).toDateString()
    
    return currentDate !== previousDate
  }

  /**
   * Get CSS classes for message bubble based on direction
   */
  const getMessageBubbleClasses = (direction: MessageDirection) => {
    return {
      container: direction === 'outbound' ? 'justify-end' : 'justify-start',
      bubble: direction === 'outbound' 
        ? 'bg-primary-500 text-white' 
        : 'bg-gray-100 text-gray-900',
      file: direction === 'outbound'
        ? 'bg-primary-600'
        : 'bg-gray-200'
    }
  }

  /**
   * Format delivery status icon
   */
  const getDeliveryStatusIcon = (status?: string): string => {
    switch (status) {
      case 'delivered':
        return '✓'
      case 'read':
        return '✓✓'
      default:
        return ''
    }
  }

  /**
   * Format date for conversation list
   */
  const formatConversationDate = (date: Date | string): string => {
    const d = new Date(date)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      return formatDistanceToNow(d, { addSuffix: true })
    } else if (diffInDays < 7) {
      return format(d, 'EEEE')
    } else {
      return format(d, 'MMM d, yyyy')
    }
  }

  return {
    formatMessageTime,
    formatDateSeparator,
    shouldShowDateSeparator,
    getMessageBubbleClasses,
    getDeliveryStatusIcon,
    formatConversationDate
  }
}