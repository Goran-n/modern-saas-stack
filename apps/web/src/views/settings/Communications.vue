<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">
        Communication Channels
      </h1>
      <p class="mt-2 text-sm text-gray-600">
        Connect your communication channels to receive files and messages from your team
      </p>
    </div>
    
    <!-- Add channel button -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">
          Your Channels
        </h2>
        <BaseButton
          variant="primary"
          @click="showAddChannelMenu = true"
        >
          <PlusIcon class="h-4 w-4 mr-2" />
          Add Channel
        </BaseButton>
      </div>
    </div>
    
    <!-- Channels list -->
    <div
      v-if="isLoadingChannels"
      class="flex justify-center py-12"
    >
      <BaseSpinner />
    </div>
    
    <div
      v-else-if="channels.length === 0"
      class="text-center py-12"
    >
      <ChatBubbleLeftRightIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        No channels connected
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by connecting your first communication channel
      </p>
      <div class="mt-6">
        <BaseButton
          variant="primary"
          @click="showAddChannelMenu = true"
        >
          <PlusIcon class="h-4 w-4 mr-2" />
          Add Your First Channel
        </BaseButton>
      </div>
    </div>
    
    <div
      v-else
      class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      <ChannelCard
        v-for="channel in channels"
        :key="channel.id"
        :channel="channel"
        @view-conversations="viewConversations(channel)"
        @settings="openChannelSettings(channel)"
        @deactivate="deactivateChannel(channel)"
        @activate="activateChannel(channel)"
        @retry="retryChannelSetup(channel)"
      />
    </div>
    
    <!-- Add channel menu -->
    <BaseModal
      v-model:is-open="showAddChannelMenu"
      title="Add Communication Channel"
      size="md"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Choose a communication channel to connect
        </p>
        
        <div class="grid gap-3">
          <button
            v-for="channelType in availableChannelTypes"
            :key="channelType.type"
            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg text-left transition-colors"
            :class="channelType.available 
              ? 'hover:border-primary-500 hover:bg-primary-50' 
              : 'opacity-50 cursor-not-allowed'"
            :disabled="!channelType.available"
            @click="channelType.onClick"
          >
            <div class="flex items-center space-x-3">
              <div 
                class="h-10 w-10 rounded-full flex items-center justify-center"
                :class="getChannelBgColor(channelType.type)"
              >
                <component
                  :is="getChannelIcon(channelType.type)"
                  class="h-5 w-5 text-white"
                />
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-900">
                  {{ getChannelLabel(channelType.type) }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ channelType.available ? channelType.description : 'Coming soon' }}
                </p>
              </div>
            </div>
            <ChevronRightIcon class="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>
      
      <template #footer>
        <BaseButton
          variant="secondary"
          @click="showAddChannelMenu = false"
        >
          Cancel
        </BaseButton>
      </template>
    </BaseModal>
    
    <!-- WhatsApp setup modal -->
    <WhatsAppSetupModal
      v-model:is-open="showWhatsAppSetup"
      @success="onWhatsAppSetupSuccess"
    />
    
    <!-- Deactivate confirmation modal -->
    <ConfirmationModal
      v-model:is-open="showDeactivateConfirm"
      title="Deactivate Channel"
      :message="`Are you sure you want to deactivate ${channelToDeactivate?.channelName || 'this channel'}? You can reactivate it later.`"
      confirm-text="Deactivate"
      confirm-variant="error"
      @confirm="confirmDeactivateChannel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'
import { useCommunicationStore } from '../../stores/communication'
import { useToast } from '../../composables/useToast'
import { useChannelHelpers } from '../../composables/useChannelHelpers'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseSpinner from '../../components/ui/BaseSpinner.vue'
import BaseModal from '../../components/ui/BaseModal.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import ChannelCard from '../../components/communications/ChannelCard.vue'
import WhatsAppSetupModal from '../../components/communications/WhatsAppSetupModal.vue'
import type { PublicUserChannel, ChannelType } from '@kibly/shared-types'

const router = useRouter()
const communicationStore = useCommunicationStore()
const { showToast } = useToast()
const { getChannelIcon, getChannelBgColor, getChannelLabel } = useChannelHelpers()

const showAddChannelMenu = ref(false)
const showWhatsAppSetup = ref(false)
const showDeactivateConfirm = ref(false)
const channelToDeactivate = ref<PublicUserChannel | null>(null)

const { channels, isLoadingChannels } = communicationStore

onMounted(async () => {
  try {
    await communicationStore.fetchChannels()
  } catch (error) {
    showToast({
      title: 'Error',
      description: 'Failed to load communication channels',
      type: 'error'
    })
  }
})

const startWhatsAppSetup = () => {
  showAddChannelMenu.value = false
  showWhatsAppSetup.value = true
}

const onWhatsAppSetupSuccess = async (channelId: string) => {
  showToast({
    title: 'Success!',
    description: 'WhatsApp channel connected successfully',
    type: 'success'
  })
  
  // Refresh channels
  await communicationStore.fetchChannels()
}

const viewConversations = (channel: PublicUserChannel) => {
  router.push({
    name: 'conversations',
    query: { channelId: channel.id }
  })
}

const openChannelSettings = (channel: PublicUserChannel) => {
  showToast({
    title: 'Coming soon',
    description: 'Channel settings will be available soon',
    type: 'info'
  })
}

// Available channel types configuration
const availableChannelTypes = [
  {
    type: 'whatsapp' as ChannelType,
    available: true,
    description: 'Connect your WhatsApp number',
    onClick: startWhatsAppSetup
  },
  {
    type: 'slack' as ChannelType,
    available: false,
    description: 'Connect to Slack workspace',
    onClick: () => {}
  },
  {
    type: 'teams' as ChannelType,
    available: false,
    description: 'Connect to Microsoft Teams',
    onClick: () => {}
  },
  {
    type: 'email' as ChannelType,
    available: false,
    description: 'Connect email account',
    onClick: () => {}
  }
]

const deactivateChannel = (channel: PublicUserChannel) => {
  channelToDeactivate.value = channel
  showDeactivateConfirm.value = true
}

const confirmDeactivateChannel = async () => {
  if (!channelToDeactivate.value) return
  
  try {
    await communicationStore.deactivateChannel(channelToDeactivate.value.id)
    showToast({
      title: 'Channel deactivated',
      description: 'The channel has been deactivated',
      type: 'success'
    })
  } catch (error) {
    showToast({
      title: 'Error',
      description: 'Failed to deactivate channel',
      type: 'error'
    })
  } finally {
    showDeactivateConfirm.value = false
    channelToDeactivate.value = null
  }
}

const activateChannel = async (channel: PublicUserChannel) => {
  showToast({
    title: 'Coming soon',
    description: 'Channel reactivation will be available soon',
    type: 'info'
  })
}

const retryChannelSetup = (channel: PublicUserChannel) => {
  if (channel.channelType === 'whatsapp') {
    showWhatsAppSetup.value = true
  }
}
</script>