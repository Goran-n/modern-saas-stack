<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <FigButton 
          variant="ghost" 
          color="neutral"
          size="sm"
          @click="router.push('/settings')"
          class="mb-4"
        >
          <span class="flex items-center gap-2">
            <Icon name="heroicons:arrow-left" class="h-4 w-4" />
            Back to Settings
          </span>
        </FigButton>
        <h1 class="text-3xl font-bold text-neutral-900">Integrations</h1>
        <p class="mt-2 text-neutral-600">
          Connect external services to automate your workflow
        </p>
      </div>

      <!-- No Tenant Selected Warning -->
      <div v-if="!hasTenantSelected" class="mb-6">
        <FigAlert type="warning">
          <template #title>No Organisation Selected</template>
          Please select an organisation from the dropdown above to manage integrations.
        </FigAlert>
      </div>

      <!-- Connected Integrations -->
      <div v-if="connectedIntegrations.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-neutral-900 mb-4">Connected Integrations</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FigCard
            v-for="connection in connectedIntegrations"
            :key="connection.id"
            class="relative"
          >
            <div class="p-6">
              <!-- Status Badge -->
              <div class="absolute top-4 right-4">
                <FigBadge
                  :color="getStatusColor(connection.status)"
                  variant="soft"
                  size="sm"
                >
                  {{ connection.status }}
                </FigBadge>
              </div>

              <!-- Provider Info -->
              <div class="flex items-start gap-4">
                <div 
                  class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  :class="getProviderColor(connection.provider).bg"
                >
                  <Icon 
                    :name="getProviderIcon(connection.provider)" 
                    class="w-7 h-7"
                    :class="getProviderColor(connection.provider).icon"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-neutral-900">
                    {{ getProviderName(connection.provider) }}
                  </h3>
                  <p class="text-sm text-neutral-500 truncate">
                    {{ connection.accountEmail || connection.displayName }}
                  </p>
                  <p v-if="connection.lastUsedAt" class="text-xs text-neutral-400 mt-1">
                    Last used {{ formatRelativeTime(connection.lastUsedAt) }}
                  </p>
                </div>
              </div>

              <!-- Error Message -->
              <FigAlert
                v-if="connection.status === 'error' && connection.lastError"
                color="error"
                variant="subtle"
                class="mt-4"
                size="sm"
              >
                {{ connection.lastError }}
              </FigAlert>

              <!-- Actions -->
              <div class="flex items-center gap-2 mt-4">
                <FigButton
                  v-if="connection.status === 'error' || connection.status === 'expired'"
                  @click="reconnectIntegration(connection)"
                  size="xs"
                  variant="solid"
                  color="primary"
                  class="flex-1"
                >
                  Reconnect
                </FigButton>
                <FigButton
                  v-else
                  @click="refreshConnection(connection)"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  class="flex-1"
                  :loading="refreshingConnections.has(connection.id)"
                >
                  <Icon name="heroicons:arrow-path" class="h-3 w-3 mr-1" />
                  Refresh
                </FigButton>
                <FigButton
                  @click="removeConnection(connection)"
                  size="xs"
                  variant="ghost"
                  color="error"
                >
                  <Icon name="heroicons:trash" class="h-3 w-3" />
                </FigButton>
              </div>
            </div>
          </FigCard>
        </div>
      </div>

      <!-- Available Integrations -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-neutral-900">Available Integrations</h2>
          <FigButton 
            v-if="hasAdminAccess && hasTenantSelected"
            @click="showAddOAuthModal = true"
            size="sm"
            variant="solid"
            color="primary"
            :disabled="!hasTenantSelected"
          >
            <Icon name="heroicons:plus" class="h-4 w-4 mr-1" />
            Add Integration
          </FigButton>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FigSkeleton v-for="i in 6" :key="i" height="h-40" />
        </div>

        <!-- Available Providers Grid -->
        <div v-else-if="availableProviders.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FigCard
            v-for="provider in availableProviders"
            :key="provider.name"
            class="cursor-pointer hover:shadow-md transition-shadow"
            :class="{ 'opacity-60': !provider.available }"
            @click="selectProvider(provider)"
          >
            <div class="p-6">
              <div class="flex items-start gap-4">
                <div 
                  class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  :class="getProviderColor(provider.name).bg"
                >
                  <Icon 
                    :name="provider.icon" 
                    class="w-7 h-7"
                    :class="getProviderColor(provider.name).icon"
                  />
                </div>
                <div class="flex-1">
                  <h3 class="font-medium text-neutral-900">
                    {{ provider.displayName }}
                  </h3>
                  <p class="text-sm text-neutral-500 mt-1">
                    {{ getProviderDescription(provider.name) }}
                  </p>
                  <p v-if="!provider.available" class="text-xs text-orange-600 mt-2">
                    Not configured - contact admin
                  </p>
                </div>
              </div>
            </div>
          </FigCard>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <Icon name="heroicons:puzzle-piece" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
          <h3 class="text-sm font-semibold text-neutral-900 mb-1">No integrations available</h3>
          <p class="text-sm text-neutral-500">
            Contact your administrator to enable integrations
          </p>
        </div>
      </div>

      <!-- Add OAuth Connection Modal -->
      <AddOAuthConnectionModal 
        v-model="showAddOAuthModal"
        @success="handleConnectionSuccess"
      />
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  FigContainer, 
  FigCard, 
  FigButton, 
  FigSkeleton,
  FigAlert,
  FigBadge
} from '@figgy/ui'
import AddOAuthConnectionModal from '~/components/organisms/AddOAuthConnectionModal.vue'

// Page metadata
definePageMeta({
  middleware: ['auth']
})

// Composables
const router = useRouter()
const toast = useToast()
const $trpc = useTrpc()
const tenantStore = useTenantStore()

// Types
interface OAuthConnection {
  id: string
  provider: string
  accountId: string
  accountEmail?: string
  displayName?: string
  status: string
  lastError?: string
  createdAt: string
  lastUsedAt?: string
}

interface AvailableProvider {
  name: string
  displayName: string
  icon: string
  available: boolean
}

// State
const loading = ref(true)
const availableProviders = ref<AvailableProvider[]>([])
const connections = ref<OAuthConnection[]>([])
const showAddOAuthModal = ref(false)
const refreshingConnections = ref(new Set<string>())

// Computed
const hasAdminAccess = computed(() => {
  const userTenants = tenantStore.userTenants
  const selectedTenantId = tenantStore.selectedTenantId
  const currentUserTenant = userTenants.find(ut => ut.tenantId === selectedTenantId)
  return currentUserTenant?.role === 'admin' || currentUserTenant?.role === 'owner'
})

const hasTenantSelected = computed(() => {
  return !!tenantStore.selectedTenantId
})

const connectedIntegrations = computed(() => {
  return connections.value.filter(conn => conn.status !== 'pending')
})

// Methods
async function fetchData() {
  if (!hasTenantSelected.value) {
    console.log('No tenant selected, skipping data fetch')
    return
  }

  try {
    loading.value = true
    
    // Fetch available providers and connections in parallel
    const [providers, existingConnections] = await Promise.all([
      $trpc.oauth.getAvailableProviders.query(),
      $trpc.oauth.getConnections.query()
    ])
    
    // Filter out already connected providers from available list
    const connectedProviderNames = new Set(existingConnections.map(c => c.provider))
    availableProviders.value = providers.filter(p => !connectedProviderNames.has(p.name))
    connections.value = existingConnections
  } catch (error) {
    console.error('Failed to fetch data:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load integrations',
      color: 'error' as const,
    })
  } finally {
    loading.value = false
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
  
  showAddOAuthModal.value = true
}

async function reconnectIntegration(connection: OAuthConnection) {
  try {
    const redirectUrl = `${window.location.origin}/settings/oauth-callback`
    
    const { authUrl } = await $trpc.oauth.initiateOAuth.mutate({
      provider: connection.provider,
      redirectUrl,
    })
    
    window.location.href = authUrl
  } catch (error: any) {
    console.error('Failed to reconnect:', error)
    toast.add({
      title: 'Reconnection Failed',
      description: error.message || 'Failed to reconnect integration',
      color: 'error' as const
    })
  }
}

async function refreshConnection(connection: OAuthConnection) {
  refreshingConnections.value.add(connection.id)
  
  try {
    await $trpc.oauth.refreshToken.mutate({
      connectionId: connection.id
    })
    
    toast.add({
      title: 'Token Refreshed',
      description: 'The integration has been refreshed successfully',
      color: 'success' as const,
    })
    
    await fetchData()
  } catch (error: any) {
    console.error('Failed to refresh token:', error)
    toast.add({
      title: 'Refresh Failed',
      description: error.message || 'Failed to refresh integration',
      color: 'error' as const
    })
  } finally {
    refreshingConnections.value.delete(connection.id)
  }
}

async function removeConnection(connection: OAuthConnection) {
  // TODO: Add confirmation dialog
  try {
    await $trpc.oauth.revokeConnection.mutate({
      connectionId: connection.id
    })
    
    toast.add({
      title: 'Integration Removed',
      description: `${getProviderName(connection.provider)} has been disconnected`,
      color: 'success' as const,
    })
    
    await fetchData()
  } catch (error) {
    toast.add({
      title: 'Remove Failed',
      description: 'Failed to remove integration',
      color: 'error' as const,
    })
  }
}

function handleConnectionSuccess() {
  showAddOAuthModal.value = false
  fetchData()
}

// Helper functions
function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    gmail: 'Gmail',
    google: 'Google',
    outlook: 'Outlook',
    microsoft: 'Microsoft',
    slack: 'Slack',
    github: 'GitHub',
  }
  return names[provider] || provider
}

function getProviderIcon(provider: string): string {
  const icons: Record<string, string> = {
    gmail: 'logos:google-gmail',
    google: 'logos:google-icon',
    outlook: 'logos:microsoft-outlook',
    microsoft: 'logos:microsoft-icon',
    slack: 'logos:slack-icon',
    github: 'logos:github-icon',
  }
  return icons[provider] || 'heroicons:puzzle-piece'
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

function getProviderDescription(provider: string): string {
  const descriptions: Record<string, string> = {
    gmail: 'Access emails and manage your Gmail inbox',
    google: 'Sign in with Google and access Google services',
    outlook: 'Access emails and manage your Outlook inbox',
    microsoft: 'Sign in with Microsoft and access Office 365',
    slack: 'Send notifications and access Slack workspaces',
    github: 'Access repositories and manage GitHub resources',
  }
  return descriptions[provider] || 'Connect to external services'
}

function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    error: 'error',
    expired: 'warning',
    inactive: 'neutral',
  }
  return colors[status] || 'neutral'
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 30) return `${diffDays} days ago`
  return past.toLocaleDateString()
}

// Lifecycle
onMounted(() => {
  if (hasTenantSelected.value) {
    fetchData()
  }
})

// Watch for tenant selection changes
watch(() => tenantStore.selectedTenantId, (newTenantId) => {
  if (newTenantId) {
    fetchData()
  } else {
    connections.value = []
    availableProviders.value = []
  }
})
</script>