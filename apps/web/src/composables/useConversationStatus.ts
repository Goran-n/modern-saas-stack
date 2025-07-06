import { computed } from 'vue'
import type { ConversationStatus, ChannelStatus } from '@kibly/shared-types'

/**
 * Composable for handling conversation and channel status display
 * Provides consistent status styling and labels across the application
 */
export function useConversationStatus() {
  /**
   * Get CSS classes for conversation status badges
   * Follows the existing pattern from ConversationList.vue
   */
  const getConversationStatusClasses = (status: ConversationStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  /**
   * Get CSS classes for channel status badges
   * Consistent with the existing ConnectionStatus component patterns
   */
  const getChannelStatusClasses = (status: ChannelStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  /**
   * Get human-readable label for conversation status
   */
  const getConversationStatusLabel = (status: ConversationStatus): string => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'archived':
        return 'Archived'
      case 'closed':
        return 'Closed'
      default:
        return status
    }
  }

  /**
   * Get human-readable label for channel status
   */
  const getChannelStatusLabel = (status: ChannelStatus): string => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'pending':
        return 'Pending Setup'
      case 'inactive':
        return 'Inactive'
      case 'failed':
        return 'Setup Failed'
      default:
        return status
    }
  }

  /**
   * Map channel status to ConnectionStatus component status
   * This ensures consistency with existing integration status displays
   */
  const mapChannelToConnectionStatus = (status: ChannelStatus) => {
    switch (status) {
      case 'active':
        return 'healthy'
      case 'pending':
        return 'pending'
      case 'failed':
        return 'error'
      case 'inactive':
        return 'unknown'
      default:
        return 'unknown'
    }
  }

  return {
    getConversationStatusClasses,
    getChannelStatusClasses,
    getConversationStatusLabel,
    getChannelStatusLabel,
    mapChannelToConnectionStatus
  }
}