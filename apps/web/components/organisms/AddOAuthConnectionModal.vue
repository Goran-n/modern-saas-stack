<template>
  <FigModal 
    v-model="isOpen"
    title="Connect Integration"
    size="md"
  >
    <template #body>
      <div class="space-y-6">
        <p class="text-sm text-neutral-600">
          Choose an integration to connect to your account
        </p>
        
        <!-- Provider Grid -->
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="provider in availableProviders"
            :key="provider.name"
            @click="selectProvider(provider)"
            class="p-4 border rounded-lg transition-all text-center group relative"
            :class="[
              selectedProvider?.name === provider.name 
                ? 'border-primary-300 bg-primary-50' 
                : 'border-neutral-200',
              provider.available
                ? 'hover:border-primary-300 hover:bg-primary-50'
                : 'opacity-60 cursor-not-allowed'
            ]"
            :disabled="!provider.available || isLoading"
          >
            <!-- Already Connected Badge -->
            <FigBadge
              v-if="provider.connected"
              color="success"
              variant="soft"
              size="xs"
              class="absolute top-2 right-2"
            >
              Connected
            </FigBadge>
            
            <div class="flex flex-col items-center gap-3">
              <div 
                class="w-12 h-12 rounded-lg flex items-center justify-center"
                :class="getProviderColor(provider.name).bg"
              >
                <Icon 
                  :name="provider.icon" 
                  class="w-7 h-7"
                  :class="getProviderColor(provider.name).icon"
                />
              </div>
              <div>
                <h4 class="font-medium text-neutral-900">
                  {{ provider.displayName }}
                </h4>
                <p v-if="!provider.available" class="text-xs text-orange-600 mt-1">
                  Not configured
                </p>
                <p v-else-if="provider.accountEmail" class="text-xs text-neutral-500 mt-1">
                  {{ provider.accountEmail }}
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Connection Status Message -->
        <FigAlert
          v-if="selectedProvider?.connected && selectedProvider.connectionStatus === 'error'"
          color="error"
          variant="subtle"
          :title="`${selectedProvider.displayName} Connection Error`"
          :description="selectedProvider.lastError || 'The connection has encountered an error. Please reconnect.'"
        />
        
        <FigAlert
          v-else-if="selectedProvider?.connected && selectedProvider.connectionStatus === 'expired'"
          color="warning"
          variant="subtle"
          :title="`${selectedProvider.displayName} Token Expired`"
          description="The access token has expired. Please reconnect to continue using this integration."
        />
      </div>
    </template>
    
    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <FigButton
          @click="close"
          variant="ghost"
          color="neutral"
          :disabled="isLoading"
        >
          Cancel
        </FigButton>
        
        <FigButton
          @click="connectProvider"
          color="primary"
          :loading="isLoading"
          :disabled="!selectedProvider || !selectedProvider.available"
        >
          {{ selectedProvider?.connected ? 'Reconnect' : 'Connect' }}
          <Icon name="heroicons:arrow-top-right-on-square" class="h-4 w-4 ml-1" />
        </FigButton>
      </div>
    </template>
  </FigModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  FigModal, 
  FigButton,
  FigAlert,
  FigBadge
} from '@figgy/ui'

// Props & Emits
interface Props {
  modelValue: boolean
  filterProvider?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': [provider: string]
}>()

// Composables
const $trpc = useTrpc()
const toast = useToast()

// Types
interface AvailableProvider {
  name: string
  displayName: string
  icon: string
  available: boolean
  connected: boolean
  connectionStatus?: string
  accountEmail?: string
  lastError?: string
}

// State
const isLoading = ref(false)
const availableProviders = ref<AvailableProvider[]>([])
const selectedProvider = ref<AvailableProvider | null>(null)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Methods
async function fetchAvailableProviders() {
  try {
    const providers = await $trpc.oauth.getAvailableProviders.query()
    
    // Filter if needed
    if (props.filterProvider) {
      availableProviders.value = providers.filter(p => 
        p.name.includes(props.filterProvider!)
      )
    } else {
      availableProviders.value = providers
    }
    
    // Auto-select if only one provider
    if (availableProviders.value.length === 1 && availableProviders.value[0]) {
      selectedProvider.value = availableProviders.value[0]
    }
  } catch (error) {
    console.error('Failed to fetch available providers:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load available integrations',
      color: 'error' as const,
    })
  }
}

function selectProvider(provider: AvailableProvider) {
  if (!provider.available) {
    toast.add({
      title: 'Integration Not Available',
      description: `${provider.displayName} integration is not configured. Please contact your administrator.`,
      color: 'warning' as const,
    })
    return
  }
  selectedProvider.value = provider
}

async function connectProvider() {
  if (!selectedProvider.value) return
  
  try {
    isLoading.value = true
    
    // Get redirect URL based on current location
    const redirectUrl = `${window.location.origin}/settings/oauth-callback`
    
    // Initiate OAuth flow
    const { authUrl } = await $trpc.oauth.initiateOAuth.mutate({
      provider: selectedProvider.value.name,
      redirectUrl,
    })
    
    // Redirect to OAuth provider
    window.location.href = authUrl
  } catch (error: any) {
    console.error('Failed to initiate OAuth:', error)
    toast.add({
      title: 'Connection Failed',
      description: error.message || 'Failed to connect integration',
      color: 'error' as const
    })
  } finally {
    isLoading.value = false
  }
}

function getProviderColor(provider: string) {
  const colors: Record<string, { bg: string; icon: string }> = {
    gmail: { bg: 'bg-red-100', icon: 'text-red-600' },
    google: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    outlook: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    microsoft: { bg: 'bg-neutral-100', icon: 'text-neutral-600' },
    slack: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    github: { bg: 'bg-neutral-100', icon: 'text-neutral-900' },
  }
  
  return colors[provider] || { bg: 'bg-neutral-100', icon: 'text-neutral-600' }
}

function close() {
  isOpen.value = false
  // Reset state after close animation
  setTimeout(() => {
    selectedProvider.value = null
  }, 300)
}

// Lifecycle
onMounted(() => {
  fetchAvailableProviders()
})

// Watch for modal open/close
watch(isOpen, (newValue) => {
  if (newValue) {
    fetchAvailableProviders()
  }
})
</script>