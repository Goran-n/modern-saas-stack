import { computed } from 'vue'
import type { ChannelType, PublicUserChannel } from '@kibly/shared-types'
import { 
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon
} from '@heroicons/vue/24/outline'

/**
 * Composable for channel-related utilities and formatting
 * Centralizes channel display logic to ensure consistency
 */
export function useChannelHelpers() {
  /**
   * Channel configuration mapping
   * Defines icon, color, and label for each channel type
   */
  const channelConfig = {
    whatsapp: {
      icon: DevicePhoneMobileIcon,
      color: 'green-600',
      bgColor: 'bg-green-600',
      label: 'WhatsApp'
    },
    slack: {
      icon: ChatBubbleLeftRightIcon,
      color: 'purple-600',
      bgColor: 'bg-purple-600',
      label: 'Slack'
    },
    teams: {
      icon: ChatBubbleLeftRightIcon,
      color: 'blue-600',
      bgColor: 'bg-blue-600',
      label: 'Microsoft Teams'
    },
    email: {
      icon: EnvelopeIcon,
      color: 'gray-600',
      bgColor: 'bg-gray-600',
      label: 'Email'
    },
    sms: {
      icon: ChatBubbleLeftRightIcon,
      color: 'purple-600',
      bgColor: 'bg-purple-600',
      label: 'SMS'
    },
    telegram: {
      icon: ChatBubbleLeftRightIcon,
      color: 'cyan-600',
      bgColor: 'bg-cyan-600',
      label: 'Telegram'
    }
  } as const

  /**
   * Get configuration for a specific channel type
   */
  const getChannelConfig = (type: ChannelType) => {
    return channelConfig[type] || {
      icon: ChatBubbleLeftRightIcon,
      color: 'gray-600',
      bgColor: 'bg-gray-600',
      label: type
    }
  }

  /**
   * Get icon component for a channel type
   */
  const getChannelIcon = (type: ChannelType) => {
    return getChannelConfig(type).icon
  }

  /**
   * Get color class for a channel type
   */
  const getChannelColor = (type: ChannelType) => {
    return getChannelConfig(type).color
  }

  /**
   * Get background color class for a channel type
   */
  const getChannelBgColor = (type: ChannelType) => {
    return getChannelConfig(type).bgColor
  }

  /**
   * Get human-readable label for a channel type
   */
  const getChannelLabel = (type: ChannelType) => {
    return getChannelConfig(type).label
  }

  /**
   * Format channel identifier for display
   * Masks sensitive information like phone numbers
   */
  const formatChannelIdentifier = (channel: PublicUserChannel): string => {
    if (channel.channelType === 'whatsapp' && channel.channelIdentifier.startsWith('+')) {
      // Mask phone number for privacy
      const phone = channel.channelIdentifier
      if (phone.length > 6) {
        return `${phone.slice(0, 4)}...${phone.slice(-4)}`
      }
    }
    return channel.channelIdentifier
  }

  /**
   * Get display name for a channel
   * Uses channel name if available, otherwise falls back to identifier
   */
  const getChannelDisplayName = (channel: PublicUserChannel): string => {
    return channel.channelName || formatChannelIdentifier(channel)
  }

  /**
   * Get channel name from channels array by ID
   * Useful for looking up channel info in conversations
   */
  const getChannelNameById = (channelId: string, channels: PublicUserChannel[]): string => {
    const channel = channels.find(c => c.id === channelId)
    return channel ? getChannelDisplayName(channel) : 'Unknown'
  }

  return {
    channelConfig,
    getChannelConfig,
    getChannelIcon,
    getChannelColor,
    getChannelBgColor,
    getChannelLabel,
    formatChannelIdentifier,
    getChannelDisplayName,
    getChannelNameById
  }
}